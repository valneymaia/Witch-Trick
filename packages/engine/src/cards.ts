export const MOONS = ['new', 'waning', 'waxing', 'full'] as const;
export type Moon = typeof MOONS[number];
export const MOON_NAMES: Record<Moon, string> = {
  new: 'Nova', waning: 'Minguante', waxing: 'Crescente', full: 'Cheia',
};

export const CREATURES = [
  { kind: 'arcana', name: 'Arcana', value: 10, effectKey: null },
  { kind: 'raven', name: 'Corvo', value: 1, effectKey: 'raven' },
  { kind: 'puppeteer', name: 'O Titereiro', value: 2, effectKey: 'puppeteer' },
  { kind: 'wolf', name: 'Lobo', value: 3, effectKey: 'wolf' },
  { kind: 'fairy', name: 'Fada', value: 4, effectKey: 'fairy' },
  { kind: 'goblin', name: 'Goblin', value: 5, effectKey: 'goblin' },
  { kind: 'griffin', name: 'Grifo', value: 6, effectKey: 'griffin' },
  { kind: 'familiar', name: 'Familiar', value: 7, effectKey: 'familiar' },
  { kind: 'wizard', name: 'O Mago', value: 8, effectKey: 'wizard' },
  { kind: 'witch', name: 'A Bruxa', value: 9, effectKey: 'witch' },
] as const;
export type CreatureKind = typeof CREATURES[number]['kind'];
export interface CreatureCard {
  id: string;
  kind: CreatureKind;
  name: string;
  value: number;
  moon: Moon;
  image: string;
  effectKey: string | null;
}
const SLUGS: Record<CreatureKind, string> = {
  arcana: 'arcana', raven: 'corvo', puppeteer: 'titereiro', wolf: 'lobo',
  fairy: 'fada', goblin: 'goblin', griffin: 'grifo', familiar: 'familiar',
  wizard: 'mago', witch: 'bruxa',
};
const MOON_SLUGS: Record<Moon, string> = {
  new: 'nova', waning: 'minguante', waxing: 'crescente', full: 'cheia',
};
export const CARDS: CreatureCard[] = CREATURES.flatMap(creature =>
  MOONS.map(moon => ({
    ...creature,
    id: `${creature.kind}-${moon}`,
    moon,
    image: `/cards/${SLUGS[creature.kind]}-${MOON_SLUGS[moon]}.png`,
  })),
);
export const CARD_BY_ID: Record<string, CreatureCard> = Object.fromEntries(CARDS.map(card => [card.id, card]));
export function compareCards(a: CreatureCard, b: CreatureCard): number {
  return a.value - b.value || MOONS.indexOf(a.moon) - MOONS.indexOf(b.moon);
}
