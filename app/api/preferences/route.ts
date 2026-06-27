import { getPreferences, mergePreferencesUpdate, savePreferences } from '../../../lib/repositories/preferences.js';
import { errorToResponse } from '../../../lib/http.js';
import { requireEnum, requireNumber } from '../../../lib/validation.js';

export const dynamic = 'force-dynamic';

const PARSER_MODES = ['conservative', 'balanced', 'aggressive'] as const;

export async function GET() {
  try {
    return Response.json(await getPreferences());
  } catch (error: any) {
    return errorToResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const current = await getPreferences();
    const nextPreferences = mergePreferencesUpdate(current, {
      parserMode:
        body.parserMode === undefined ? undefined : requireEnum(body.parserMode, 'parserMode', [...PARSER_MODES]),
      imageRetentionDays:
        body.imageRetentionDays === undefined
          ? undefined
          : requireNumber(body.imageRetentionDays, 'imageRetentionDays', { min: 1, max: 3650, integer: true }),
    });
    const preferences = await savePreferences(nextPreferences);

    return Response.json({ success: true, preferences });
  } catch (error: any) {
    return errorToResponse(error);
  }
}
