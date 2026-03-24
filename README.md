# Discord-Server-Moderator-Bot
Discord Server Moderator Bot pretty mid but oh well
Put the bot info in .env file the website is run on local host 3000 feel free to use this code however you want and good luck
# Advanced Discord Bot

A feature-rich Discord bot built with discord.js v14.

---

## 🔨 Moderation

| Command | Permission | Description |
|---------|-----------|-------------|
| `/ban <user> [reason] [delete_days]` | Ban Members | Ban a user from the server |
| `/kick <user> [reason]` | Kick Members | Kick a member from the server |
| `/mute <user> [duration] [reason]` | Moderate Members | Mute a member using the mute role (e.g. duration: `1h`, `1d`) |
| `/unmute <user> [reason]` | Moderate Members | Remove the mute role from a member |
| `/timeout <user> <duration> [reason]` | Moderate Members | Timeout a member (max 28 days) |
| `/untimeout <user> [reason]` | Moderate Members | Remove a timeout from a member |
| `/warn <user> [reason]` | Moderate Members | Warn a member |
| `/warnings list <user>` | — | View all warnings for a user |
| `/warnings clear <user>` | Moderate Members | Clear all warnings for a user |
| `/warnings remove <id>` | Moderate Members | Remove a specific warning by ID |
| `/purge <amount> [user]` | Manage Messages | Bulk delete messages (1–100), optionally filter by user |
| `/reason <case> <reason>` | Moderate Members | Update the reason for a mod log case |
| `/modlog set <channel>` | Manage Server | Set the channel where mod actions are logged |
| `/modlog clear` | Manage Server | Stop logging mod actions |
| `/modlog from <user>` | Manage Server | View all mod cases for a specific user |
| `/modlog highscores` | Manage Server | Show top moderators by action count |
| `/muterole create [name]` | Manage Server | Create a mute role and apply it to all channels |
| `/muterole set <role>` | Manage Roles | Set an existing role as the mute role |
| `/muterole update` | Manage Server | Reapply mute role permissions to all channels |

**Prefix aliases:** `!ban`, `!kick`, `!mute`, `!unmute`, `!warn`, `!warnings`, `!purge` / `!clear`, `!timeout`, `!untimeout`, `!reason`, `!modlog`

---

## 🤖 AutoMod

| Command | Permission | Description |
|---------|-----------|-------------|
| `/automod show` | Manage Server | Show all current automod settings |
| `/automod toggle` | Manage Server | Enable or disable automod entirely |
| `/automod log <channel>` | Manage Server | Set the channel where automod actions are logged |
| `/automod spam <messages> <seconds> [punishment]` | Manage Server | Set spam rate limit (e.g. 5 messages per 10 seconds) |
| `/automod badword <word> <add/remove> [punishment]` | Manage Server | Add or remove a banned word |
| `/automod links <enable/disable> [punishment]` | Manage Server | Filter all links |
| `/automod invites <enable/disable>` | Manage Server | Filter Discord invite links |
| `/automod media <channel> <add/remove>` | Manage Server | Restrict a channel to media/links only |
| `/automod whitelist <target> <add/remove>` | Manage Server | Exempt a role or channel from automod |
| `/automod warnthreshold <limit> [punishment]` | Manage Server | Auto-punish when a user reaches X warnings |

**Punishment options:** `delete`, `warn`, `kick`, `ban`, `timeout <duration>`, `mute`, `tempmute <duration>`, `tempban <duration>` — combine with commas e.g. `delete,warn`

**Prefix aliases:** `!automod` / `!am` with subcommands `wl`, `unwl`, `mo`, `umo`, `warn`, `wp`

---

## 📋 Logging

All logging commands use the `!log` prefix.

| Command | Permission | Description |
|---------|-----------|-------------|
| `!log` | Manage Server | Show current logging configuration |
| `!log channel #ch` | Manage Server | Set the default fallback log channel |
| `!log messagechannel #ch` | Manage Server | Set channel for message events (delete, edit, purge) |
| `!log memberchannel #ch` | Manage Server | Set channel for member events (roles, bans, timeouts) |
| `!log joinchannel #ch` | Manage Server | Set channel for join/leave events |
| `!log serverchannel #ch` | Manage Server | Set channel for server events (channels, roles, emoji) |
| `!log voicechannel #ch` | Manage Server | Set channel for voice events |
| `!log aio` | Manage Server | Auto-create a "logs" category with 5 pre-configured channels |
| `!log <event>` | Manage Server | Toggle a specific event on/off (see list below) |
| `!log everything` | Manage Server | Enable all log events |
| `!log nothing` | Manage Server | Disable all log events |
| `!log default` | Manage Server | Reset to default events |
| `!log ignore @user/#ch` | Manage Server | Ignore a user or channel from message logs |
| `!log unignore @user/#ch` | Manage Server | Stop ignoring a user or channel |
| `!log ip <prefix>` | Manage Server | Ignore messages starting with a prefix from logs |
| `!log up <prefix>` | Manage Server | Remove an ignored prefix |
| `!log export` | Manage Server | Export current log settings as JSON |

### Loggable Events

| Event | What It Logs |
|-------|-------------|
| `delete` | Deleted messages |
| `edit` | Edited messages |
| `purge` | Bulk message deletions |
| `discord` | Discord invite links posted |
| `role` | Member role changes |
| `avatar` | Avatar updates |
| `ban` | Bans |
| `unban` | Unbans |
| `join` | Members joining |
| `leave` | Members leaving |
| `name` | Nickname changes |
| `timeout` | Timeouts applied |
| `removetimeout` | Timeouts removed |
| `channelcreate` | Channel created |
| `channelupdate` | Channel updated |
| `channeldelete` | Channel deleted |
| `rolecreate` | Role created |
| `roleupdate` | Role updated |
| `roledelete` | Role deleted |
| `emoji` | Emoji created/deleted |
| `server` | Server settings updated |
| `voicejoin` | Member joined voice channel |
| `voicemove` | Member moved voice channels |
| `voiceleave` | Member left voice channel |

---

## 👋 Welcome

| Command | Permission | Description |
|---------|-----------|-------------|
| `/welcome show` | Manage Server | Show current welcome settings |
| `/welcome channel [#ch]` | Manage Server | Set the welcome channel (leave empty to disable) |
| `/welcome message <text>` | Manage Server | Set the welcome message |
| `/welcome dm [text]` | Manage Server | Set a DM sent to new members (leave empty to disable) |
| `/welcome leave [#ch] [text]` | Manage Server | Set a leave message and channel |
| `/welcome test` | Manage Server | Send a test welcome message |

**Message variables:** `{user}` mention, `{username}` plain name, `{server}` server name, `{membercount}` member count

**Prefix aliases:** `!welcome channel`, `!welcome message`, `!welcome leave`

---

## 🎭 Reaction Roles

| Command | Permission | Description |
|---------|-----------|-------------|
| `/reactionrole add <message_id> <emoji> <role> [channel]` | Manage Roles | Add a reaction role to a message |
| `/reactionrole remove <message_id> <emoji>` | Manage Roles | Remove a reaction role |
| `/reactionrole list` | Manage Roles | List all reaction roles in the server |
| `/reactionrole clear <message_id>` | Manage Roles | Remove all reaction roles from a message |

**Prefix aliases:** `!rr add <msgId> <emoji> @role`, `!rr list`

---

## 💡 Suggestions

| Command | Permission | Description |
|---------|-----------|-------------|
| `/suggest <text>` | — | Submit a suggestion to the suggestions channel |
| `/suggestion channel <#ch>` | Manage Server | Set the suggestions channel |
| `/suggestion approve <message_id> [response]` | Manage Server | Approve a suggestion |
| `/suggestion deny <message_id> [response]` | Manage Server | Deny a suggestion |

**Prefix aliases:** `!suggest <text>`, `!suggestion channel #ch`

---

## 🏷️ Custom Commands (Tags)

| Command | Permission | Description |
|---------|-----------|-------------|
| `/tag create <name> <content>` | Manage Server | Create a custom command |
| `/tag edit <name> <content>` | Manage Server | Edit an existing tag |
| `/tag delete <name>` | Manage Server | Delete a tag |
| `/tag use <name>` | — | Use a tag |
| `/tag list` | — | List all tags in the server |
| `/tag info <name>` | — | View tag info (creator, uses, created date) |

**Shortcut:** Once created, any tag can be used as `!tagname` directly.

**Prefix aliases:** `!tag create/delete/list/<name>`, `!t`, `!tags`

---

## 📈 Engagement (XP System)

Members earn XP by sending messages (default: 15 XP per message, 60s cooldown between gains).

| Command | Permission | Description |
|---------|-----------|-------------|
| `/rank [user]` | — | Check your or someone else's level, XP, and rank |
| `/leaderboard [page]` | — | Show the top 10 XP leaderboard |

**Prefix aliases:** `!rank`, `!lb` / `!top` / `!leaderboard`

---

## ⚙️ Setup Checklist

1. `!log aio` — create log channels
2. `/welcome channel #welcome` — set welcome channel
3. `/suggestion channel #suggestions` — set suggestions channel
4. `/muterole create` — create mute role
5. `/automod toggle` — enable automod
6. `/modlog set #mod-logs` — set mod log channel
