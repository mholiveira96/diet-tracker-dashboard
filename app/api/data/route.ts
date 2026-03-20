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
    console.log('[API] Database URL:', url.substring(0, 50) + '...');

    // Using '-3 hours' for Natal/RN timezone grouping
    console.log('[API] Executing summary query...');
    const summaryRes = await client.execute(`SELECT COALESCE(SUM(calories), 0) as kcal, COALESCE(SUM(protein), 0) as protein, COALESCE(SUM(carbs), 0) as carbs, COALESCE(SUM(fat), 0) as fat FROM meals WHERE date(logged_at, '-3 hours') = ${dateFilter}`);
    
    console.log('[API] Executing goals query...');
    const goalsRes = await client.execute("SELECT calories, protein, carbs, fat FROM goals ORDER BY id DESC LIMIT 1");
    
    console.log('[API] Executing items query...');
    const itemsRes = await client.execute(`SELECT description, amount, unit, calories, protein, carbs, fat, logged_at FROM meals WHERE date(logged_at, '-3 hours') = ${dateFilter}`);
    
    console.log('[API] Executing history query...');
    const historyRes = await client.execute("SELECT date(logged_at, '-3 hours') as day, SUM(calories) as kcal, SUM(protein) as protein FROM meals GROUP BY day ORDER BY day DESC LIMIT 30");
    
    console.log('[API] Executing activity query...');
    const activityRes = await client.execute(`SELECT type, value, unit, logged_at FROM activity WHERE date(logged_at, '-3 hours') = ${dateFilter} ORDER BY logged_at DESC`);
    
    console.log('[API] Executing workout summary query...');
    const workoutSummaryRes = await client.execute(`SELECT COALESCE(SUM(calories), 0) as workout_kcal, COALESCE(SUM(duration_min), 0) as duration_min, COUNT(*) as workout_count FROM workouts WHERE date(logged_at, '-3 hours') = ${dateFilter}`);
    
    console.log('[API] Executing workout items query...');
    const workoutItemsRes = await client.execute(`SELECT id, modality, duration_min, calories, logged_at FROM workouts WHERE date(logged_at, '-3 hours') = ${dateFilter}`);

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

    console.log('[API] Response data prepared:', {
      summary: responseData.summary,
      goals: responseData.goals,
      itemsCount: responseData.items.length,
      historyCount: responseData.history.length,
      activityCount: responseData.activity.length,
      workouts: responseData.workouts
    });

    return Response.json(responseData);
  } catch (error: any) {
    console.error('[API ERROR]', error);
    console.error('[API ERROR Stack]', error.stack);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
