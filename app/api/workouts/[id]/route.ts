import { createClient } from "@libsql/client/web";

export const dynamic = "force-dynamic";

let _client: ReturnType<typeof createClient> | null = null;

function normalizeLoggedAt(value?: string | null) {
  if (!value) return null;
  return value.replace('T', ' ').replace(/Z$/, '').slice(0, 19);
}

function getClient() {
  if (_client) return _client;
  const url = process.env.TURSO_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error("Missing credentials");
  _client = createClient({
    url: url.trim().replace('libsql://', 'https://'),
    authToken: authToken.trim()
  });
  return _client;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const workoutId = params.id;

  try {
    const client = getClient();

    // Get workout details
    const workoutRes = await client.execute({
      sql: `SELECT id, modality, duration_min, calories, logged_at FROM workouts WHERE id = ?`,
      args: [workoutId]
    });

    if (workoutRes.rows.length === 0) {
      return Response.json({ error: "Workout not found" }, { status: 404 });
    }

    const workout = workoutRes.rows[0];

    // Get exercises for this workout if detailed table exists
    let exercises: any[] = [];
    try {
      const exercisesRes = await client.execute({
        sql: `SELECT id, exercise_name, sets, reps, weight_kg, notes, order_index FROM workout_exercises WHERE workout_id = ? ORDER BY order_index ASC`,
        args: [workoutId]
      });

      exercises = exercisesRes.rows.map((row: any) => ({
        id: row.id,
        name: row.exercise_name,
        sets: row.sets,
        reps: row.reps,
        weight_kg: row.weight_kg,
        notes: row.notes,
        order_index: row.order_index
      }));
    } catch (_error) {
      exercises = [];
    }

    return Response.json({
      workout: {
        id: workout.id,
        modality: workout.modality,
        duration_min: workout.duration_min,
        calories: workout.calories,
        workout_type: null,
        intensity: null,
        notes: null,
        logged_at: workout.logged_at
      },
      exercises: exercises
    });
  } catch (error: any) {
    console.error('[API ERROR]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = getClient();
    const body = await request.json();
    const normalizedLoggedAt = normalizeLoggedAt(body.logged_at);

    const fields = ['modality = ?', 'duration_min = ?', 'calories = ?'];
    const args: any[] = [body.modality, Number(body.duration_min || 0), Number(body.calories || 0)];

    if (body.workout_type !== undefined) {
      fields.push('workout_type = ?');
      args.push(body.workout_type);
    }
    if (body.intensity !== undefined) {
      fields.push('intensity = ?');
      args.push(body.intensity);
    }
    if (body.notes !== undefined) {
      fields.push('notes = ?');
      args.push(body.notes);
    }
    if (normalizedLoggedAt) {
      fields.push('logged_at = ?');
      args.push(normalizedLoggedAt);
    }

    args.push(Number(params.id));

    const result = await client.execute({
      sql: `UPDATE workouts SET ${fields.join(', ')} WHERE id = ?`,
      args,
    });

    if (result.rowsAffected === 0) {
      return Response.json({ error: 'Workout not found' }, { status: 404 });
    }

    return Response.json({ success: true, id: Number(params.id) });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = getClient();
    const result = await client.execute({
      sql: 'DELETE FROM workouts WHERE id = ?',
      args: [Number(params.id)],
    });

    if (result.rowsAffected === 0) {
      return Response.json({ error: 'Workout not found' }, { status: 404 });
    }

    return Response.json({ success: true, id: Number(params.id) });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
