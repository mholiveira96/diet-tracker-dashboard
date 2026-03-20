import { createClient } from "@libsql/client/web";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetDate = searchParams.get('date') || "now";

  const url = process.env.TURSO_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error('[API ERROR] Missing TURSO_URL or TURSO_AUTH_TOKEN');
    return Response.json({ error: "Missing credentials" }, { status: 500 });
  }

  try {
    const client = createClient({ 
      url: url.trim().replace('libsql://', 'https://'), 
      authToken: authToken.trim() 
    });
    
    const dateFilter = targetDate === "now" ? "date('now', '-3 hours')" : `'${targetDate}'`;

    console.log('[API] Fetching data for date:', targetDate);

    // Summary (meals only for the day)
    const summaryRes = await client.execute({
      sql: `SELECT COALESCE(SUM(calories), 0) as kcal, COALESCE(SUM(protein), 0) as protein, COALESCE(SUM(carbs), 0) as carbs, COALESCE(SUM(fat), 0) as fat FROM meals WHERE date(logged_at, '-3 hours') = ?`,
      args: [targetDate === "now" ? undefined : targetDate]
    });
    
    // Goals
    const goalsRes = await client.execute("SELECT calories, protein, carbs, fat FROM goals ORDER BY id DESC LIMIT 1");
    
    // Items for the day
    const itemsRes = await client.execute({
      sql: `SELECT description, amount, unit, calories, protein, carbs, fat, logged_at FROM meals WHERE date(logged_at, '-3 hours') = ? ORDER BY logged_at DESC`,
      args: [targetDate === "now" ? undefined : targetDate]
    });
    
    // History (last 30 days of meals)
    const historyRes = await client.execute("SELECT date(logged_at, '-3 hours') as day, SUM(calories) as kcal, SUM(protein) as protein FROM meals GROUP BY day ORDER BY day DESC LIMIT 30");
    
    // Activity (wearable)
    const activityRes = await client.execute({
      sql: `SELECT type, value, unit, logged_at FROM activity WHERE date(logged_at, '-3 hours') = ? ORDER BY logged_at DESC`,
      args: [targetDate === "now" ? undefined : targetDate]
    });
    
    // Workout summary for the day
    const workoutSummaryRes = await client.execute({
      sql: `SELECT COALESCE(SUM(calories), 0) as workout_kcal, COALESCE(SUM(duration_min), 0) as duration_min, COUNT(*) as workout_count FROM workouts WHERE date(logged_at, '-3 hours') = ?`,
      args: [targetDate === "now" ? undefined : targetDate]
    });
    
    // Workout items for the day
    const workoutItemsRes = await client.execute({
      sql: `SELECT id, modality, duration_min, calories, logged_at FROM workouts WHERE date(logged_at, '-3 hours') = ? ORDER BY logged_at DESC`,
      args: [targetDate === "now" ? undefined : targetDate]
    });

    // Monthly KPIs: proper calculation using meals - workouts per day
    const monthlyKpiRes = await client.execute(`
      WITH days AS (
        SELECT 
          date(meals.date_col, '-3 hours') as day,
          COALESCE(SUM(meals.calories), 0) as meals_kcal,
          COALESCE(wrk.workout_kcal, 0) as workouts_kcal,
          COALESCE(SUM(meals.calories), 0) - COALESCE(wrk.workout_kcal, 0) as net_kcal
        FROM (
          SELECT date(logged_at, '-3 hours') as date_col, calories FROM meals
          WHERE strftime('%Y-%m', logged_at, '-3 hours') = strftime('%Y-%m', 'now', '-3 hours')
        ) meals
        LEFT JOIN (
          SELECT date(logged_at, '-3 hours') as date_col, SUM(calories) as workout_kcal
          FROM workouts
          WHERE strftime('%Y-%m', logged_at, '-3 hours') = strftime('%Y-%m', 'now', '-3 hours')
          GROUP BY date(logged_at, '-3 hours')
        ) wrk ON meals.date_col = wrk.date_col
        GROUP BY meals.date_col
      )
      SELECT 
        COUNT(*) as days_with_data,
        SUM(meals_kcal) as total_meals_kcal,
        SUM(workouts_kcal) as total_workouts_kcal,
        SUM(net_kcal) as total_net_kcal,
        SUM(net_kcal) / COUNT(*) as avg_net_kcal,
        SUM(CASE WHEN net_kcal <= (SELECT COALESCE(calories, 2200) FROM goals ORDER BY id DESC LIMIT 1) THEN 1 ELSE 0 END) as days_within_goal,
        SUM((SELECT COALESCE(calories, 2200) FROM goals ORDER BY id DESC LIMIT 1) - net_kcal) as monthly_savings
      FROM days
    `);

    console.log('[API] All queries executed successfully');

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
      const aTime = new Date(a.logged_at).getTime();
      const bTime = new Date(b.logged_at).getTime();
      return bTime - aTime;
    });

    const workoutSummary = workoutSummaryRes.rows[0] || { workout_kcal: 0, duration_min: 0, workout_count: 0 };
    const monthlyKpi = monthlyKpiRes.rows[0] || { days_with_data: 0, total_meals_kcal: 0, total_workouts_kcal: 0, total_net_kcal: 0, avg_net_kcal: 0, days_within_goal: 0, monthly_savings: 0 };

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
      },
      monthly_kpis: monthlyKpi
    };

    return Response.json(responseData);
  } catch (error: any) {
    console.error('[API ERROR]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
