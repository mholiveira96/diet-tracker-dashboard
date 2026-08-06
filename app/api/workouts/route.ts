import { insertWorkout } from '../../../lib/repositories/workouts.js';
import { errorToResponse } from '../../../lib/http.js';
import { normalizeLoggedAt, requireIntegerId, requireNumber, requireString } from '../../../lib/validation.js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const profileId = requireIntegerId(body.profileId, 'profileId');
    const workout = await insertWorkout(profileId, {
      modality: requireString(body.modality, 'modality', { maxLength: 100 }),
      duration_min: requireNumber(body.duration_min, 'duration_min', { min: 0, max: 1440 }),
      calories: requireNumber(body.calories, 'calories', { min: 0, max: 50000 }),
      logged_at: normalizeLoggedAt(body.logged_at),
    });
    return Response.json({ success: true, workout });
  } catch (error: any) { return errorToResponse(error); }
}
