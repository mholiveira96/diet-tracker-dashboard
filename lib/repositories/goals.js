const { execute } = require('../db.js');

async function getLatestGoals() {
  const result = await execute(`SELECT calories, protein, carbs, fat FROM goals ORDER BY id DESC LIMIT 1`);
  return result.rows[0] || null;
}

async function insertGoals({ calories, protein, carbs, fat }) {
  await execute(
    `INSERT INTO goals (calories, protein, carbs, fat) VALUES (?, ?, ?, ?)`,
    [calories, protein, carbs, fat]
  );

  return { calories, protein, carbs, fat };
}

module.exports = {
  getLatestGoals,
  insertGoals,
};
