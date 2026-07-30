import { listProfiles } from '../../../lib/repositories/profiles.js';
import { getGroupOverview } from '../../../lib/repositories/dashboard.js';
import { errorToResponse } from '../../../lib/http.js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || 'now';
    const [profiles, overview] = await Promise.all([listProfiles(), getGroupOverview(date)]);
    return Response.json({ profiles, overview });
  } catch (error: any) { return errorToResponse(error); }
}
