const { ValidationError } = require('./validation.js');

function errorToResponse(error) {
  if (error instanceof ValidationError) {
    return Response.json(
      {
        error: error.message,
        details: error.details || undefined,
      },
      { status: error.status || 400 }
    );
  }

  console.error('[API ERROR]', error);
  return Response.json({ error: 'Erro interno do servidor.' }, { status: 500 });
}

module.exports = {
  errorToResponse,
};
