import { createClient } from "@libsql/client/web";

export const dynamic = "force-dynamic";

let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (_client) return _client;
  const url = process.env.TURSO_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error("Missing credentials");
  _client = createClient({
    url: url.trim().replace('libsql://', 'https://'),
    authToken: authToken.trim()
  });
  return _client;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetDate = searchParams.get('date') || "now";

  try {
    const client = getClient();

    const dateFilter = targetDate === "now"
      ? `date('now', '-3 hours')`
      : `?`;
    const dateArg = targetDate === "now" ? [] : [targetDate];

    const [summaryRes, goalsRes, itemsRes, historyRes, activityRes, workoutSummaryRes, workoutItemsRes] = await Promise.all([
      // Summary (meals for the day)
      client.execute({
        sql: `SELECT COALESCE(SUM(calories), 0) as kcal, COALESCE(SUM(protein), 0) as protein, COALESCE(SUM(carbs), 0) as carbs, COALESCE(SUM(fat), 0) as fat FROM meals WHERE date(logged_at, '-3 hours') = ${dateFilter}`,
        args: dateArg
      }),
      // Goals
      client.execute("SELECT calories, protein, carbs, fat FROM goals ORDER BY id DESC LIMIT 1"),
      // Items for the day
      client.execute({
        sql: `SELECT id, description, amount, unit, calories, protein, carbs, fat, logged_at FROM meals WHERE date(logged_at, '-3 hours') = ${dateFilter} ORDER BY logged_at DESC`,
        args: dateArg
      }),
      // History (last 30 days: meals + workouts per day = net calories)
      client.execute({
        sql: `
          SELECT
            day,
            SUM(kcal) as kcal,
            SUM(protein) as protein,
            SUM(workouts_kcal) as workouts_kcal,
            SUM(kcal) - SUM(workouts_kcal) as net_kcal
          FROM (
            SELECT date(logged_at, '-3 hours') as day, SUM(calories) as kcal, SUM(protein) as protein, 0 as workouts_kcal
            FROM meals GROUP BY date(logged_at, '-3 hours')
            UNION ALL
            SELECT date(logged_at, '-3 hours') as day, 0 as kcal, 0 as protein, SUM(calories) as workouts_kcal
            FROM workouts GROUP BY date(logged_at, '-3 hours')
          )
          GROUP BY day
          ORDER BY day DESC
          LIMIT 30
        `,
        args: []
      }),
      // Activity (wearable)
      client.execute({
        sql: `SELECT type, value, unit, logged_at FROM activity WHERE date(logged_at, '-3 hours') = ${dateFilter} ORDER BY logged_at DESC`,
        args: dateArg
      }),
      // Workout summary for the day
      client.execute({
        sql: `SELECT COALESCE(SUM(calories), 0) as workout_kcal, COALESCE(SUM(duration_min), 0) as duration_min, COUNT(*) as workout_count FROM workouts WHERE date(logged_at, '-3 hours') = ${dateFilter}`,
        args: dateArg
      }),
      // Workout items for the day
      client.execute({
        sql: `SELECT id, modality, duration_min, calories, logged_at FROM workouts WHERE date(logged_at, '-3 hours') = ${dateFilter} ORDER BY logged_at DESC`,
        args: dateArg
      }),
    ]);

    const mealItems = (itemsRes.rows || []).map((row: any) => ({ ...row, type: 'meal' }));
    const workoutRows = workoutItemsRes.rows || [];
    const workoutItems = workoutRows.map((row: any) => ({
      id: `w-${row.id}`,
      description: row.modality,
      amount: row.duration_min,
      unit: 'min',
      calories: row.calories,
      protein: 0,
      carbs: 0,
      fat: 0,
      logged_at: row.logged_at,
      type: 'workout'
    }));
    const combinedItems = [...mealItems, ...workoutItems].sort((a, b) => {
      const aTime = new Date(`${String(a.logged_at).replace(' ', 'T')}Z`).getTime();
      const bTime = new Date(`${String(b.logged_at).replace(' ', 'T')}Z`).getTime();
      return aTime - bTime;
    });

    const workoutSummary = workoutSummaryRes.rows[0] || { workout_kcal: 0, duration_min: 0, workout_count: 0 };

    const responseData = {
      summary: summaryRes.rows[0],
      goals: goalsRes.rows[0] || { calories: 2200, protein: 180, carbs: 180, fat: 84 },
      items: combinedItems,
      history: historyRes.rows,
      activity: activityRes.rows,
      workouts: {
        total: workoutSummary.workout_kcal || 0,
        duration: workoutSummary.duration_min || 0,
        count: workoutSummary.workout_count || 0
      }
    };

    return Response.json(responseData);
  } catch (error: any) {
    console.error('[API ERROR]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
