const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS } = require('../../utils/embed');

const RATE_LIMIT_MS = 2000;
const rateLimit = new Map(); // userId -> lastClickTimestamp

const categories = [
  {
    name: '🔨 Moderation',
    fields: [
      { name: '/ban', value: 'Ban a user from the server' },
      { name: '/kick', value: 'Kick a member from the server' },
      { name: '/mute [duration]', value: 'Mute a member using the mute role' },
      { name: '/unmute', value: 'Unmute a member' },
      { name: '/timeout <duration>', value: 'Timeout a member (max 28 days)' },
      { name: '/untimeout', value: 'Remove a timeout from a member' },
      { name: '/warn', value: 'Warn a member' },
      { name: '/warnings list/clear/remove', value: 'Manage warnings for a user' },
      { name: '/purge <amount>', value: 'Bulk delete messages (1–100)' },
      { name: '/reason <case>', value: 'Update a mod case reason' },
      { name: '/modlog set/from/highscores', value: 'Manage the mod log channel' },
      { name: '/muterole create/set/update', value: 'Set up the mute role' },
    ],
  },
  {
    name: '🤖 AutoMod',
    fields: [
      { name: '/automod show', value: 'Show all automod settings' },
      { name: '/automod toggle', value: 'Enable or disable automod' },
      { name: '/automod spam <msgs> <secs>', value: 'Set spam rate limit' },
      { name: '/automod badword <word>', value: 'Add or remove a bad word' },
      { name: '/automod links', value: 'Filter all links' },
      { name: '/automod invites', value: 'Filter Discord invite links' },
      { name: '/automod media <channel>', value: 'Make a channel media-only' },
      { name: '/automod whitelist <target>', value: 'Exempt a role or channel' },
      { name: '/automod warnthreshold <n>', value: 'Auto-punish after X warnings' },
      { name: '/automod log <channel>', value: 'Set the automod log channel' },
    ],
  },
  {
    name: '📋 Logging',
    fields: [
      { name: '!log', value: 'Show current logging configuration' },
      { name: '!log channel #ch', value: 'Set the default log channel' },
      { name: '!log messagechannel #ch', value: 'Log channel for message events' },
      { name: '!log memberchannel #ch', value: 'Log channel for member events' },
      { name: '!log joinchannel #ch', value: 'Log channel for joins/leaves' },
      { name: '!log serverchannel #ch', value: 'Log channel for server updates' },
      { name: '!log voicechannel #ch', value: 'Log channel for voice events' },
      { name: '!log aio', value: 'Auto-create all 5 log channels in a category' },
      { name: '!log <event>', value: 'Toggle a specific event (e.g. `!log delete`)' },
      { name: '!log everything / nothing', value: 'Enable or disable all events' },
      { name: '!log ignore @user/#ch', value: 'Ignore from message logs' },
    ],
  },
  {
    name: '🛡️ Verification',
    fields: [
      { name: '/verify setup', value: 'Configure the verification system' },
      { name: '/verify toggle', value: 'Enable or disable verification' },
      { name: '/verify check @user', value: 'Check a user for ban evasion indicators' },
      { name: '/verify approve @user', value: 'Manually verify a member' },
      { name: '/verify watchlist add @user', value: 'Add a user ID to the ban evasion watchlist' },
      { name: '/verify watchlist remove @user', value: 'Remove a user from the watchlist' },
      { name: '/verify watchlist show', value: 'Show all watchlisted users' },
      { name: '/verify info', value: 'Show current verification settings' },
    ],
  },
  {
    name: '👋 Welcome',
    fields: [
      { name: '/welcome channel [#ch]', value: 'Set the welcome channel' },
      { name: '/welcome message <text>', value: 'Set the welcome message' },
      { name: '/welcome dm [text]', value: 'Set a welcome DM for new members' },
      { name: '/welcome leave', value: 'Set a leave channel and message' },
      { name: '/welcome test', value: 'Send a test welcome message' },
      { name: '/welcome show', value: 'Show current welcome settings' },
      { name: '', value: '**Variables:** `{user}` `{username}` `{server}` `{membercount}`' },
    ],
  },
  {
    name: '🎭 Reaction Roles',
    fields: [
      { name: '/reactionrole add <msgId> <emoji> <role>', value: 'Add a reaction role to a message' },
      { name: '/reactionrole remove <msgId> <emoji>', value: 'Remove a reaction role' },
      { name: '/reactionrole list', value: 'List all reaction roles' },
      { name: '/reactionrole clear <msgId>', value: 'Remove all reaction roles from a message' },
      { name: '!rr add <msgId> <emoji> @role', value: 'Prefix shortcut to add a reaction role' },
    ],
  },
  {
    name: '💡 Suggestions',
    fields: [
      { name: '/suggest <text>', value: 'Submit a suggestion' },
      { name: '/suggestion channel <#ch>', value: 'Set the suggestions channel' },
      { name: '/suggestion approve <msgId>', value: 'Approve a suggestion' },
      { name: '/suggestion deny <msgId>', value: 'Deny a suggestion' },
    ],
  },
  {
    name: '🏷️ Tags & 📈 XP',
    fields: [
      { name: '/tag create <name> <content>', value: 'Create a custom command' },
      { name: '/tag edit <name>', value: 'Edit a tag' },
      { name: '/tag delete <name>', value: 'Delete a tag' },
      { name: '/tag use <name>', value: 'Use a tag' },
      { name: '/tag list', value: 'List all tags' },
      { name: '!tagname', value: 'Use any tag directly as a prefix command' },
      { name: '/rank [user]', value: 'Check XP rank and level' },
      { name: '/leaderboard [page]', value: 'Show the top 10 XP leaderboard' },
    ],
  },
];

function buildEmbed(page) {
  const cat = categories[page];
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(cat.name)
    .setDescription(cat.fields.map(f => f.name ? `**${f.name}** — ${f.value}` : f.value).join('\n'))
    .setFooter({ text: `Page ${page + 1} of ${categories.length} • Use the buttons to navigate` })
    .setTimestamp();
}

function buildRow(page, userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`help_prev_${page}_${userId}`)
      .setLabel('◀ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`help_page_${page}_${userId}`)
      .setLabel(`${page + 1} / ${categories.length}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`help_next_${page}_${userId}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === categories.length - 1),
  );
}

async function handleButton(interaction) {
  const parts = interaction.customId.split('_');
  // customId format: help_prev/next/page_<currentPage>_<userId>
  const direction = parts[1];
  const currentPage = parseInt(parts[2]);
  const ownerId = parts[3];

  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: 'This help menu belongs to someone else. Use `/help` to open your own.', ephemeral: true });
  }

  if (direction === 'page') return; // disabled button, ignore

  // Rate limit check
  const last = rateLimit.get(interaction.user.id) || 0;
  if (Date.now() - last < RATE_LIMIT_MS) {
    return interaction.reply({ content: `Slow down! Wait ${((RATE_LIMIT_MS - (Date.now() - last)) / 1000).toFixed(1)}s.`, ephemeral: true });
  }
  rateLimit.set(interaction.user.id, Date.now());

  const newPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
  if (newPage < 0 || newPage >= categories.length) return;

  await interaction.update({
    embeds: [buildEmbed(newPage)],
    components: [buildRow(newPage, interaction.user.id)],
  });
}

module.exports = {
  name: 'help',
  handleButton,
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all bot commands with navigation'),

  async execute(interaction) {
    await interaction.reply({
      embeds: [buildEmbed(0)],
      components: [buildRow(0, interaction.user.id)],
      ephemeral: true,
    });
  },
};
