const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { infoEmbed, errorEmbed, successEmbed } = require('../../utils/embed');

module.exports = {
  name: 'warnings',
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View or manage warnings')
    .addSubcommand(s => s.setName('list').setDescription('List warnings for a user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(s => s.setName('clear').setDescription('Clear all warnings for a user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove a specific warning').addIntegerOption(o => o.setName('id').setDescription('Warning ID').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      const target = interaction.options.getUser('user');
      const warns = db.prepare('SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC').all(interaction.guild.id, target.id);
      if (!warns.length) return interaction.reply({ embeds: [infoEmbed(`**${target.tag}** has no warnings.`)], ephemeral: true });
      const lines = warns.map(w => `**#${w.id}** — ${w.reason} — <t:${Math.floor(w.timestamp / 1000)}:R> by <@${w.moderator_id}>`);
      return interaction.reply({ embeds: [infoEmbed(lines.join('\n').slice(0, 4096), `Warnings for ${target.tag} (${warns.length})`)] });
    }

    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return interaction.reply({ embeds: [errorEmbed('Missing **Moderate Members** permission.')], ephemeral: true });

    if (sub === 'clear') {
      const target = interaction.options.getUser('user');
      db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?').run(interaction.guild.id, target.id);
      return interaction.reply({ embeds: [successEmbed(`Cleared all warnings for **${target.tag}**.`)] });
    }

    if (sub === 'remove') {
      const id = interaction.options.getInteger('id');
      const warn = db.prepare('SELECT * FROM warnings WHERE id = ? AND guild_id = ?').get(id, interaction.guild.id);
      if (!warn) return interaction.reply({ embeds: [errorEmbed(`Warning #${id} not found.`)], ephemeral: true });
      db.prepare('DELETE FROM warnings WHERE id = ?').run(id);
      return interaction.reply({ embeds: [successEmbed(`Removed warning #${id}.`)] });
    }
  },

  async prefixExecute(message, args) {
    const target = message.mentions.users.first();
    if (!target) return message.reply({ embeds: [errorEmbed('Mention a user.')] });
    const warns = db.prepare('SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC').all(message.guild.id, target.id);
    if (!warns.length) return message.reply({ embeds: [infoEmbed(`**${target.tag}** has no warnings.`)] });
    const lines = warns.map(w => `**#${w.id}** — ${w.reason} — <t:${Math.floor(w.timestamp / 1000)}:R>`);
    message.reply({ embeds: [infoEmbed(lines.join('\n').slice(0, 4096), `Warnings for ${target.tag} (${warns.length})`)] });
  },
};
