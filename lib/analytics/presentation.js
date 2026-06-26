function normalizeLoggedAt(value) {
  if (!value) return '';
  const normalized = String(value).replace(' ', 'T').replace(/Z$/, '');
  return normalized.slice(0, 16);
}

function formatLoggedAtForInput(value) {
  return normalizeLoggedAt(value);
}

function formatTimelineTime(value) {
  const normalized = formatLoggedAtForInput(value);
  if (!normalized) return '--:--';
  return normalized.slice(11, 16);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getHistoryCaloriesBar(day, goalCalories) {
  const calories = Number(day?.kcal || 0);
  const goal = Math.max(1, Number(goalCalories || 0));
  const ratio = calories / goal;
  const width = `${Math.round(clamp(ratio, 0, 1) * 100)}%`;

  if (ratio >= 1) {
    return {
      width,
      background: 'linear-gradient(90deg, #f97316 0%, #ef4444 55%, #dc2626 100%)',
      tone: 'red',
    };
  }

  if (ratio >= 0.7) {
    return {
      width,
      background: 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)',
      tone: 'amber',
    };
  }

  return {
    width,
    background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
    tone: 'emerald',
  };
}

module.exports = {
  formatLoggedAtForInput,
  formatTimelineTime,
  getHistoryCaloriesBar,
};
