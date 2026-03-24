require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const db = require('../src/database');

const app = express();

// ─── Passport ───────────────────────────────────────
passport.use(new DiscordStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: `${process.env.DASHBOARD_URL}/auth/discord/callback`,
  scope: ['identify', 'guilds'],
}, (accessToken, refreshToken, profile, done) => {
  profile.accessToken = accessToken;
  return done(null, profile);
}));
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ─── Middleware ──────────────────────────────────────
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'changeme',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
}));
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Auth helpers ────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.isAuthenticated()) return res.redirect('/login');
  next();
}
function hasManageServer(userGuild) {
  if (!userGuild) return false;
  return (BigInt(userGuild.permissions) & 0x20n) === 0x20n;
}

// ─── Auth routes ─────────────────────────────────────
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', {
  failureRedirect: '/login',
  successRedirect: '/guilds',
}));
app.get('/auth/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

// ─── Public pages ────────────────────────────────────
app.get('/', (req, res) => {
  const client = app.locals.client;
  const stats = {
    guilds: client ? client.guilds.cache.size : 0,
    users: client ? client.guilds.cache.reduce((a, g) => a + g.memberCount, 0) : 0,
    cases: db.prepare('SELECT COUNT(*) as c FROM mod_cases').get()?.c || 0,
    online: !!client?.isReady(),
  };
  res.render('index', { stats, pageTitle: 'Bot Dashboard', active: 'home' });
});

app.get('/login', (req, res) => res.render('login', { pageTitle: 'Login' }));

app.get('/status', (req, res) => {
  const client = app.locals.client;
  const start = process.hrtime.bigint();
  const online = !!client?.isReady();
  const ping = client?.ws?.ping ?? 0;
  const guildCount = client ? client.guilds.cache.size : 0;
  const userCount = client ? client.guilds.cache.reduce((a, g) => a + g.memberCount, 0) : 0;
  const caseCount = db.prepare('SELECT COUNT(*) as c FROM mod_cases').get()?.c || 0;

  // Format uptime
  const rawUptime = process.uptime();
  const days = Math.floor(rawUptime / 86400);
  const hrs  = Math.floor((rawUptime % 86400) / 3600);
  const mins = Math.floor((rawUptime % 3600) / 60);
  const uptime = days > 0 ? `${days}d ${hrs}h ${mins}m` : hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

  res.render('status', { online, ping, guildCount, userCount, uptime, caseCount, pageTitle: 'Bot Status', active: 'status' });
});

app.get('/roadmap', (req, res) => {
  res.render('roadmap', { pageTitle: 'Roadmap', active: 'roadmap' });
});

app.get('/commands', (req, res) => {
  res.render('commands', { pageTitle: 'Commands', active: 'commands' });
});

app.get('/license', (req, res) => {
  res.render('license', { pageTitle: 'License', active: '' });
});

// ─── Suggestions ─────────────────────────────────────
app.get('/suggestions', (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const perPage = 10;
  const filter = req.query.filter || 'all';

  const where = filter !== 'all' ? `WHERE status = '${filter.replace(/'/g, '')}'` : '';
  const total = db.prepare(`SELECT COUNT(*) as c FROM web_suggestions ${where}`).get()?.c || 0;
  const rows = db.prepare(`SELECT * FROM web_suggestions ${where} ORDER BY votes DESC, created_at DESC LIMIT ? OFFSET ?`).all(perPage, page * perPage);

  // Check which ones the current user voted on
  const votedSet = new Set();
  if (req.user) {
    const voted = db.prepare('SELECT suggestion_id FROM web_suggestion_votes WHERE user_id = ?').all(req.user.id);
    voted.forEach(v => votedSet.add(v.suggestion_id));
  }
  const suggestions = rows.map(s => ({ ...s, userVoted: votedSet.has(s.id) }));

  res.render('suggestions', {
    suggestions, page, perPage, total, filter,
    success: req.query.submitted === '1',
    error: null,
    pageTitle: 'Suggestions',
    active: 'suggestions',
  });
});

app.post('/suggestions', requireAuth, (req, res) => {
  const { title, description, category } = req.body;
  if (!title?.trim() || !description?.trim()) {
    return res.redirect('/suggestions?error=1');
  }
  db.prepare('INSERT INTO web_suggestions (title, description, category, discord_user_id, discord_user_tag, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(title.trim().slice(0, 100), description.trim().slice(0, 500), category || 'other', req.user.id, req.user.username, Date.now());
  res.redirect('/suggestions?submitted=1');
});

app.post('/suggestions/:id/vote', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Login required to vote.' });
  const id = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM web_suggestion_votes WHERE suggestion_id = ? AND user_id = ?').get(id, req.user.id);
  if (existing) {
    db.prepare('DELETE FROM web_suggestion_votes WHERE suggestion_id = ? AND user_id = ?').run(id, req.user.id);
    db.prepare('UPDATE web_suggestions SET votes = MAX(0, votes - 1) WHERE id = ?').run(id);
    const s = db.prepare('SELECT votes FROM web_suggestions WHERE id = ?').get(id);
    return res.json({ voted: false, votes: s?.votes || 0 });
  } else {
    db.prepare('INSERT INTO web_suggestion_votes (suggestion_id, user_id) VALUES (?, ?)').run(id, req.user.id);
    db.prepare('UPDATE web_suggestions SET votes = votes + 1 WHERE id = ?').run(id);
    const s = db.prepare('SELECT votes FROM web_suggestions WHERE id = ?').get(id);
    return res.json({ voted: true, votes: s?.votes || 0 });
  }
});

// ─── Guild pages ─────────────────────────────────────
app.get('/guilds', requireAuth, (req, res) => {
  const botGuildIds = new Set(
    db.prepare('SELECT DISTINCT guild_id FROM guild_config').all().map(r => r.guild_id)
  );
  const manageable = req.user.guilds.filter(g => hasManageServer(g) && botGuildIds.has(g.id));
  res.render('guilds', { guilds: manageable, pageTitle: 'Select Server', active: '' });
});

app.get('/dashboard/:guildId', requireAuth, (req, res) => {
  const { guildId } = req.params;
  const userGuild = req.user.guilds.find(g => g.id === guildId);
  if (!userGuild || !hasManageServer(userGuild)) return res.redirect('/guilds');

  const cfg = db.getConfig(guildId);
  const badWords = db.prepare('SELECT * FROM automod_bad_words WHERE guild_id = ?').all(guildId);
  const linkFilter = db.prepare('SELECT * FROM automod_link_filter WHERE guild_id = ?').get(guildId);
  const inviteFilter = db.prepare('SELECT * FROM automod_invite_filter WHERE guild_id = ?').get(guildId);
  const caseCount = db.prepare('SELECT COUNT(*) as c FROM mod_cases WHERE guild_id = ?').get(guildId)?.c || 0;
  const warnCount = db.prepare('SELECT COUNT(*) as c FROM warnings WHERE guild_id = ?').get(guildId)?.c || 0;

  res.render('dashboard', { guild: userGuild, cfg, badWords, linkFilter, inviteFilter, caseCount, warnCount, pageTitle: userGuild.name + ' — Dashboard', active: '' });
});

app.get('/dashboard/:guildId/modlogs', requireAuth, (req, res) => {
  const { guildId } = req.params;
  const userGuild = req.user.guilds.find(g => g.id === guildId);
  if (!userGuild) return res.redirect('/guilds');

  const page = parseInt(req.query.page) || 0;
  const perPage = 20;
  const cases = db.prepare('SELECT * FROM mod_cases WHERE guild_id = ? ORDER BY case_number DESC LIMIT ? OFFSET ?').all(guildId, perPage, page * perPage);
  const total = db.prepare('SELECT COUNT(*) as c FROM mod_cases WHERE guild_id = ?').get(guildId)?.c || 0;

  res.render('modlogs', { guild: userGuild, cases, page, perPage, total, pageTitle: 'Mod Logs', active: '' });
});

// ─── API ─────────────────────────────────────────────
app.post('/api/:guildId/automod', requireAuth, (req, res) => {
  const { guildId } = req.params;
  const userGuild = req.user.guilds.find(g => g.id === guildId);
  if (!userGuild || !hasManageServer(userGuild)) return res.status(403).json({ error: 'Forbidden' });

  const { key, value } = req.body;
  const allowed = ['automod_enabled', 'automod_spam_rate', 'automod_spam_per', 'automod_spam_punishment', 'automod_warn_threshold', 'automod_warn_punishment'];
  if (!allowed.includes(key)) return res.status(400).json({ error: 'Invalid key' });

  db.setConfig(guildId, key, value);
  res.json({ success: true });
});

app.post('/api/:guildId/linkfilter', requireAuth, (req, res) => {
  const { guildId } = req.params;
  const userGuild = req.user.guilds.find(g => g.id === guildId);
  if (!userGuild || !hasManageServer(userGuild)) return res.status(403).json({ error: 'Forbidden' });

  const { enabled } = req.body;
  db.prepare('INSERT INTO automod_link_filter (guild_id, enabled) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET enabled = excluded.enabled').run(guildId, enabled ? 1 : 0);
  res.json({ success: true });
});

app.post('/api/:guildId/invitefilter', requireAuth, (req, res) => {
  const { guildId } = req.params;
  const userGuild = req.user.guilds.find(g => g.id === guildId);
  if (!userGuild || !hasManageServer(userGuild)) return res.status(403).json({ error: 'Forbidden' });

  const { enabled } = req.body;
  db.prepare('INSERT INTO automod_invite_filter (guild_id, enabled) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET enabled = excluded.enabled').run(guildId, enabled ? 1 : 0);
  res.json({ success: true });
});

app.post('/api/:guildId/welcome', requireAuth, (req, res) => {
  const { guildId } = req.params;
  const userGuild = req.user.guilds.find(g => g.id === guildId);
  if (!userGuild || !hasManageServer(userGuild)) return res.status(403).json({ error: 'Forbidden' });

  const allowed = ['welcome_message', 'leave_message'];
  const { key, value } = req.body;
  if (!allowed.includes(key)) return res.status(400).json({ error: 'Invalid key' });

  db.setConfig(guildId, key, value);
  res.json({ success: true });
});

// ─── Start ───────────────────────────────────────────
function start(client) {
  app.locals.client = client;
  const port = process.env.DASHBOARD_PORT || 3000;
  app.listen(port, () => console.log(`🌐 Dashboard running at http://localhost:${port}`));
}

module.exports = { start };
