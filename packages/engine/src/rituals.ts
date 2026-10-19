export const RITUALS = [
  { kind: 'mapa-do-destino', name: 'Mapa do Destino', blind: true, description: 'Antes de ver as três criaturas novas, anuncie 2–0 ou 2–1. Se sua equipe vencer a rodada com esse placar de vazas, ganha 1 ponto extra.' },
  { kind: 'doblete-sombrio', name: 'Doblete Sombrio', blind: false, description: 'A rodada começa valendo 2 pontos.' },
  { kind: 'magia-nula', name: 'Magia Nula', blind: false, description: 'As habilidades de criaturas ficam desativadas nesta rodada.' },
  { kind: 'silencio-da-bruxa', name: 'Silêncio da Bruxa', blind: false, description: 'A equipe adversária não pode pedir nem aumentar Trick nesta rodada.' },
] as const;

export type RitualKind = typeof RITUALS[number]['kind'];
export interface RitualCard { id: string; kind: RitualKind; name: string; blind: boolean; description: string }
export const RITUAL_BY_KIND: Record<RitualKind, typeof RITUALS[number]> = Object.fromEntries(RITUALS.map(card => [card.kind, card])) as Record<RitualKind, typeof RITUALS[number]>;

// Baralho provisório: quatro cópias de cada um dos quatro Rituais implementados.
// Quando os 48 efeitos estiverem prontos, cada arte entra uma única vez.
export const RITUAL_TEST_DECK = RITUALS.flatMap(card =>
  [1, 2, 3, 4].map(copy => `${card.kind}#${copy}`),
);

export function ritualFromId(id: string): RitualCard {
  const kind = id.split('#')[0] as RitualKind;
  const card = RITUAL_BY_KIND[kind];
  if (!card || !RITUAL_TEST_DECK.includes(id)) throw new Error('Ritual desconhecido.');
  return { ...card, id };
}
