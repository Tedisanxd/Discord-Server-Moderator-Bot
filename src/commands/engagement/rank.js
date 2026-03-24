const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { infoEmbed, errorEmbed } = require('../../utils/embed');

function xpForLevel(level) {
  return 5 * level * level + 50 * level + 100;
}

module.exports = {
  name: 'rank',
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Check your or someone else\'s rank')
    .addUserOption(o => o.setName('user').setDescription('User to check')),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const data = db.prepare('SELECT * FROM user_xp WHERE guild_id = ? AND user_id = ?').get(interaction.guild.id, target.id);
    if (!data) return interaction.reply({ embeds: [errorEmbed(`${target.username} has no XP yet.`)], ephemeral: true });

    const rank = db.prepare('SELECT COUNT(*) as r FROM user_xp WHERE guild_id = ? AND xp > ?').get(interaction.guild.id, data.xp).r + 1;
    const needed = xpForLevel(data.level + 1);
    const progress = Math.floor((data.xp / needed) * 20);
    const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);

    const embed = infoEmbed(
      `**Rank:** #${rank}\n**Level:** ${data.level}\n**XP:** ${data.xp} / ${needed}\n\`[${bar}]\``,
      `${target.username}'s Rank`
    ).setThumbnail(target.displayAvatarURL());

    await interaction.reply({ embeds: [embed] });
  },

  async prefixExecute(message, args) {
    const target = message.mentions.users.first() || message.author;
    const data = db.prepare('SELECT * FROM user_xp WHERE guild_id = ? AND user_id = ?').get(message.guild.id, target.id);
    if (!data) return message.reply({ embeds: [errorEmbed(`${target.username} has no XP yet.`)] });

    const rank = db.prepare('SELECT COUNT(*) as r FROM user_xp WHERE guild_id = ? AND xp > ?').get(message.guild.id, data.xp).r + 1;
    const needed = xpForLevel(data.level + 1);
    const progress = Math.floor((data.xp / needed) * 20);
    const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);

    const embed = infoEmbed(
      `**Rank:** #${rank}\n**Level:** ${data.level}\n**XP:** ${data.xp} / ${needed}\n\`[${bar}]\``,
      `${target.username}'s Rank`
    ).setThumbnail(target.displayAvatarURL());

    message.reply({ embeds: [embed] });
  },
};
