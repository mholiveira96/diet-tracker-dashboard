const { shiftDate } = require('../date.js');

function zeroDay(day) {
  return {
    day,
    kcal: 0,
    protein: 0,
    workouts_kcal: 0,
    net_kcal: 0,
  };
}

function normalizeNumber(value) {
  return Number(value || 0);
}

function buildDenseHistory(rows = [], { endDate, days = 30 } = {}) {
  if (!endDate) {
    throw new Error('endDate is required');
  }

  const byDay = new Map(
    rows.map((row) => [String(row.day), {
      day: String(row.day),
      kcal: normalizeNumber(row.kcal),
      protein: normalizeNumber(row.protein),
      workouts_kcal: normalizeNumber(row.workouts_kcal),
      net_kcal: normalizeNumber(row.net_kcal),
    }])
  );

  return Array.from({ length: days }, (_, index) => {
    const day = shiftDate(endDate, -index);
    return byDay.get(day) || zeroDay(day);
  });
}

module.exports = {
  buildDenseHistory,
};
