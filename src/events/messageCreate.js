const db = require('../database');
const { applyPunishment } = require('../utils/modAction');
const { logEmbed } = require('../utils/embed');
const { COLORS } = require('../utils/embed');

// XP level formula: xp needed = 5 * (level^2) + 50 * level + 100
function xpForLevel(level) {
  return 5 * level * level + 50 * level + 100;
}

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const cfg = db.getConfig(guildId);
    const prefix = cfg.prefix || process.env.PREFIX || '!';

    // --- XP System ---
    if (cfg.xp_enabled) {
      const now = Math.floor(Date.now() / 1000);
      let userData = db.prepare('SELECT * FROM user_xp WHERE guild_id = ? AND user_id = ?').get(guildId, message.author.id);
      if (!userData) {
        db.prepare('INSERT OR IGNORE INTO user_xp (guild_id, user_id) VALUES (?, ?)').run(guildId, message.author.id);
        userData = { xp: 0, level: 0, last_message: 0 };
      }
      const cooldown = cfg.xp_cooldown || 60;
      if (now - userData.last_message >= cooldown) {
        const gain = cfg.xp_per_message || 15;
        const newXp = (userData.xp || 0) + gain;
        let newLevel = userData.level || 0;
        while (newXp >= xpForLevel(newLevel)) newLevel++;
        newLevel--;
        db.prepare('UPDATE user_xp SET xp = ?, level = ?, last_message = ? WHERE guild_id = ? AND user_id = ?').run(newXp, newLevel, now, guildId, message.author.id);
        if (newLevel > (userData.level || 0)) {
          const lvlMsg = (cfg.level_up_message || 'Congratulations {user}, you leveled up to level **{level}**!')
            .replace('{user}', `<@${message.author.id}>`)
            .replace('{level}', newLevel);
          const lvlChannel = cfg.level_up_channel ? client.channels.cache.get(cfg.level_up_channel) : message.channel;
          if (lvlChannel) lvlChannel.send(lvlMsg).catch(() => {});
        }
      }
    }

    // --- Automod ---
    if (cfg.automod_enabled) {
      const isWhitelisted = db.prepare('SELECT 1 FROM automod_whitelist WHERE guild_id = ? AND target_id IN (?, ?)').get(
        guildId, message.channel.id, message.author.id
      );
      if (!isWhitelisted) {
        // Check if member has whitelisted role
        const member = message.member;
        const roleWhitelisted = member?.roles.cache.some(r =>
          db.prepare('SELECT 1 FROM automod_whitelist WHERE guild_id = ? AND target_id = ?').get(guildId, r.id)
        );

        if (!roleWhitelisted) {
          await runAutomod(client, message, cfg, guildId);
        }
      }
    }

    // --- Prefix Commands ---
    if (!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    const cmd = client.commands.get(commandName);
    if (!cmd || !cmd.prefixExecute) return;

    try {
      await cmd.prefixExecute(message, args);
    } catch (err) {
      console.error(err);
      message.reply('An error occurred.').catch(() => {});
    }
  },
};

async function runAutomod(client, message, cfg, guildId) {
  const content = message.content.toLowerCase();
  const member = message.member;
  if (!member) return;

  // Media-only channel check
  const isMediaOnly = db.prepare('SELECT 1 FROM automod_media_channels WHERE guild_id = ? AND channel_id = ?').get(guildId, message.channel.id);
  if (isMediaOnly) {
    const hasMedia = message.attachments.size > 0 || message.embeds.length > 0 ||
      /https?:\/\//i.test(message.content);
    if (!hasMedia) {
      await message.delete().catch(() => {});
      const warn = await message.channel.send(`${message.author}, this channel is media-only!`);
      setTimeout(() => warn.delete().catch(() => {}), 5000);
      return;
    }
  }

  // Bad words filter
  const badWords = db.prepare('SELECT * FROM automod_bad_words WHERE guild_id = ?').all(guildId);
  for (const entry of badWords) {
    if (content.includes(entry.word.toLowerCase())) {
      await message.delete().catch(() => {});
      await sendAutomodLog(client, guildId, message, `Bad word detected: \`${entry.word}\``);
      await applyPunishment(client, message.guild, member, entry.punishment || 'warn', `Bad word: ${entry.word}`, null);
      return;
    }
  }

  // Invite filter
  const inviteFilter = db.prepare('SELECT * FROM automod_invite_filter WHERE guild_id = ?').get(guildId);
  if (inviteFilter?.enabled && /discord\.gg\/|discord\.com\/invite\//i.test(message.content)) {
    await message.delete().catch(() => {});
    await sendAutomodLog(client, guildId, message, 'Discord invite posted');
    await applyPunishment(client, message.guild, member, inviteFilter.punishment || 'delete,warn', 'Posted Discord invite', null);
    return;
  }

  // Link filter
  const linkFilter = db.prepare('SELECT * FROM automod_link_filter WHERE guild_id = ?').get(guildId);
  if (linkFilter?.enabled && /https?:\/\//i.test(message.content)) {
    await message.delete().catch(() => {});
    await sendAutomodLog(client, guildId, message, 'Link posted');
    await applyPunishment(client, message.guild, member, linkFilter.punishment || 'delete', 'Posted a link', null);
    return;
  }

  // Spam check
  if (cfg.automod_spam_rate > 0 && cfg.automod_spam_per > 0) {
    const key = `${guildId}-${message.author.id}`;
    const now = Date.now();
    const window = cfg.automod_spam_per * 1000;
    let spam = client.spamMap.get(key) || { timestamps: [] };
    spam.timestamps = spam.timestamps.filter(t => now - t < window);
    spam.timestamps.push(now);
    client.spamMap.set(key, spam);
    if (spam.timestamps.length > cfg.automod_spam_rate) {
      await message.delete().catch(() => {});
      await sendAutomodLog(client, guildId, message, `Spam (${spam.timestamps.length} msgs/${cfg.automod_spam_per}s)`);
      await applyPunishment(client, message.guild, member, cfg.automod_spam_punishment || 'delete', 'Spamming', null);
    }
  }
}

async function sendAutomodLog(client, guildId, message, reason) {
  const cfg = db.getConfig(guildId);
  const channelId = cfg.automod_log_channel || cfg.log_channel;
  if (!channelId) return;
  const channel = client.channels.cache.get(channelId);
  if (!channel) return;
  const embed = logEmbed('AutoMod Action', `**User:** ${message.author.tag} (${message.author.id})\n**Channel:** <#${message.channel.id}>\n**Reason:** ${reason}\n**Message:** ${message.content.slice(0, 500) || '*(empty)*'}`, COLORS.warn);
  channel.send({ embeds: [embed] }).catch(() => {});
}
