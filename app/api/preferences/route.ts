import { getSetting, setSetting } from '../../../lib/chat/store.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const parserMode = (await getSetting('parser_mode')) || 'balanced';
    const imageRetentionDays = Number((await getSetting('image_retention_days')) || '180');
    return Response.json({ parserMode, imageRetentionDays });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (body.parserMode) {
      await setSetting('parser_mode', body.parserMode);
    }
    if (body.imageRetentionDays) {
      await setSetting('image_retention_days', body.imageRetentionDays);
    }
    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
