import { execute } from '../../../../../lib/db.js';
import { restoreMealById } from '../../../../../lib/repositories/meals.js';
import { restoreWorkoutById } from '../../../../../lib/repositories/workouts.js';
import { errorToResponse } from '../../../../../lib/http.js';
import { requireIntegerId } from '../../../../../lib/validation.js';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auditId = requireIntegerId(params.id, 'audit id'); const body = await request.json(); const profileId = requireIntegerId(body.profileId, 'profileId');
    const result = await execute('SELECT id, entity_type, entity_id, action FROM audit_events WHERE id = ? AND profile_id = ? LIMIT 1', [auditId, profileId]);
    const event = result.rows[0]; if (!event || event.action !== 'delete') return Response.json({ error: 'Only deleted records can be restored' }, { status: 400 });
    const restored = event.entity_type === 'meal' ? await restoreMealById(Number(event.entity_id), profileId, auditId) : event.entity_type === 'workout' ? await restoreWorkoutById(Number(event.entity_id), profileId, auditId) : 0;
    if (!restored) return Response.json({ error: 'Record cannot be restored' }, { status: 404 });
    return Response.json({ success: true, restored: event.entity_type, id: event.entity_id });
  } catch (error: any) { return errorToResponse(error); }
}
