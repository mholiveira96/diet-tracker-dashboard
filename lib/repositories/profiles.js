const { execute, withTransaction } = require('../db.js');

const CLAIMABLE_PROFILE_SLUGS = ['matheus', 'joyce', 'allan', 'musi'];

function normalizeClaimText(text) {
  const match = String(text || '').trim().toLocaleLowerCase('pt-BR').match(/^sou\s+([\p{L}]+)$/u);
  if (!match) return null;
  return CLAIMABLE_PROFILE_SLUGS.includes(match[1]) ? match[1] : null;
}

async function listProfiles() {
  const result = await execute(`
    SELECT id, slug, display_name, status, onboarding_step,
      weight_kg, goal_type, updated_at
    FROM profiles
    ORDER BY CASE slug
      WHEN 'matheus' THEN 1 WHEN 'joyce' THEN 2 WHEN 'allan' THEN 3 WHEN 'musi' THEN 4 ELSE 5
    END
  `);
  return result.rows || [];
}

async function getProfileById(profileId) {
  const result = await execute('SELECT * FROM profiles WHERE id = ? LIMIT 1', [profileId]);
  return result.rows[0] || null;
}

async function getProfileBySlug(slug) {
  const result = await execute('SELECT * FROM profiles WHERE slug = ? LIMIT 1', [slug]);
  return result.rows[0] || null;
}

async function getProfileByLid(lid) {
  const result = await execute('SELECT * FROM profiles WHERE whatsapp_lid = ? LIMIT 1', [lid]);
  return result.rows[0] || null;
}

async function claimProfileByLid({ slug, lid }) {
  if (!CLAIMABLE_PROFILE_SLUGS.includes(slug)) {
    throw new Error('Perfil não pode ser identificado neste grupo.');
  }
  if (!lid || !String(lid).includes('@')) {
    throw new Error('LID do WhatsApp inválido.');
  }

  return withTransaction(async (transaction) => {
    const existing = await transaction.execute({ sql: 'SELECT id, slug FROM profiles WHERE whatsapp_lid = ? LIMIT 1', args: [lid] });
    if (existing.rows[0]) {
      if (existing.rows[0].slug === slug) return getProfileBySlug(slug);
      throw new Error('Este WhatsApp já está vinculado a outro perfil.');
    }
    const update = await transaction.execute({
      sql: `UPDATE profiles
            SET whatsapp_lid = ?, status = 'onboarding', onboarding_step = 'age', updated_at = strftime('%Y-%m-%d %H:%M:%S', 'now')
            WHERE slug = ? AND whatsapp_lid IS NULL`,
      args: [lid, slug],
    });
    if (!update.rowsAffected) {
      throw new Error('Esse perfil já foi identificado por outra pessoa.');
    }
    const result = await transaction.execute({ sql: 'SELECT * FROM profiles WHERE slug = ? LIMIT 1', args: [slug] });
    return result.rows[0];
  });
}

async function updateProfileOnboarding(profileId, fields) {
  const allowed = ['age', 'sex', 'height_cm', 'weight_kg', 'activity_level', 'goal_type', 'goal_pace', 'onboarding_step', 'onboarding_json', 'status'];
  const entries = Object.entries(fields).filter(([key]) => allowed.includes(key));
  if (!entries.length) return getProfileById(profileId);
  const columns = entries.map(([key]) => `${key} = ?`);
  const args = entries.map(([, value]) => value);
  args.push(profileId);
  await execute(
    `UPDATE profiles SET ${columns.join(', ')}, updated_at = strftime('%Y-%m-%d %H:%M:%S', 'now') WHERE id = ?`,
    args
  );
  return getProfileById(profileId);
}

module.exports = {
  CLAIMABLE_PROFILE_SLUGS,
  normalizeClaimText,
  listProfiles,
  getProfileById,
  getProfileBySlug,
  getProfileByLid,
  claimProfileByLid,
  updateProfileOnboarding,
};
