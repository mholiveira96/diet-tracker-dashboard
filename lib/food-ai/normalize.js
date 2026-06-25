const fs = require('node:fs/promises');
const path = require('node:path');
const { ACTIONS } = require('./contract.js');
const { getFoodAiConfig } = require('./config.js');

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const normalized = typeof value === 'string' ? value.replace(',', '.').trim() : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeWhitespace(text = '') {
  return String(text).replace(/\s+/g, ' ').trim();
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
