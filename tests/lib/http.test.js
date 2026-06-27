const test = require('node:test');
const assert = require('node:assert/strict');

const { errorToResponse } = require('../../lib/http.js');
const { ValidationError } = require('../../lib/validation.js');

test('errorToResponse preserves validation details for safe client errors', async () => {
  const response = errorToResponse(new ValidationError('parserMode é obrigatório.', 400, { field: 'parserMode' }));
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(payload, {
    error: 'parserMode é obrigatório.',
    details: { field: 'parserMode' },
  });
});

test('errorToResponse hides raw internal messages on generic server errors', async () => {
  const response = errorToResponse(new Error('SQLITE_BUSY: database is locked'));
  const payload = await response.json();

  assert.equal(response.status, 500);
  assert.deepEqual(payload, {
    error: 'Erro interno do servidor.',
  });
});
