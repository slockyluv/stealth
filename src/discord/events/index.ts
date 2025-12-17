import type { Client } from 'discord.js';
import { ready } from './ready.js';
import { interactionCreate } from './interactionCreate.js';
import { guildMemberAdd } from './guildMemberAdd.js';

export function registerEvents(client: Client) {
  client.once('ready', ready);
  client.on('interactionCreate', interactionCreate);
  client.on('guildMemberAdd', guildMemberAdd);
}