const db = require('../database');
const { logEvent } = require('../utils/logEvent');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embed');

function formatWelcome(template, member) {
  return template
    .replace(/{user}/g, `<@${member.id}>`)
    .replace(/{username}/g, member.user.username)
    .replace(/{server}/g, member.guild.name)
    .replace(/{membercount}/g, member.guild.memberCount);
}

module.exports = {
  name: 'guildMemberAdd',
  async execute(client, member) {
    const cfg = db.getConfig(member.guild.id);
    const guildId = member.guild.id;

    // --- Ban Evasion / Verification Check ---
    const verifyCfg = db.prepare('SELECT * FROM verification_config WHERE guild_id = ?').get(guildId);
    if (verifyCfg) {
      const isBanned = db.prepare('SELECT * FROM banned_users WHERE guild_id = ? AND user_id = ?').get(guildId, member.id);
      const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
      const alertChannelId = verifyCfg.alert_channel_id;

      // Auto-ban if ID is on watchlist and autoban is enabled
      if (isBanned && verifyCfg.autoban_previous && verifyCfg.enabled) {
        await member.ban({ reason: `Ban evasion — previously banned: ${isBanned.reason}` }).catch(() => {});
        if (alertChannelId) {
          const ch = member.guild.channels.cache.get(alertChannelId);
          if (ch) {
            const embed = new EmbedBuilder()
              .setColor(COLORS.error)
              .setTitle('🚨 Ban Evasion Detected — Auto-Banned')
              .addFields(
                { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
                { name: 'Account Age', value: `${accountAgeDays} days`, inline: true },
                { name: 'Original Ban Reason', value: isBanned.reason || 'No reason' },
              )
              .setThumbnail(member.user.displayAvatarURL())
              .setTimestamp();
            ch.send({ embeds: [embed] }).catch(() => {});
          }
        }
        return; // Stop here — member was banned
      }

      // Flag suspicious accounts (new account or on watchlist) without auto-banning
      if (verifyCfg.enabled && (isBanned || accountAgeDays < verifyCfg.min_account_age_days)) {
        if (alertChannelId) {
          const ch = member.guild.channels.cache.get(alertChannelId);
          if (ch) {
            const flags = [];
            if (isBanned) flags.push(`🚨 ID matches watchlisted user: **${isBanned.reason}**`);
            if (accountAgeDays < verifyCfg.min_account_age_days) flags.push(`⚠️ Account is only **${accountAgeDays}** day(s) old`);

            const embed = new EmbedBuilder()
              .setColor(isBanned ? COLORS.error : COLORS.warn)
              .setTitle(isBanned ? '🚨 Possible Ban Evasion' : '⚠️ Suspicious Account Joined')
              .addFields(
                { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
                { name: 'Account Age', value: `${accountAgeDays} days`, inline: true },
                { name: 'Flags', value: flags.join('\n') },
              )
              .setThumbnail(member.user.displayAvatarURL())
              .setFooter({ text: 'Use /verify approve @user or /verify watchlist add to take action' })
              .setTimestamp();
            ch.send({ embeds: [embed] }).catch(() => {});
          }
        }

        // Assign unverified role if configured
        if (verifyCfg.unverified_role_id) {
          await member.roles.add(verifyCfg.unverified_role_id).catch(() => {});
        }
      } else if (verifyCfg.enabled && verifyCfg.unverified_role_id) {
        // Assign unverified role to all new members if verification is on
        await member.roles.add(verifyCfg.unverified_role_id).catch(() => {});
      }
    }

    // --- Welcome Message ---
    if (cfg.welcome_channel) {
      const channel = member.guild.channels.cache.get(cfg.welcome_channel);
      if (channel) {
        const msg = formatWelcome(cfg.welcome_message || 'Welcome {user}!', member);
        channel.send(msg).catch(() => {});
      }
    }

    // --- Welcome DM ---
    if (cfg.welcome_dm) {
      const msg = formatWelcome(cfg.welcome_dm, member);
      member.send(msg).catch(() => {});
    }

    // --- Log Join ---
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('Member Joined')
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: 'User', value: `${member.user.tag} (${member.id})` },
        { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>` },
        { name: 'Member Count', value: String(member.guild.memberCount) }
      )
      .setTimestamp();

    await logEvent(client, member.guild.id, 'join', embed);
  },
};
