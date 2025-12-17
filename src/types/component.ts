import type {
  ButtonInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction
} from 'discord.js';

export type CustomIdParts = {
  scope: string;
  action: string;
  args: string[];
};

export interface ButtonHandler {
  key: string; // `${scope}:${action}`
  execute(interaction: ButtonInteraction, ctx: { customId: CustomIdParts }): Promise<void>;
}

export interface ModalHandler {
  key: string; // `${scope}:${action}`
  execute(interaction: ModalSubmitInteraction, ctx: { customId: CustomIdParts }): Promise<void>;
}

export interface SelectMenuHandler {
  key: string; // `${scope}:${action}`
  execute(interaction: StringSelectMenuInteraction, ctx: { customId: CustomIdParts }): Promise<void>;
}