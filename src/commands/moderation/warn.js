const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { createCase, checkWarnThreshold } = require('../../utils/modAction');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'warn',
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(o => o.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for warning'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!target) return interaction.reply({ embeds: [errorEmbed('User not found.')], ephemeral: true });

    db.prepare('INSERT INTO warnings (guild_id, user_id, moderator_id, reason, timestamp) VALUES (?,?,?,?,?)').run(
      interaction.guild.id, target.id, interaction.user.id, reason, Date.now()
    );
    const count = db.prepare('SELECT COUNT(*) as c FROM warnings WHERE guild_id = ? AND user_id = ?').get(interaction.guild.id, target.id).c;
    await createCase(interaction.client, interaction.guild, 'warn', target.user, interaction.user, reason);
    await checkWarnThreshold(interaction.client, interaction.guild, target, interaction.user);

    try { await target.send(`You have been warned in **${interaction.guild.name}**.\n**Reason:** ${reason}\n**Total warnings:** ${count}`); } catch {}
    await interaction.reply({ embeds: [successEmbed(`**${target.user.tag}** warned. They now have **${count}** warning(s).\n**Reason:** ${reason}`)] });
  },

  async prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply({ embeds: [errorEmbed('Missing **Moderate Members** permission.')] });

    const target = message.mentions.members.first();
    if (!target) return message.reply({ embeds: [errorEmbed('Mention a member to warn.')] });
    const reason = args.slice(1).join(' ') || 'No reason provided';

    db.prepare('INSERT INTO warnings (guild_id, user_id, moderator_id, reason, timestamp) VALUES (?,?,?,?,?)').run(
      message.guild.id, target.id, message.author.id, reason, Date.now()
    );
    const count = db.prepare('SELECT COUNT(*) as c FROM warnings WHERE guild_id = ? AND user_id = ?').get(message.guild.id, target.id).c;
    await createCase(message.client, message.guild, 'warn', target.user, message.author, reason);
    await checkWarnThreshold(message.client, message.guild, target, message.author);

    try { await target.send(`You have been warned in **${message.guild.name}**.\n**Reason:** ${reason}\n**Total warnings:** ${count}`); } catch {}
    message.reply({ embeds: [successEmbed(`**${target.user.tag}** warned. They now have **${count}** warning(s).\n**Reason:** ${reason}`)] });
  },
};
