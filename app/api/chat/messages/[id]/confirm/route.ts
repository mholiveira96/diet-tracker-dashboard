import { ensureRollingThread, getThreadMessages } from '../../../../../../lib/chat/store.js';
import { confirmDraftMessage } from '../../../../../../lib/chat/ingest.js';
import { errorToResponse } from '../../../../../../lib/http.js';
import { requireIntegerId } from '../../../../../../lib/validation.js';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try { const id = requireIntegerId(params.id, 'message id'); const body = await request.json(); const profileId = requireIntegerId(body.profileId, 'profileId'); await confirmDraftMessage(id, profileId); const thread = await ensureRollingThread(profileId); return Response.json({ success: true, thread, messages: await getThreadMessages(thread.id) }); }
  catch (error: any) { return errorToResponse(error); }
}
