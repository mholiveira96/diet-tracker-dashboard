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

  const { description, amount, unit, calories, protein, carbs, fat } = body;

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
      sql: `UPDATE meals
       SET description = ?, amount = ?, unit = ?, calories = ?, protein = ?, carbs = ?, fat = ?
       WHERE id = ?`,
      args: [description, amount, unit, calories, protein, carbs, fat, numericId]
    });

    if (result.rowsAffected === 0) {
      return Response.json({ error: "Meal not found" }, { status: 404 });
    }

    return Response.json({ success: true, id: numericId });
  } catch (error: any) {
    console.error('[API ERROR] UPDATE meal:', error);
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
      sql: `DELETE FROM meals WHERE id = ?`,
      args: [numericId]
    });

    if (result.rowsAffected === 0) {
      return Response.json({ error: "Meal not found" }, { status: 404 });
    }

    return Response.json({ success: true, id: numericId });
  } catch (error: any) {
    console.error('[API ERROR] DELETE meal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
