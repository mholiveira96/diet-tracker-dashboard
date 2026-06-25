import { ensureRollingThread, saveAttachment } from '../../../../lib/chat/store.js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return Response.json({ error: 'Missing file upload' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const thread = await ensureRollingThread();
    const attachment = await saveAttachment({
      threadId: thread.id,
      filename: file.name,
      mimeType: file.type || 'image/jpeg',
      buffer,
    });

    return Response.json({ thread, attachment });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
