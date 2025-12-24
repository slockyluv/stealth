import { Events, type Client } from 'discord.js';
import { ready } from './ready.js';
import { interactionCreate } from './interactionCreate.js';
import { guildMemberAdd } from './guildMemberAdd.js';
import { messageCreate } from './messageCreate.js';
import { messageUpdate } from './messageUpdate.js';
import { messageDelete } from './messageDelete.js';
import { guildBanAdd } from './guildBanAdd.js';
import { guildBanRemove } from './guildBanRemove.js';
import { guildMemberRemove } from './guildMemberRemove.js';
import { guildMemberUpdate } from './guildMemberUpdate.js';
import { inviteCreate } from './inviteCreate.js';
import { inviteDelete } from './inviteDelete.js';

export function registerEvents(client: Client) {
  client.once(Events.ClientReady, ready);
  client.on(Events.InteractionCreate, interactionCreate);
  client.on(Events.GuildMemberAdd, guildMemberAdd);
  client.on(Events.MessageCreate, messageCreate);
  client.on(Events.MessageUpdate, messageUpdate);
  client.on(Events.MessageDelete, messageDelete);
  client.on(Events.GuildBanAdd, guildBanAdd);
  client.on(Events.GuildBanRemove, guildBanRemove);
  client.on(Events.GuildMemberRemove, guildMemberRemove);
  client.on(Events.GuildMemberUpdate, guildMemberUpdate);
  client.on(Events.InviteCreate, inviteCreate);
  client.on(Events.InviteDelete, inviteDelete);
}