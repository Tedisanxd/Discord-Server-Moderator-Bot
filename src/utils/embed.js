const { EmbedBuilder } = require('discord.js');

const COLORS = {
  success: 0x57F287,
  error: 0xED4245,
  warn: 0xFEE75C,
  info: 0x5865F2,
  log: 0x2F3136,
};

function successEmbed(description, title) {
  const e = new EmbedBuilder().setColor(COLORS.success).setDescription(description);
  if (title) e.setTitle(title);
  return e;
}

function errorEmbed(description) {
  return new EmbedBuilder().setColor(COLORS.error).setDescription(`❌ ${description}`);
}

function infoEmbed(description, title) {
  const e = new EmbedBuilder().setColor(COLORS.info).setDescription(description);
  if (title) e.setTitle(title);
  return e;
}

function logEmbed(title, description, color) {
  return new EmbedBuilder()
    .setColor(color || COLORS.log)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function modEmbed(type, user, moderator, reason, extra) {
  const colors = {
    ban: 0xED4245, kick: 0xFEE75C, mute: 0xFEE75C, warn: 0xFEE75C,
    timeout: 0xFEE75C, unban: 0x57F287, unmute: 0x57F287, untimeout: 0x57F287,
  };
  const e = new EmbedBuilder()
    .setColor(colors[type] || 0x5865F2)
    .setTitle(`${type.charAt(0).toUpperCase() + type.slice(1)}`)
    .addFields(
      { name: 'User', value: `${user.tag || user} (${user.id || user})`, inline: true },
      { name: 'Moderator', value: `${moderator.tag || moderator} (${moderator.id || moderator})`, inline: true },
      { name: 'Reason', value: reason || 'No reason provided' }
    )
    .setTimestamp();
  if (extra) {
    for (const [name, value] of Object.entries(extra)) {
      e.addFields({ name, value: String(value), inline: true });
    }
  }
  return e;
}

module.exports = { successEmbed, errorEmbed, infoEmbed, logEmbed, modEmbed, COLORS };
