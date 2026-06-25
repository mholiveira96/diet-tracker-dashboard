const { createClient } = require('@libsql/client/web');

let client = null;

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
}

function getClient() {
  if (client) return client;
  client = createClient({
    url: getEnv('TURSO_URL').replace('libsql://', 'https://'),
    authToken: getEnv('TURSO_AUTH_TOKEN'),
  });
  return client;
}

async function execute(sql, args = []) {
  return getClient().execute({ sql, args });
}

async function executeMany(statements) {
  const db = getClient();
  const results = [];
  for (const statement of statements) {
    results.push(await db.execute(statement));
  }
  return results;
}

module.exports = {
  getClient,
  execute,
  executeMany,
};
