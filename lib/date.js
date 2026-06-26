function getTodayInTimezone(now = new Date(), timeZone = 'America/Sao_Paulo') {
  const date = now instanceof Date ? now : new Date(now);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function shiftDate(date, delta) {
  const current = new Date(`${date}T12:00:00Z`);
  current.setUTCDate(current.getUTCDate() + delta);
  return current.toISOString().split('T')[0];
}

module.exports = {
  getTodayInTimezone,
  shiftDate,
};
