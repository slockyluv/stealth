import type { Client } from 'discord.js';
import { ready } from './ready.js';
import { interactionCreate } from './interactionCreate.js';

export function registerEvents(client: Client) {
  client.once('clientReady', ready);
  client.on('interactionCreate', interactionCreate);
}