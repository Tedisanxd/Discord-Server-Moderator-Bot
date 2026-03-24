const { logEvent } = require('../utils/logEvent');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embed');
const db = require('../database');

module.exports = {
  name: 'guildBanAdd',
  async execute(client, ban) {
    // Track banned user for ban evasion detection
    db.prepare(`INSERT OR REPLACE INTO banned_users
      (guild_id, user_id, user_tag, account_created_at, banned_at, reason)
      VALUES (?,?,?,?,?,?)
    `).run(
      ban.guild.id,
      ban.user.id,
      ban.user.tag,
      ban.user.createdTimestamp,
      Date.now(),
      ban.reason || 'No reason provided'
    );

    const embed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setTitle('Member Banned')
      .setThumbnail(ban.user.displayAvatarURL())
      .addFields(
        { name: 'User', value: `${ban.user.tag} (${ban.user.id})` },
        { name: 'Reason', value: ban.reason || 'No reason provided' }
      )
      .setTimestamp();

    await logEvent(client, ban.guild.id, 'ban', embed);
  },
};
