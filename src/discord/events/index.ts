import { Events, type Client } from 'discord.js';
import { ready } from './ready.js';
import { interactionCreate } from './interactionCreate.js';
import { guildMemberAdd } from './guildMemberAdd.js';
import { messageCreate } from './messageCreate.js';

export function registerEvents(client: Client) {
  client.once(Events.ClientReady, ready);
  client.on(Events.InteractionCreate, interactionCreate);
  client.on(Events.GuildMemberAdd, guildMemberAdd);
  client.on(Events.MessageCreate, messageCreate);
}