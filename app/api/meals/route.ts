import { insertMeal } from '../../../lib/repositories/meals.js';
import { errorToResponse } from '../../../lib/http.js';
import { normalizeLoggedAt, requireIntegerId, requireNumber, requireString } from '../../../lib/validation.js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const profileId = requireIntegerId(body.profileId, 'profileId');
    const meal = await insertMeal(profileId, {
      description: requireString(body.description, 'description', { maxLength: 160 }),
      amount: requireNumber(body.amount, 'amount', { min: 0 }),
      unit: requireString(body.unit, 'unit', { maxLength: 40 }),
      calories: requireNumber(body.calories, 'calories', { min: 0 }),
      protein: requireNumber(body.protein, 'protein', { min: 0 }),
      carbs: requireNumber(body.carbs, 'carbs', { min: 0 }),
      fat: requireNumber(body.fat, 'fat', { min: 0 }),
      logged_at: normalizeLoggedAt(body.logged_at),
    });
    return Response.json({ success: true, meal });
  } catch (error: any) { return errorToResponse(error); }
}
