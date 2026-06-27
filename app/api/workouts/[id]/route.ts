import {
  deleteWorkoutById,
  getWorkoutById,
  getWorkoutExercisesByWorkoutId,
  updateWorkoutById,
} from '../../../../lib/repositories/workouts.js';
import { errorToResponse } from '../../../../lib/http.js';
import {
  normalizeLoggedAt,
  optionalString,
  requireEnum,
  requireIntegerId,
  requireNumber,
  requireString,
} from '../../../../lib/validation.js';

export const dynamic = 'force-dynamic';

const WORKOUT_TYPES = ['strength', 'cardio', 'mobility', 'sports', 'other'] as const;
const INTENSITY_LEVELS = ['low', 'moderate', 'high'] as const;

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const workoutId = requireIntegerId(params.id, 'workout id');
    const [workout, exercises] = await Promise.all([
      getWorkoutById(workoutId),
      getWorkoutExercisesByWorkoutId(workoutId),
    ]);

    if (!workout) {
      return Response.json({ error: 'Workout not found' }, { status: 404 });
    }

    return Response.json({
      workout,
      exercises: exercises.map((row: any) => ({
        id: row.id,
        name: row.exercise_name,
        sets: row.sets,
        reps: row.reps,
        weight_kg: row.weight_kg,
        notes: row.notes,
        order_index: row.order_index,
      })),
    });
  } catch (error: any) {
    return errorToResponse(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const workoutId = requireIntegerId(params.id, 'workout id');
    const body = await request.json();

    const rowsAffected = await updateWorkoutById(workoutId, {
      modality: requireString(body.modality, 'modality', { maxLength: 100 }),
      duration_min: requireNumber(body.duration_min, 'duration_min', { min: 0, max: 1440 }),
      calories: requireNumber(body.calories, 'calories', { min: 0, max: 50000 }),
      workout_type: body.workout_type === null ? null : requireEnum(body.workout_type || 'other', 'workout_type', [...WORKOUT_TYPES]),
      intensity: body.intensity === null ? null : requireEnum(body.intensity || 'moderate', 'intensity', [...INTENSITY_LEVELS]),
      notes: optionalString(body.notes, 'notes', { maxLength: 500 }),
      logged_at: normalizeLoggedAt(body.logged_at),
    });

    if (rowsAffected === 0) {
      return Response.json({ error: 'Workout not found' }, { status: 404 });
    }

    return Response.json({ success: true, id: workoutId });
  } catch (error: any) {
    return errorToResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const workoutId = requireIntegerId(params.id, 'workout id');
    const rowsAffected = await deleteWorkoutById(workoutId);

    if (rowsAffected === 0) {
      return Response.json({ error: 'Workout not found' }, { status: 404 });
    }

    return Response.json({ success: true, id: workoutId });
  } catch (error: any) {
    return errorToResponse(error);
  }
}
