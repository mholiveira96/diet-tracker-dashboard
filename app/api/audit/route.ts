import { listAuditEvents } from '../../../lib/repositories/audit.js';
import { errorToResponse } from '../../../lib/http.js';
import { requireIntegerId } from '../../../lib/validation.js';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try { const { searchParams } = new URL(request.url); const profileId = requireIntegerId(searchParams.get('profileId'), 'profileId'); return Response.json({ events: await listAuditEvents(profileId, Number(searchParams.get('limit') || 40)) }); }
  catch (error: any) { return errorToResponse(error); }
}
