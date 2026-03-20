import { createClient } from "@libsql/client/web";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: { id: string } } }) {
  const id = parseInt(params.id);
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

    // UPDATE com todos os campos
    const result = await client.execute(
      `UPDATE meals 
       SET description = ?, amount = ?, unit = ?, calories = ?, protein = ?, carbs = ?, fat = ? 
       WHERE id = ?`,
      [description, amount, unit, calories, protein, carbs, fat, id]
    );

    if (result.rowsAffected === 0) {
      return Response.json({ error: "Meal not found" }, { status: 404 });
    }

    return Response.json({ success: true, id });
  } catch (error: any) {
    console.error('[API ERROR] UPDATE meal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } } }) {
  const id = parseInt(params.id);

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

    // DELETE
    const result = await client.execute(
      `DELETE FROM meals WHERE id = ?`,
      [id]
    );

    if (result.rowsAffected === 0) {
      return Response.json({ error: "Meal not found" }, { status: 404 });
    }

    return Response.json({ success: true, id });
  } catch (error: any) {
    console.error('[API ERROR] DELETE meal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
