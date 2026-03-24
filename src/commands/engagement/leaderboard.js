const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database');
const { infoEmbed } = require('../../utils/embed');

module.exports = {
  name: 'leaderboard',
  aliases: ['lb', 'top'],
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the XP leaderboard')
    .addIntegerOption(o => o.setName('page').setDescription('Page number').setMinValue(1)),

  async execute(interaction) {
    const page = (interaction.options.getInteger('page') || 1) - 1;
    const perPage = 10;
    const rows = db.prepare('SELECT * FROM user_xp WHERE guild_id = ? ORDER BY xp DESC LIMIT ? OFFSET ?').all(interaction.guild.id, perPage, page * perPage);
    if (!rows.length) return interaction.reply({ embeds: [infoEmbed('No XP data yet. Start chatting!')], ephemeral: true });

    const lines = await Promise.all(rows.map(async (r, i) => {
      const user = await interaction.client.users.fetch(r.user_id).catch(() => null);
      return `${page * perPage + i + 1}. **${user?.username || r.user_id}** — Level ${r.level} (${r.xp} XP)`;
    }));

    await interaction.reply({ embeds: [infoEmbed(lines.join('\n'), `🏆 Leaderboard — Page ${page + 1}`)] });
  },

  async prefixExecute(message, args) {
    const page = (parseInt(args[0]) || 1) - 1;
    const perPage = 10;
    const rows = db.prepare('SELECT * FROM user_xp WHERE guild_id = ? ORDER BY xp DESC LIMIT ? OFFSET ?').all(message.guild.id, perPage, page * perPage);
    if (!rows.length) return message.reply({ embeds: [infoEmbed('No XP data yet.')] });

    const lines = await Promise.all(rows.map(async (r, i) => {
      const user = await message.client.users.fetch(r.user_id).catch(() => null);
      return `${page * perPage + i + 1}. **${user?.username || r.user_id}** — Level ${r.level} (${r.xp} XP)`;
    }));

    message.reply({ embeds: [infoEmbed(lines.join('\n'), `🏆 Leaderboard — Page ${page + 1}`)] });
  },
};
