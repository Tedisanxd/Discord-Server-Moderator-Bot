const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { successEmbed, errorEmbed } = require('../../utils/embed');

module.exports = {
  name: 'reason',
  data: new SlashCommandBuilder()
    .setName('reason')
    .setDescription('Update the reason for a mod case')
    .addIntegerOption(o => o.setName('case').setDescription('Case number').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('New reason').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const caseNum = interaction.options.getInteger('case');
    const reason = interaction.options.getString('reason');
    const guildId = interaction.guild.id;

    const modCase = db.prepare('SELECT * FROM mod_cases WHERE guild_id = ? AND case_number = ?').get(guildId, caseNum);
    if (!modCase) return interaction.reply({ embeds: [errorEmbed(`Case #${caseNum} not found.`)], ephemeral: true });

    db.prepare('UPDATE mod_cases SET reason = ? WHERE guild_id = ? AND case_number = ?').run(reason, guildId, caseNum);

    // Update modlog embed if possible
    const cfg = db.getConfig(guildId);
    if (cfg.modlog_channel && modCase.message_id) {
      const ch = interaction.guild.channels.cache.get(cfg.modlog_channel);
      if (ch) {
        const msg = await ch.messages.fetch(modCase.message_id).catch(() => null);
        if (msg?.embeds?.[0]) {
          const embed = EmbedBuilder.from(msg.embeds[0]);
          const fields = embed.data.fields?.map(f => f.name === 'Reason' ? { ...f, value: reason } : f) || [];
          embed.setFields(fields);
          await msg.edit({ embeds: [embed] }).catch(() => {});
        }
      }
    }

    await interaction.reply({ embeds: [successEmbed(`Case #${caseNum} reason updated.`)] });
  },

  async prefixExecute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.reply({ embeds: [errorEmbed('Missing **Moderate Members** permission.')] });
    const caseNum = parseInt(args[0]);
    const reason = args.slice(1).join(' ');
    if (isNaN(caseNum) || !reason) return message.reply({ embeds: [errorEmbed('Usage: `!reason <case_id> <reason>`')] });
    const modCase = db.prepare('SELECT * FROM mod_cases WHERE guild_id = ? AND case_number = ?').get(message.guild.id, caseNum);
    if (!modCase) return message.reply({ embeds: [errorEmbed(`Case #${caseNum} not found.`)] });
    db.prepare('UPDATE mod_cases SET reason = ? WHERE guild_id = ? AND case_number = ?').run(reason, message.guild.id, caseNum);
    message.reply({ embeds: [successEmbed(`Case #${caseNum} reason updated.`)] });
  },
};
