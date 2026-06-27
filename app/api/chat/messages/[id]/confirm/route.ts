import { ensureRollingThread, getThreadMessages } from '../../../../../../lib/chat/store.js';
import { confirmDraftMessage } from '../../../../../../lib/chat/ingest.js';
import { errorToResponse } from '../../../../../../lib/http.js';
import { requireIntegerId } from '../../../../../../lib/validation.js';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = requireIntegerId(params.id, 'message id');
    await confirmDraftMessage(id);
    const thread = await ensureRollingThread();
    const messages = await getThreadMessages(thread.id);
    return Response.json({ success: true, thread, messages });
  } catch (error: any) {
    return errorToResponse(error);
  }
}
