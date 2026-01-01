import { Client, GatewayIntentBits } from 'discord.js';
import { commands } from './commands/index.js';
import type { Command } from '../types/command.js';

import { buttonHandlers } from './components/buttons/index.js';
import { modalHandlers } from './components/modals/index.js';
import { selectMenuHandlers } from './components/selectMenus/index.js';

import type {
  ButtonHandler,
  ModalHandler,
  SelectMenuHandler
} from '../types/component.js';

export function createClient() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildInvites,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  client.commands = new Map<string, Command>();
  for (const command of commands) {
    client.commands.set(command.data.name, command);
  }

  client.buttons = new Map<string, ButtonHandler>();
  for (const h of buttonHandlers) {
    client.buttons.set(h.key, h);
  }

  client.modals = new Map<string, ModalHandler>();
  for (const h of modalHandlers) {
    client.modals.set(h.key, h);
  }

  client.selectMenus = new Map<string, SelectMenuHandler>();
  for (const h of selectMenuHandlers) {
    client.selectMenus.set(h.key, h);
  }

  return client;
}

declare module 'discord.js' {
  interface Client {
    commands: Map<string, Command>;
    buttons: Map<string, ButtonHandler>;
    modals: Map<string, ModalHandler>;
    selectMenus: Map<string, SelectMenuHandler>;
  }
}