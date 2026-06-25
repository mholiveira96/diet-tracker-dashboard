import { ensureRollingThread, getThreadMessages } from '../../../../../../lib/chat/store.js';
import { confirmDraftMessage } from '../../../../../../lib/chat/ingest.js';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    await confirmDraftMessage(id);
    const thread = await ensureRollingThread();
    const messages = await getThreadMessages(thread.id);
    return Response.json({ success: true, thread, messages });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
