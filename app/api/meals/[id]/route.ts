import { deleteMealById, updateMealById } from '../../../../lib/repositories/meals.js';
import { errorToResponse } from '../../../../lib/http.js';
import {
  normalizeLoggedAt,
  requireIntegerId,
  requireNumber,
  requireString,
} from '../../../../lib/validation.js';

export const dynamic = 'force-dynamic';

interface RouteParams {
  id: string;
}

export async function PUT(
  request: Request,
  { params }: { params: RouteParams }
) {
  try {
    const numericId = requireIntegerId(params.id, 'meal id');
    const body = await request.json();

    const rowsAffected = await updateMealById(numericId, {
      description: requireString(body.description, 'description', { maxLength: 160 }),
      amount: requireNumber(body.amount, 'amount', { min: 0 }),
      unit: requireString(body.unit, 'unit', { maxLength: 40 }),
      calories: requireNumber(body.calories, 'calories', { min: 0 }),
      protein: requireNumber(body.protein, 'protein', { min: 0 }),
      carbs: requireNumber(body.carbs, 'carbs', { min: 0 }),
      fat: requireNumber(body.fat, 'fat', { min: 0 }),
      logged_at: normalizeLoggedAt(body.logged_at),
    });

    if (rowsAffected === 0) {
      return Response.json({ error: 'Meal not found' }, { status: 404 });
    }

    return Response.json({ success: true, id: numericId });
  } catch (error: any) {
    return errorToResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: RouteParams }
) {
  try {
    const numericId = requireIntegerId(params.id, 'meal id');
    const rowsAffected = await deleteMealById(numericId);

    if (rowsAffected === 0) {
      return Response.json({ error: 'Meal not found' }, { status: 404 });
    }

    return Response.json({ success: true, id: numericId });
  } catch (error: any) {
    return errorToResponse(error);
  }
}
