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
export const CREATURE_EFFECTS: Record<CreatureKind, { description: string; available: boolean }> = {
  arcana: { description: 'A Arcana não possui habilidade.', available: false },
  raven: { description: 'A equipe adversária perde 2 pontos.', available: true },
  puppeteer: { description: 'Recupere qualquer carta já jogada nesta rodada, inclusive da vaza interrompida por um Trick recusado, exceto outro Titereiro. Ela pode ter vencido ou perdido. Troque-a por uma carta da sua mão. Se a rodada terminou, receba três cartas novas junto com a recuperada e descarte uma das três novas.', available: true },
  wolf: { description: 'Até o fim da rodada, a equipe adversária não pode usar habilidades de criaturas.', available: true },
  fairy: { description: 'No início da próxima vaza, veja até 2 cartas da mão de um adversário e escolha uma para descartar. Ele passa essa vaza e volta a jogar na seguinte, se houver.', available: true },
  goblin: { description: 'Troque uma criatura sua por uma aleatória de um adversário. Se receber uma carta de valor menor que 5, sua equipe ganha 1 ponto.', available: true },
  griffin: { description: 'No início da próxima vaza, compre uma carta e depois descarte outra da sua mão.', available: true },
  familiar: { description: 'Sua equipe ganha 1 ponto.', available: true },
  wizard: { description: 'Revele um Ritual aleatório de um adversário. Depois escolha se quer manter sua mão ou trocar um Ritual seu pelo revelado.', available: true },
  witch: { description: 'Compre um Ritual extra e descarte outro da sua mão de Rituais.', available: true },
};
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
