import { ensureRollingThread, getThreadMessages } from '../../../../lib/chat/store.js';
import { requireIntegerId } from '../../../../lib/validation.js';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try { const profileId = requireIntegerId(new URL(request.url).searchParams.get('profileId'), 'profileId'); const thread = await ensureRollingThread(profileId); return Response.json({ thread, messages: await getThreadMessages(thread.id) }); }
  catch (error: any) { return Response.json({ error: error.message }, { status: 500 }); }
}
