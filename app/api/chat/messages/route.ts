import { ensureRollingThread, getThreadMessages } from '../../../../lib/chat/store.js';
import { ingestUserMessage } from '../../../../lib/chat/ingest.js';
import { errorToResponse } from '../../../../lib/http.js';
import { assertAtLeastOne, parseAttachmentIds } from '../../../../lib/validation.js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = String(body.text || '').trim();
    const attachmentIds = parseAttachmentIds(body.attachmentIds);
    assertAtLeastOne([text, attachmentIds], 'Envia um texto ou pelo menos uma imagem.');

    const thread = await ensureRollingThread();
    const result = await ingestUserMessage({ threadId: thread.id, text, attachmentIds });
    const messages = await getThreadMessages(thread.id);

    return Response.json({ thread, result, messages });
  } catch (error: any) {
    return errorToResponse(error);
  }
}
