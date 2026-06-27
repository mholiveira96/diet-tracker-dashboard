import { ensureRollingThread, saveAttachment } from '../../../../lib/chat/store.js';
import { errorToResponse } from '../../../../lib/http.js';
import { ValidationError } from '../../../../lib/validation.js';

export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw new ValidationError('Imagem obrigatória para upload.', 400, { field: 'file' });
    }

    if (!file.type.startsWith('image/')) {
      throw new ValidationError('Só aceito imagens nesse upload.', 400, { field: 'file' });
    }

    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      throw new ValidationError('A imagem precisa ter até 10 MB.', 400, { field: 'file', maxBytes: MAX_UPLOAD_BYTES });
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
    return errorToResponse(error);
  }
}
