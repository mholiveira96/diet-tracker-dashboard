function parseIsoDate(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function mondayIndex(date) {
  return (date.getUTCDay() + 6) % 7;
}

function monthLabel(date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
    .format(date)
    .replace('.', '');
}

function buildConsistencyHeatmap(days = [], endDate, windowDays = 365) {
  const normalizedDays = Math.max(7, Math.min(730, Number(windowDays) || 365));
  const parsedEnd = parseIsoDate(endDate) || parseIsoDate(days[days.length - 1]?.date) || new Date();
  const end = parsedEnd;
  const start = addDays(end, -(normalizedDays - 1));
  const gridStart = addDays(start, -mondayIndex(start));
  const gridEnd = addDays(end, 6 - mondayIndex(end));
  const byDate = new Map(days.map((day) => [String(day.date), day]));
  const weeks = [];

  for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 7)) {
    const cells = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(cursor, index);
      const key = isoDate(date);
      return {
        date: key,
        inRange: date >= start && date <= end,
        day: byDate.get(key) || null,
      };
    });
    const firstInRange = cells.find((cell) => cell.inRange);
    weeks.push({
      key: cells[0].date,
      monthLabel: firstInRange && (firstInRange.date.slice(8) <= '07' || weeks.length === 0)
        ? monthLabel(parseIsoDate(firstInRange.date))
        : '',
      cells,
    });
  }

  return {
    startDate: isoDate(start),
    endDate: isoDate(end),
    weeks,
  };
}

module.exports = { buildConsistencyHeatmap };
