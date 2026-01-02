import { ComponentType, type ContainerComponentData, type TextDisplayComponentData, type TopLevelComponentData } from 'discord.js';

export function buildTextLine(content: string): TextDisplayComponentData {
  return {
    type: ComponentType.TextDisplay,
    content
  };
}

export function buildTextContainer(content: string): TopLevelComponentData[] {
  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components: [buildTextLine(content)]
  };

  return [container];
}

export function buildWarningView(formatEmoji: (name: string) => string, message: string): TopLevelComponentData[] {
  return buildTextContainer(`**${formatEmoji('staff_warn')} ${message}**`);
}

export function buildSuccessView(formatEmoji: (name: string) => string, message: string): TopLevelComponentData[] {
  return buildTextContainer(`**${formatEmoji('slide_d')} ${message}**`);
}

export function buildUsageView(formatEmoji: (name: string) => string, usage: string): TopLevelComponentData[] {
  return buildTextContainer(`**${formatEmoji('staff_warn')} Использование:** ${usage}`);
}