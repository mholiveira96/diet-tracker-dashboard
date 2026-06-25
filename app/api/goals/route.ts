import { execute } from '../../../lib/db.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await execute(`SELECT calories, protein, carbs, fat FROM goals ORDER BY id DESC LIMIT 1`);
    return Response.json(result.rows[0] || { calories: 2500, protein: 200, carbs: 270, fat: 70 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const calories = Number(body.calories || 0);
    const protein = Number(body.protein || 0);
    const carbs = Number(body.carbs || 0);
    const fat = Number(body.fat || 0);

    await execute(
      `INSERT INTO goals (calories, protein, carbs, fat) VALUES (?, ?, ?, ?)`,
      [calories, protein, carbs, fat]
    );

    return Response.json({ success: true, goals: { calories, protein, carbs, fat } });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
