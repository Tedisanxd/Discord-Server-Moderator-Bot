const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, OverwriteType } = require('discord.js');
const db = require('../../database');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'muterole',
  data: new SlashCommandBuilder()
    .setName('muterole')
    .setDescription('Manage the mute role')
    .addSubcommand(s => s.setName('create').setDescription('Create a mute role').addStringOption(o => o.setName('name').setDescription('Role name').setRequired(false)))
    .addSubcommand(s => s.setName('set').setDescription('Set existing role as mute role').addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand(s => s.setName('update').setDescription('Update mute role permissions in all channels'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    await interaction.deferReply();

    if (sub === 'create') {
      const name = interaction.options.getString('name') || 'Muted';
      const role = await interaction.guild.roles.create({ name, reason: 'Mute role created by bot' });
      // Apply to all text channels
      for (const [, ch] of interaction.guild.channels.cache) {
        if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildVoice) {
          await ch.permissionOverwrites.create(role, { SendMessages: false, Speak: false, AddReactions: false }).catch(() => {});
        }
      }
      db.setConfig(guildId, 'muterole_id', role.id);
      return interaction.editReply({ embeds: [successEmbed(`Created mute role **${name}** and applied permissions.`)] });
    }

    if (sub === 'set') {
      const role = interaction.options.getRole('role');
      db.setConfig(guildId, 'muterole_id', role.id);
      return interaction.editReply({ embeds: [successEmbed(`Set <@&${role.id}> as the mute role.`)] });
    }

    if (sub === 'update') {
      const cfg = db.getConfig(guildId);
      if (!cfg.muterole_id) return interaction.editReply({ embeds: [errorEmbed('No mute role configured.')] });
      const role = interaction.guild.roles.cache.get(cfg.muterole_id);
      if (!role) return interaction.editReply({ embeds: [errorEmbed('Mute role not found.')] });
      for (const [, ch] of interaction.guild.channels.cache) {
        if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildVoice) {
          await ch.permissionOverwrites.create(role, { SendMessages: false, Speak: false, AddReactions: false }).catch(() => {});
        }
      }
      return interaction.editReply({ embeds: [successEmbed('Updated mute role permissions in all channels.')] });
    }
  },
};
