const db = require('../database');
const { modEmbed } = require('./embed');
const { parseDuration, formatDuration } = require('./parseDuration');

async function createCase(client, guild, type, user, moderator, reason, duration) {
  const caseNum = db.nextCase(guild.id);
  const timestamp = Date.now();
  const durationStr = duration ? formatDuration(duration) : null;

  db.prepare(`
    INSERT INTO mod_cases (guild_id, case_number, type, user_id, user_tag, moderator_id, moderator_tag, reason, duration, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(guild.id, caseNum, type, user.id, user.tag, moderator.id, moderator.tag, reason || 'No reason provided', durationStr, timestamp);

  const cfg = db.getConfig(guild.id);
  if (cfg.modlog_channel) {
    const channel = client.channels.cache.get(cfg.modlog_channel);
    if (channel) {
      const embed = modEmbed(type, user, moderator, reason, durationStr ? { Duration: durationStr } : null);
      embed.setFooter({ text: `Case #${caseNum}` });
      try {
        const msg = await channel.send({ embeds: [embed] });
        db.prepare('UPDATE mod_cases SET message_id = ? WHERE guild_id = ? AND case_number = ?').run(msg.id, guild.id, caseNum);
      } catch {}
    }
  }

  return caseNum;
}

async function applyPunishment(client, guild, member, punishment, reason, moderator) {
  const punishments = punishment.split(',').map(p => p.trim().toLowerCase());
  for (const p of punishments) {
    try {
      if (p === 'delete') continue; // handled by caller
      if (p === 'warn') {
        db.prepare('INSERT INTO warnings (guild_id, user_id, moderator_id, reason, timestamp) VALUES (?,?,?,?,?)').run(guild.id, member.id, moderator?.id || 'automod', reason, Date.now());
        await checkWarnThreshold(client, guild, member, moderator);
      } else if (p === 'kick') {
        await member.kick(reason).catch(() => {});
        await createCase(client, guild, 'kick', member.user, moderator || { id: 'automod', tag: 'AutoMod' }, reason);
      } else if (p === 'ban') {
        await member.ban({ reason }).catch(() => {});
        await createCase(client, guild, 'ban', member.user, moderator || { id: 'automod', tag: 'AutoMod' }, reason);
      } else if (p.startsWith('tempmute ') || p.startsWith('mute')) {
        const durationStr = p.startsWith('tempmute ') ? p.slice(9) : null;
        const ms = durationStr ? parseDuration(durationStr) : null;
        const cfg = db.getConfig(guild.id);
        const muterole = cfg.muterole_id ? guild.roles.cache.get(cfg.muterole_id) : null;
        if (muterole) {
          await member.roles.add(muterole, reason).catch(() => {});
          if (ms) {
            db.prepare('INSERT INTO temp_punishments (guild_id, user_id, type, expires_at) VALUES (?,?,?,?)').run(guild.id, member.id, 'mute', Date.now() + ms);
          }
        }
      } else if (p.startsWith('timeout ') || p === 'timeout') {
        const durationStr = p.startsWith('timeout ') ? p.slice(8) : '10m';
        const ms = parseDuration(durationStr) || 10 * 60 * 1000;
        await member.timeout(ms, reason).catch(() => {});
      } else if (p.startsWith('tempban ')) {
        const durationStr = p.slice(8);
        const ms = parseDuration(durationStr);
        await member.ban({ reason }).catch(() => {});
        if (ms) {
          db.prepare('INSERT INTO temp_punishments (guild_id, user_id, type, expires_at) VALUES (?,?,?,?)').run(guild.id, member.id, 'ban', Date.now() + ms);
        }
        await createCase(client, guild, 'tempban', member.user, moderator || { id: 'automod', tag: 'AutoMod' }, reason, ms);
      }
    } catch {}
  }
}

async function checkWarnThreshold(client, guild, member, moderator) {
  const cfg = db.getConfig(guild.id);
  if (!cfg.automod_warn_threshold || cfg.automod_warn_threshold <= 0) return;
  const count = db.prepare('SELECT COUNT(*) as c FROM warnings WHERE guild_id = ? AND user_id = ?').get(guild.id, member.id).c;
  if (count >= cfg.automod_warn_threshold) {
    await applyPunishment(client, guild, member, cfg.automod_warn_punishment || 'kick', 'Reached warn threshold', moderator);
  }
}

module.exports = { createCase, applyPunishment, checkWarnThreshold };
