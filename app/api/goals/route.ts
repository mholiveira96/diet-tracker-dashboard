import { getLatestGoals, insertGoals } from '../../../lib/repositories/goals.js';
import { errorToResponse } from '../../../lib/http.js';
import { requireIntegerId, requireNumber } from '../../../lib/validation.js';

export const dynamic = 'force-dynamic';
function profileIdFrom(request: Request, body?: any) {
  const query = new URL(request.url).searchParams.get('profileId');
  return requireIntegerId(body?.profileId ?? query, 'profileId');
}
export async function GET(request: Request) {
  try {
    const goals = await getLatestGoals(profileIdFrom(request));
    return Response.json(goals || { calories: 2500, protein: 200, carbs: 270, fat: 70 });
  } catch (error: any) { return errorToResponse(error); }
}
export async function PUT(request: Request) {
  try {
    const body = await request.json(); const profileId = profileIdFrom(request, body);
    const goals = await insertGoals(profileId, {
      calories: requireNumber(body.calories, 'calories', { min: 0, max: 20000, integer: true }),
      protein: requireNumber(body.protein, 'protein', { min: 0, max: 1000 }),
      carbs: requireNumber(body.carbs, 'carbs', { min: 0, max: 1000 }),
      fat: requireNumber(body.fat, 'fat', { min: 0, max: 1000 }),
    });
    return Response.json({ success: true, goals });
  } catch (error: any) { return errorToResponse(error); }
}
