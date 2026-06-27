const { execute } = require('../db.js');

async function updateMealById(id, payload) {
  const fields = ['description = ?', 'amount = ?', 'unit = ?', 'calories = ?', 'protein = ?', 'carbs = ?', 'fat = ?'];
  const values = [
    payload.description,
    payload.amount,
    payload.unit,
    payload.calories,
    payload.protein,
    payload.carbs,
    payload.fat,
  ];

  if (payload.logged_at) {
    fields.push('logged_at = ?');
    values.push(payload.logged_at);
  }

  values.push(id);
  const result = await execute(`UPDATE meals SET ${fields.join(', ')} WHERE id = ?`, values);
  return result.rowsAffected || 0;
}

async function deleteMealById(id) {
  const result = await execute(`DELETE FROM meals WHERE id = ?`, [id]);
  return result.rowsAffected || 0;
}

module.exports = {
  updateMealById,
  deleteMealById,
};
