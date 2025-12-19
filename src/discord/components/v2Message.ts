import { ComponentType, type TopLevelComponentData } from 'discord.js';

export function buildTextView(text: string): TopLevelComponentData[] {
  return [
    {
      type: ComponentType.Container,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: text
        }
      ]
    }
  ];
}