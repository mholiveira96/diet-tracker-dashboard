import { ensureRollingThread, getThreadMessages } from '../../../../lib/chat/store.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const thread = await ensureRollingThread();
    const messages = await getThreadMessages(thread.id);
    return Response.json({ thread, messages });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
