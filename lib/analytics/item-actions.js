const { formatLoggedAtForInput } = require('./presentation.js');

function getItemResource(item) {
  const itemType = item?.type === 'workout' ? 'workout' : 'meal';
  const rawId = item?.id;
  const recordId = itemType === 'workout'
    ? Number(String(rawId).replace(/^w-/, ''))
    : Number(rawId);

  return {
    itemType,
    recordId,
    endpoint: itemType === 'workout' ? `/api/workouts/${recordId}` : `/api/meals/${recordId}`,
  };
}

function buildEditPayload(item) {
  const { itemType } = getItemResource(item);

  if (itemType === 'workout') {
    return {
      modality: item.description,
      duration_min: Number(item.amount || 0),
      calories: Number(item.calories || 0),
      workout_type: item.workout_type || 'other',
      intensity: item.intensity || 'moderate',
      notes: item.notes || '',
      logged_at: formatLoggedAtForInput(item.logged_at),
    };
  }

  return {
    description: item.description,
    amount: Number(item.amount || 0),
    unit: item.unit || 'g',
    calories: Number(item.calories || 0),
    protein: Number(item.protein || 0),
    carbs: Number(item.carbs || 0),
    fat: Number(item.fat || 0),
    logged_at: formatLoggedAtForInput(item.logged_at),
  };
}

function buildDeleteCopy(item) {
  return item?.type === 'workout'
    ? `Apagar treino “${item.description}”?`
    : `Apagar refeição “${item.description}”?`;
}

module.exports = {
  getItemResource,
  buildEditPayload,
  buildDeleteCopy,
};
