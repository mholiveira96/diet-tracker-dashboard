const fs = require('node:fs/promises');
const path = require('node:path');
const { ACTIONS } = require('./contract.js');
const { getFoodAiConfig } = require('./config.js');
const { execute } = require('../db.js');

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const normalized = typeof value === 'string' ? value.replace(',', '.').trim() : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeWhitespace(text = '') {
  return String(text).replace(/\s+/g, ' ').trim();
}

function normalizeFoodKey(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseEmbeddedBaseAmount(unit = '') {
  const match = String(unit).match(/(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l)\b/i);
  if (!match) return null;
  const amount = toNumber(match[1]);
  const normalizedUnit = match[2].toLowerCase();
  return amount ? { amount, unit: normalizedUnit } : null;
}

function normalizeMeasureUnit(unit = '') {
  const value = normalizeFoodKey(unit);
  if (!value) return null;
  if (['g', 'grama', 'gramas'].includes(value)) return 'g';
  if (['kg', 'quilo', 'quilos'].includes(value)) return 'kg';
  if (['ml', 'mililitro', 'mililitros'].includes(value)) return 'ml';
  if (['l', 'litro', 'litros'].includes(value)) return 'l';
  if (['un', 'und', 'unidade', 'unidades'].includes(value)) return 'un';
  if (['fatia', 'fatias'].includes(value)) return 'fatia';
  if (['porcao', 'porcoes', 'porção', 'porções'].includes(value)) return 'porcao';
  return value;
}

function convertAmount(amount, fromUnit, toUnit) {
  if (amount === null || amount === undefined) return null;
  if (!fromUnit || !toUnit) return null;
  if (fromUnit === toUnit) return amount;
  if (fromUnit === 'kg' && toUnit === 'g') return amount * 1000;
  if (fromUnit === 'g' && toUnit === 'kg') return amount / 1000;
  if (fromUnit === 'l' && toUnit === 'ml') return amount * 1000;
  if (fromUnit === 'ml' && toUnit === 'l') return amount / 1000;
  return null;
}

function parseMealLine(line) {
  const match = normalizeWhitespace(line).match(/^(\d+(?:[.,]\d+)?)\s*([\p{L}]+)\s+(.+)$/u);
  if (!match) return null;
  const amount = toNumber(match[1]);
  const unit = normalizeMeasureUnit(match[2]);
  const name = normalizeWhitespace(match[3]);
  if (amount === null || !unit || !name) return null;
  return { amount, unit, name };
}

function scoreFavoriteMatch(foodName, favoriteName) {
  const wanted = normalizeFoodKey(foodName);
  const candidate = normalizeFoodKey(favoriteName);
  if (!wanted || !candidate) return 0;
  if (wanted === candidate) return 100;
  if (candidate.startsWith(wanted)) return 90;
  if (candidate.includes(` ${wanted} `) || candidate.endsWith(` ${wanted}`) || candidate.startsWith(`${wanted} `)) return 84;

  const wantedTokens = wanted.split(' ').filter(Boolean);
  const candidateTokens = candidate.split(' ').filter(Boolean);
  const overlap = wantedTokens.filter((token) => candidateTokens.includes(token)).length;
  if (!overlap) return 0;
  return Math.round((overlap / wantedTokens.length) * 70);
}

function resolveFavoriteBase(favorite) {
  const embedded = parseEmbeddedBaseAmount(favorite.unit);
  if (embedded) return embedded;

  const explicitAmount = toNumber(favorite.base_amount);
  const explicitUnit = normalizeMeasureUnit(favorite.unit);
  if (explicitAmount !== null && explicitUnit) {
    return { amount: explicitAmount, unit: explicitUnit };
  }

  return { amount: 1, unit: normalizeMeasureUnit(favorite.unit) || 'un' };
}

function scaleFavoriteMacros(favorite, entry) {
  const base = resolveFavoriteBase(favorite);
  const entryAmountInBaseUnit = convertAmount(entry.amount, entry.unit, base.unit);
  const entryAmountComparable = entryAmountInBaseUnit ?? (entry.unit === base.unit ? entry.amount : null);
  if (entryAmountComparable === null || !base.amount) return null;

  const ratio = entryAmountComparable / base.amount;
  return {
    description: favorite.name,
    amount: entry.amount,
    unit: entry.unit,
    calories: Number((toNumber(favorite.calories, 0) * ratio).toFixed(1)),
    protein: Number((toNumber(favorite.protein, 0) * ratio).toFixed(1)),
    carbs: Number((toNumber(favorite.carbs, 0) * ratio).toFixed(1)),
    fat: Number((toNumber(favorite.fat, 0) * ratio).toFixed(1)),
  };
}

async function normalizeStructuredMealFromFavorites(text = '') {
  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  if (lines.length < 2) return null;

  const header = /:$/.test(lines[0]) ? lines[0].replace(/:$/, '') : null;
  const candidateLines = header ? lines.slice(1) : lines;
  if (!candidateLines.every((line) => parseMealLine(line))) return null;

  const favoritesRes = await execute(`SELECT name, calories, protein, carbs, fat, base_amount, unit FROM favorites`);
  const favorites = favoritesRes.rows || [];
  if (!favorites.length) return null;

  const mealItems = [];
  const ambiguities = [];

  for (const line of candidateLines) {
    const entry = parseMealLine(line);
    if (!entry) return null;

    const ranked = favorites
      .map((favorite) => ({ favorite, score: scoreFavoriteMatch(entry.name, favorite.name) }))
      .filter((item) => item.score >= 70)
      .sort((a, b) => b.score - a.score);

    const best = ranked[0]?.favorite;
    if (!best) {
      ambiguities.push(`Não encontrei macros salvos para "${entry.name}"`);
      continue;
    }

    const scaled = scaleFavoriteMacros(best, entry);
    if (!scaled) {
      ambiguities.push(`Não consegui escalar a porção de "${entry.name}"`);
      continue;
    }

    mealItems.push(scaled);
  }

  if (!mealItems.length) return null;

  const allMatched = ambiguities.length === 0 && mealItems.length === candidateLines.length;
  const totals = mealItems.reduce(
    (acc, item) => {
      acc.calories += toNumber(item.calories, 0);
      acc.protein += toNumber(item.protein, 0);
      acc.carbs += toNumber(item.carbs, 0);
      acc.fat += toNumber(item.fat, 0);
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    action: allMatched ? ACTIONS.LOG_MEAL : ACTIONS.CLARIFY,
    confidence: allMatched ? 0.93 : 0.55,
    description: header || 'Refeição',
    amount: 1,
    unit: 'refeição',
    calories: Number(totals.calories.toFixed(1)),
    protein: Number(totals.protein.toFixed(1)),
    carbs: Number(totals.carbs.toFixed(1)),
    fat: Number(totals.fat.toFixed(1)),
    meal_items: mealItems,
    question: allMatched ? undefined : `Consigo calcular parte disso, mas preciso confirmar: ${ambiguities.join('; ')}`,
    ambiguities,
    source: 'favorites-heuristic',
  };
}

function normalizeWithHeuristics({ text = '', attachments = [] }) {
  const normalizedText = normalizeWhitespace(text);
  const lower = normalizedText.toLowerCase();

  const workoutMatch = lower.match(/^(corrida|caminhada|bike|bicicleta|muscula(?:cao|ção)|treino|futebol|natacao|natação)\b(?:.*?)(\d{1,3})\s*(?:min|m)\b(?:.*?)(\d{2,4})\s*(?:kcal|cal)\b/i);
  if (workoutMatch) {
    return {
      action: ACTIONS.LOG_WORKOUT,
      confidence: 0.94,
      modality: workoutMatch[1],
      duration_min: toNumber(workoutMatch[2]),
      calories: toNumber(workoutMatch[3]),
      ambiguities: [],
      source: 'heuristic',
    };
  }

  const simpleWorkout = lower.match(/^(corrida|caminhada|bike|bicicleta|muscula(?:cao|ção)|treino|futebol|natacao|natação)\b(?:.*?)(\d{1,3})\s*(?:min|m|h|hora|horas)\b/i);
  if (simpleWorkout) {
    const rawDuration = toNumber(simpleWorkout[2]);
    const hoursLike = /\b(h|hora|horas)\b/i.test(lower);
    return {
      action: ACTIONS.LOG_WORKOUT,
      confidence: 0.76,
      modality: simpleWorkout[1],
      duration_min: hoursLike ? rawDuration * 60 : rawDuration,
      calories: null,
      ambiguities: ['Calorias do treino ausentes'],
      source: 'heuristic',
    };
  }

  const explicitMacros = lower.match(/(.+?)\s+(\d{2,4})\s*kcal\s+(\d{1,3}(?:[.,]\d+)?)\s*p(?:rot(?:eina)?)?\s+(\d{1,3}(?:[.,]\d+)?)\s*c(?:arb(?:o)?)?\s+(\d{1,3}(?:[.,]\d+)?)\s*g(?:ord(?:ura)?)?/i);
  if (explicitMacros) {
    return {
      action: ACTIONS.LOG_MEAL,
      confidence: 0.98,
      description: normalizeWhitespace(explicitMacros[1]),
      calories: toNumber(explicitMacros[2]),
      protein: toNumber(explicitMacros[3]),
      carbs: toNumber(explicitMacros[4]),
      fat: toNumber(explicitMacros[5]),
      amount: 1,
      unit: 'porção',
      ambiguities: [],
      source: 'heuristic',
    };
  }

  if (attachments.length > 0) {
    return {
      action: ACTIONS.CLARIFY,
      confidence: 0.45,
      question: 'Quais alimentos aparecem na foto e, se souber, qual a porção aproximada?',
      ambiguities: ['Imagem precisa de análise multimodal ou contexto adicional'],
      source: 'heuristic',
    };
  }

  return {
    action: ACTIONS.CLARIFY,
    confidence: 0.35,
    question: 'Qual foi a refeição ou treino, e se souber quais macros/calorias devo registrar?',
    ambiguities: ['Entrada livre sem estrutura suficiente para salvar com segurança'],
    source: 'heuristic',
  };
}

function decidePersistenceMode(result) {
  if (!result || result.action === ACTIONS.NOOP) {
    return { mode: 'clarify', reason: 'Nenhuma ação válida encontrada' };
  }

  if (result.action === ACTIONS.CLARIFY) {
    return { mode: 'clarify' };
  }

  if (result.action === ACTIONS.LOG_MEAL) {
    const hasMacros = [result.calories, result.protein, result.carbs, result.fat].every((value) => toNumber(value) !== null);
    if (!hasMacros) {
      return { mode: 'clarify', reason: 'Macros obrigatórios ausentes para salvar refeição' };
    }
  }

  if (result.action === ACTIONS.LOG_WORKOUT) {
    const hasWorkoutFields = toNumber(result.duration_min) !== null;
    if (!hasWorkoutFields) {
      return { mode: 'clarify', reason: 'Duração do treino ausente' };
    }
  }

  if (result.confidence >= 0.85) {
    return { mode: 'auto_save' };
  }

  if (result.confidence >= 0.6) {
    return { mode: 'draft' };
  }

  return { mode: 'clarify' };
}

function buildPrompt({ text, attachments }) {
  return [
    'Você é um parser nutricional e de treino.',
    'Responda SOMENTE JSON válido.',
    'Ações permitidas: log_meal, log_workout, clarify, noop.',
    'Para log_meal, inclua: description, calories, protein, carbs, fat, amount, unit, confidence, ambiguities.',
    'Para log_workout, inclua: modality, duration_min, calories, confidence, ambiguities.',
    'Se faltar certeza suficiente, retorne action=clarify com question e ambiguities.',
    attachments.length > 0 ? 'Há imagem anexada junto com a mensagem do usuário.' : 'Sem imagem anexada.',
    `Mensagem do usuário: ${text || '(sem texto)'}`,
  ].join('\n');
}

async function fileToDataUrl(filePath, mimeType) {
  const buffer = await fs.readFile(path.resolve(filePath));
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

async function normalizeWithAi({ text = '', attachments = [] }) {
  const config = getFoodAiConfig();
  if (!config.configured) {
    throw new Error('FOOD_AI is not configured');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const content = [{ type: 'text', text: buildPrompt({ text, attachments }) }];
    for (const attachment of attachments) {
      content.push({
        type: 'image_url',
        image_url: {
          url: await fileToDataUrl(attachment.storage_path, attachment.mime_type || 'image/jpeg'),
        },
      });
    }

    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Você transforma entradas de dieta e treino em JSON estrito.' },
          { role: 'user', content },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const rawText = payload?.choices?.[0]?.message?.content;
    if (!rawText) {
      throw new Error('AI response missing message content');
    }

    const parsed = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
    return {
      ...parsed,
      source: 'ai',
      provider: 'xiaomi-token-plan',
      model: config.model,
      raw: payload,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function normalizeUserInput({ text = '', attachments = [] }) {
  try {
    const structuredMeal = await normalizeStructuredMealFromFavorites(text);
    if (structuredMeal) {
      return structuredMeal;
    }
  } catch (_error) {
    // Ignore favorite-lookup failures and continue through the existing heuristic/AI pipeline.
  }

  const heuristic = normalizeWithHeuristics({ text, attachments });
  const shouldSkipAi = heuristic.action === ACTIONS.LOG_WORKOUT || (!attachments.length && heuristic.action === ACTIONS.LOG_MEAL);

  if (shouldSkipAi) {
    return heuristic;
  }

  try {
    return await normalizeWithAi({ text, attachments });
  } catch (error) {
    return {
      ...heuristic,
      fallback_error: error.message,
    };
  }
}

module.exports = {
  normalizeUserInput,
  normalizeWithHeuristics,
  decidePersistenceMode,
  toNumber,
};
