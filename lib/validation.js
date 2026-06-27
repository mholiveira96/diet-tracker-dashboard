class ValidationError extends Error {
  constructor(message, status = 400, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.status = status;
    this.details = details;
  }
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function normalizeLoggedAt(value) {
  if (isBlank(value)) return null;

  const normalized = String(value).trim().replace('T', ' ').replace(/Z$/, '');
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})\s(\d{2}:\d{2})(?::\d{2})?$/);
  if (!match) {
    throw new ValidationError('Horário inválido. Use data e hora válidas.', 400, { field: 'logged_at' });
  }

  return `${match[1]} ${match[2]}:00`;
}

function requireIntegerId(value, field = 'id') {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`Identificador inválido para ${field}.`, 400, { field });
  }
  return parsed;
}

function requireNumber(value, field, options = {}) {
  const { min = null, max = null, integer = false } = options;
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`${field} precisa ser um número válido.`, 400, { field });
  }

  if (integer && !Number.isInteger(parsed)) {
    throw new ValidationError(`${field} precisa ser um número inteiro.`, 400, { field });
  }

  if (min !== null && parsed < min) {
    throw new ValidationError(`${field} precisa ser maior ou igual a ${min}.`, 400, { field, min });
  }

  if (max !== null && parsed > max) {
    throw new ValidationError(`${field} precisa ser menor ou igual a ${max}.`, 400, { field, max });
  }

  return parsed;
}

function requireString(value, field, options = {}) {
  const { maxLength = 255 } = options;
  if (isBlank(value)) {
    throw new ValidationError(`${field} é obrigatório.`, 400, { field });
  }

  const normalized = String(value).trim();
  if (normalized.length > maxLength) {
    throw new ValidationError(`${field} excedeu o tamanho máximo de ${maxLength} caracteres.`, 400, { field, maxLength });
  }

  return normalized;
}

function optionalString(value, field, options = {}) {
  if (isBlank(value)) return null;
  return requireString(value, field, options);
}

function requireEnum(value, field, allowedValues = []) {
  const normalized = requireString(value, field, { maxLength: 100 });
  if (!allowedValues.includes(normalized)) {
    throw new ValidationError(`${field} precisa ser um destes valores: ${allowedValues.join(', ')}.`, 400, {
      field,
      allowedValues,
    });
  }
  return normalized;
}

function parseAttachmentIds(rawValue) {
  if (rawValue === undefined || rawValue === null) return [];
  if (!Array.isArray(rawValue)) {
    throw new ValidationError('attachmentIds precisa ser uma lista.', 400, { field: 'attachmentIds' });
  }

  const ids = rawValue
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length !== rawValue.length) {
    throw new ValidationError('attachmentIds contém valores inválidos.', 400, { field: 'attachmentIds' });
  }

  return uniqueIds;
}

function assertAtLeastOne(values, message) {
  const hasValue = values.some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return !isBlank(value);
  });

  if (!hasValue) {
    throw new ValidationError(message, 400);
  }
}

module.exports = {
  ValidationError,
  normalizeLoggedAt,
  requireIntegerId,
  requireNumber,
  requireString,
  optionalString,
  requireEnum,
  parseAttachmentIds,
  assertAtLeastOne,
};
