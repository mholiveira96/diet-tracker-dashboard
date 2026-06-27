import { getDashboardData } from '../../../lib/repositories/dashboard.js';
import { errorToResponse } from '../../../lib/http.js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetDate = searchParams.get('date') || 'now';
    const payload = await getDashboardData(targetDate);
    return Response.json(payload);
  } catch (error: any) {
    return errorToResponse(error);
  }
}
