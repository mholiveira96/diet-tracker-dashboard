import { ensureRollingThread, getThreadMessages } from '../../../../../../lib/chat/store.js';
import { confirmDraftMessage } from '../../../../../../lib/chat/ingest.js';
import { errorToResponse } from '../../../../../../lib/http.js';
import { requireIntegerId } from '../../../../../../lib/validation.js';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = requireIntegerId(params.id, 'message id');
    const body = await request.json();
    const confirmerProfileId = requireIntegerId(body.profileId, 'profileId');
    const result = await confirmDraftMessage(id, confirmerProfileId);
    const thread = await ensureRollingThread(result.ownerProfileId);
    return Response.json({ success: true, result, thread, messages: await getThreadMessages(thread.id) });
  } catch (error: any) { return errorToResponse(error); }
}
