import { ensureRollingThread, getThreadMessages } from '../../../../lib/chat/store.js';
import { ingestUserMessage } from '../../../../lib/chat/ingest.js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = String(body.text || '');
    const attachmentIds = Array.isArray(body.attachmentIds) ? body.attachmentIds.map((value: any) => Number(value)).filter(Boolean) : [];

    const thread = await ensureRollingThread();
    const result = await ingestUserMessage({ threadId: thread.id, text, attachmentIds });
    const messages = await getThreadMessages(thread.id);

    return Response.json({ thread, result, messages });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
