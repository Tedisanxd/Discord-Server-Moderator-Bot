const { Database } = require('node-sqlite3-wasm');
const path = require('path');

const _db = new Database(path.join(__dirname, '..', 'bot.db'));

_db.exec('PRAGMA journal_mode = WAL');
_db.exec('PRAGMA foreign_keys = ON');

// Save native prepare before any overrides
const _nativePrepare = _db.prepare.bind(_db);

// Internal helpers using native prepare + auto-finalize
function sqlGet(sql, params) {
  const stmt = _nativePrepare(sql);
  const result = stmt.get(params || []);
  stmt.finalize();
  return result;
}

function sqlAll(sql, params) {
  const stmt = _nativePrepare(sql);
  const result = stmt.all(params || []);
  stmt.finalize();
  return result;
}

function sqlRun(sql, params) {
  const stmt = _nativePrepare(sql);
  stmt.run(params || []);
  stmt.finalize();
}

_db.exec(`
  CREATE TABLE IF NOT EXISTS guild_config (
    guild_id TEXT PRIMARY KEY,
    prefix TEXT DEFAULT '!',
    log_channel TEXT,
    log_message_channel TEXT,
    log_member_channel TEXT,
    log_join_channel TEXT,
    log_server_channel TEXT,
    log_voice_channel TEXT,
    log_events INTEGER DEFAULT 0,
    log_timeout_enabled INTEGER DEFAULT 0,
    log_removetimeout_enabled INTEGER DEFAULT 0,
    log_name_enabled INTEGER DEFAULT 0,
    modlog_channel TEXT,
    welcome_channel TEXT,
    welcome_message TEXT DEFAULT 'Welcome {user} to **{server}**! You are member #{membercount}.',
    welcome_dm TEXT,
    leave_channel TEXT,
    leave_message TEXT DEFAULT '**{username}** has left the server.',
    automod_log_channel TEXT,
    automod_enabled INTEGER DEFAULT 0,
    automod_spam_rate INTEGER DEFAULT 0,
    automod_spam_per INTEGER DEFAULT 0,
    automod_spam_punishment TEXT DEFAULT 'delete',
    automod_warn_threshold INTEGER DEFAULT 0,
    automod_warn_punishment TEXT DEFAULT 'kick',
    muterole_id TEXT,
    suggestion_channel TEXT,
    xp_enabled INTEGER DEFAULT 1,
    xp_per_message INTEGER DEFAULT 15,
    xp_cooldown INTEGER DEFAULT 60,
    level_up_channel TEXT,
    level_up_message TEXT DEFAULT 'Congratulations {user}, you leveled up to level **{level}**!'
  );

  CREATE TABLE IF NOT EXISTS log_ignored (
    guild_id TEXT,
    target_id TEXT,
    type TEXT,
    PRIMARY KEY (guild_id, target_id)
  );

  CREATE TABLE IF NOT EXISTS log_ignored_prefixes (
    guild_id TEXT,
    prefix TEXT,
    PRIMARY KEY (guild_id, prefix)
  );

  CREATE TABLE IF NOT EXISTS automod_bad_words (
    guild_id TEXT,
    word TEXT,
    punishment TEXT DEFAULT 'delete,warn',
    PRIMARY KEY (guild_id, word)
  );

  CREATE TABLE IF NOT EXISTS automod_link_filter (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    punishment TEXT DEFAULT 'delete'
  );

  CREATE TABLE IF NOT EXISTS automod_invite_filter (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    punishment TEXT DEFAULT 'delete,warn'
  );

  CREATE TABLE IF NOT EXISTS automod_media_channels (
    guild_id TEXT,
    channel_id TEXT,
    PRIMARY KEY (guild_id, channel_id)
  );

  CREATE TABLE IF NOT EXISTS automod_whitelist (
    guild_id TEXT,
    target_id TEXT,
    type TEXT,
    PRIMARY KEY (guild_id, target_id)
  );

  CREATE TABLE IF NOT EXISTS mod_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    case_number INTEGER,
    type TEXT,
    user_id TEXT,
    user_tag TEXT,
    moderator_id TEXT,
    moderator_tag TEXT,
    reason TEXT DEFAULT 'No reason provided',
    duration TEXT,
    timestamp INTEGER,
    message_id TEXT
  );

  CREATE TABLE IF NOT EXISTS guild_case_counter (
    guild_id TEXT PRIMARY KEY,
    counter INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    user_id TEXT,
    moderator_id TEXT,
    reason TEXT DEFAULT 'No reason provided',
    timestamp INTEGER
  );

  CREATE TABLE IF NOT EXISTS temp_punishments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    user_id TEXT,
    type TEXT,
    expires_at INTEGER,
    extra TEXT
  );

  CREATE TABLE IF NOT EXISTS reaction_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    channel_id TEXT,
    message_id TEXT,
    emoji TEXT,
    role_id TEXT,
    UNIQUE(guild_id, message_id, emoji)
  );

  CREATE TABLE IF NOT EXISTS tags (
    guild_id TEXT,
    name TEXT,
    content TEXT,
    creator_id TEXT,
    uses INTEGER DEFAULT 0,
    created_at INTEGER,
    PRIMARY KEY (guild_id, name)
  );

  CREATE TABLE IF NOT EXISTS suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    channel_id TEXT,
    message_id TEXT,
    user_id TEXT,
    content TEXT,
    status TEXT DEFAULT 'pending',
    response TEXT,
    timestamp INTEGER
  );

  CREATE TABLE IF NOT EXISTS user_xp (
    guild_id TEXT,
    user_id TEXT,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    last_message INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS banned_users (
    guild_id TEXT,
    user_id TEXT,
    user_tag TEXT,
    account_created_at INTEGER,
    banned_at INTEGER,
    reason TEXT,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS verification_config (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    verification_channel_id TEXT,
    unverified_role_id TEXT,
    verified_role_id TEXT,
    alert_channel_id TEXT,
    min_account_age_days INTEGER DEFAULT 7,
    autoban_previous INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS verified_users (
    guild_id TEXT,
    user_id TEXT,
    verified_at INTEGER,
    verified_by TEXT,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS web_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT DEFAULT 'other',
    discord_user_id TEXT,
    discord_user_tag TEXT,
    status TEXT DEFAULT 'pending',
    votes INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS web_suggestion_votes (
    suggestion_id INTEGER,
    user_id TEXT,
    PRIMARY KEY (suggestion_id, user_id)
  );
`);

// Public API — mimics better-sqlite3's db.prepare(sql).get/all/run
const db = {
  prepare(sql) {
    return {
      get: (...params) => sqlGet(sql, params),
      all: (...params) => sqlAll(sql, params),
      run: (...params) => sqlRun(sql, params),
    };
  },

  exec(sql) {
    _db.exec(sql);
  },

  getConfig(guildId) {
    let cfg = sqlGet('SELECT * FROM guild_config WHERE guild_id = ?', [guildId]);
    if (!cfg) {
      sqlRun('INSERT OR IGNORE INTO guild_config (guild_id) VALUES (?)', [guildId]);
      cfg = sqlGet('SELECT * FROM guild_config WHERE guild_id = ?', [guildId]);
    }
    return cfg;
  },

  setConfig(guildId, key, value) {
    sqlRun('INSERT OR IGNORE INTO guild_config (guild_id) VALUES (?)', [guildId]);
    sqlRun(`UPDATE guild_config SET ${key} = ? WHERE guild_id = ?`, [value, guildId]);
  },

  nextCase(guildId) {
    sqlRun('INSERT OR IGNORE INTO guild_case_counter (guild_id) VALUES (?)', [guildId]);
    sqlRun('UPDATE guild_case_counter SET counter = counter + 1 WHERE guild_id = ?', [guildId]);
    return sqlGet('SELECT counter FROM guild_case_counter WHERE guild_id = ?', [guildId]).counter;
  },
};

module.exports = db;
