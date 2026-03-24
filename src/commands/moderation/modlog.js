const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embed');

module.exports = {
  name: 'modlog',
  data: new SlashCommandBuilder()
    .setName('modlog')
    .setDescription('Manage the mod log channel')
    .addSubcommand(s => s.setName('set').setDescription('Set modlog channel').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)))
    .addSubcommand(s => s.setName('clear').setDescription('Clear the modlog channel'))
    .addSubcommand(s => s.setName('from').setDescription('View cases for a user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(s => s.setName('highscores').setDescription('Top moderators by case count'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'set') {
      const channel = interaction.options.getChannel('channel');
      db.setConfig(guildId, 'modlog_channel', channel.id);
      return interaction.reply({ embeds: [successEmbed(`Modlog channel set to <#${channel.id}>.`)] });
    }

    if (sub === 'clear') {
      db.setConfig(guildId, 'modlog_channel', null);
      return interaction.reply({ embeds: [successEmbed('Modlog channel cleared.')] });
    }

    if (sub === 'from') {
      const target = interaction.options.getUser('user');
      const cases = db.prepare('SELECT * FROM mod_cases WHERE guild_id = ? AND user_id = ? ORDER BY case_number DESC LIMIT 20').all(guildId, target.id);
      if (!cases.length) return interaction.reply({ embeds: [infoEmbed(`No cases found for **${target.tag}**.`)], ephemeral: true });
      const lines = cases.map(c => `**Case #${c.case_number}** [${c.type}] — ${c.reason} — <@${c.moderator_id}>`);
      return interaction.reply({ embeds: [infoEmbed(lines.join('\n').slice(0, 4096), `Cases for ${target.tag}`)] });
    }

    if (sub === 'highscores') {
      const rows = db.prepare(`
        SELECT moderator_id, moderator_tag, COUNT(*) as count
        FROM mod_cases WHERE guild_id = ?
        GROUP BY moderator_id ORDER BY count DESC LIMIT 10
      `).all(guildId);
      if (!rows.length) return interaction.reply({ embeds: [infoEmbed('No mod actions recorded yet.')], ephemeral: true });
      const lines = rows.map((r, i) => `${i + 1}. **${r.moderator_tag}** — ${r.count} actions`);
      return interaction.reply({ embeds: [infoEmbed(lines.join('\n'), 'Moderator Highscores')] });
    }
  },

  async prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.reply({ embeds: [errorEmbed('Missing **Manage Server** permission.')] });

    const sub = args[0]?.toLowerCase();
    const guildId = message.guild.id;

    if (sub === 'set') {
      const ch = message.mentions.channels.first();
      if (!ch) return message.reply({ embeds: [errorEmbed('Mention a channel.')] });
      db.setConfig(guildId, 'modlog_channel', ch.id);
      return message.reply({ embeds: [successEmbed(`Modlog set to <#${ch.id}>.`)] });
    }
    if (sub === 'clear') {
      db.setConfig(guildId, 'modlog_channel', null);
      return message.reply({ embeds: [successEmbed('Modlog channel cleared.')] });
    }
    if (sub === 'from') {
      const target = message.mentions.users.first();
      if (!target) return message.reply({ embeds: [errorEmbed('Mention a user.')] });
      const cases = db.prepare('SELECT * FROM mod_cases WHERE guild_id = ? AND user_id = ? ORDER BY case_number DESC LIMIT 20').all(guildId, target.id);
      if (!cases.length) return message.reply({ embeds: [infoEmbed(`No cases for **${target.tag}**.`)] });
      const lines = cases.map(c => `**Case #${c.case_number}** [${c.type}] — ${c.reason} — <@${c.moderator_id}>`);
      return message.reply({ embeds: [infoEmbed(lines.join('\n').slice(0, 4096), `Cases for ${target.tag}`)] });
    }
    message.reply({ embeds: [errorEmbed('Usage: `!modlog set #channel | clear | from @user`')] });
  },
};
