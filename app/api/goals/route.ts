import { getLatestGoals, insertGoals } from '../../../lib/repositories/goals.js';
import { errorToResponse } from '../../../lib/http.js';
import { requireNumber } from '../../../lib/validation.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const goals = await getLatestGoals();
    return Response.json(goals || { calories: 2500, protein: 200, carbs: 270, fat: 70 });
  } catch (error: any) {
    return errorToResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const goals = await insertGoals({
      calories: requireNumber(body.calories, 'calories', { min: 0, max: 20000, integer: true }),
      protein: requireNumber(body.protein, 'protein', { min: 0, max: 1000 }),
      carbs: requireNumber(body.carbs, 'carbs', { min: 0, max: 1000 }),
      fat: requireNumber(body.fat, 'fat', { min: 0, max: 1000 }),
    });

    return Response.json({ success: true, goals });
  } catch (error: any) {
    return errorToResponse(error);
  }
}
