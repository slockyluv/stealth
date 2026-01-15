import { SlashCommandBuilder, ChatInputCommandInteraction, Message } from 'discord.js';

export interface Command {
  data: SlashCommandBuilder;
  defer?: boolean;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
  executeMessage?(message: Message, args: string[]): Promise<void>;
}
