import { createClient } from "@libsql/client/web";

export const dynamic = "force-dynamic";

interface RouteParams {
  id: string;
}

export async function PUT(
  request: Request,
  { params }: { params: RouteParams }
) {
  const { id } = params;
  const numericId = parseInt(id);
  const body = await request.json();
  const { modality, duration_min, calories, logged_at } = body;

  const url = process.env.TURSO_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    return Response.json({ error: "Missing credentials" }, { status: 500 });
  }

  try {
    const client = createClient({
      url: url.trim().replace('libsql://', 'https://'),
      authToken: authToken.trim()
    });

    // Build dynamic UPDATE — only update logged_at if provided
    const fields = ['modality = ?', 'duration_min = ?', 'calories = ?'];
    const values: any[] = [modality, duration_min, calories];
    if (logged_at) {
      fields.push('logged_at = ?');
      values.push(logged_at);
    }
    values.push(numericId);

    const result = await client.execute({
      sql: `UPDATE workouts SET ${fields.join(', ')} WHERE id = ?`,
      args: values
    });

    if (result.rowsAffected === 0) {
      return Response.json({ error: "Workout not found" }, { status: 404 });
    }

    return Response.json({ success: true, id: numericId });
  } catch (error: any) {
    console.error('[API ERROR] UPDATE workout:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: RouteParams }
) {
  const { id } = params;
  const numericId = parseInt(id);

  const url = process.env.TURSO_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    return Response.json({ error: "Missing credentials" }, { status: 500 });
  }

  try {
    const client = createClient({
      url: url.trim().replace('libsql://', 'https://'),
      authToken: authToken.trim()
    });

    const result = await client.execute({
      sql: "DELETE FROM workouts WHERE id = ?",
      args: [numericId]
    });

    if (result.rowsAffected === 0) {
      return Response.json({ error: "Workout not found" }, { status: 404 });
    }

    return Response.json({ success: true, id: numericId });
  } catch (error: any) {
    console.error('[API ERROR] DELETE workout:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
