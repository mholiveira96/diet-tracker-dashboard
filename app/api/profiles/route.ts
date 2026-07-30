import { listProfiles } from '../../../lib/repositories/profiles.js';
import { getGroupAdherenceHistory, getGroupOverview, getSevenDayDeficitLeaderboard } from '../../../lib/repositories/dashboard.js';
import { errorToResponse } from '../../../lib/http.js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || 'now';
    const [profiles, overview, leaderboard, adherence] = await Promise.all([listProfiles(), getGroupOverview(date), getSevenDayDeficitLeaderboard(date), getGroupAdherenceHistory(date)]);
    return Response.json({ profiles, overview, leaderboard, adherence });
  } catch (error: any) { return errorToResponse(error); }
}
