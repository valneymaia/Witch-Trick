export const RITUALS = [
  { kind: 'runa-da-vontade', name: 'Runa da Vontade', blind: false, image: '/rituals/runa-da-vontade.png', description: 'Escolha uma criatura. As quatro Luas dela ficam acima de todas as demais cartas, inclusive as Arcanas, nesta rodada. Entre elas, vale a ordem normal das Luas.' },
  { kind: 'magia-nula', name: 'Magia Nula', blind: false, image: '/rituals/magia-nula.png', description: 'As habilidades de criaturas ficam desativadas nesta rodada.' },
  { kind: 'trick-explosivo', name: 'Trick Explosivo', blind: false, image: '/rituals/trick-explosivo.png', description: 'A rodada começa valendo 3 pontos. Double, Hat e Poker Trick aceitos elevam o valor a 5, 6 e 7 pontos.' },
  { kind: 'doblete-sombrio', name: 'Doblete Sombrio', blind: false, image: '/rituals/doblete-sombrio.png', description: 'A rodada começa valendo 2 pontos. Double, Hat e Poker Trick aceitos elevam o valor a 4, 5 e 6 pontos.' },
  { kind: 'maldicao-da-derrota', name: 'Maldição da Derrota', blind: false, image: '/rituals/maldicao-da-derrota.png', description: 'A equipe que perder esta rodada perde 3 pontos, até o mínimo de zero.' },
  { kind: 'escolha-da-ancia', name: 'Escolha da Anciã', blind: false, image: '/rituals/escolha-da-ancia.png', description: 'Cada jogador da equipe compra 3 criaturas e descarta 3 da própria mão antes da primeira vaza.' },
  { kind: 'veu-da-incerteza', name: 'Véu da Incerteza', blind: true, image: '/rituals/veu-da-incerteza.png', description: 'Todos jogam criaturas pelo verso, sem consultar a própria mão, durante toda a rodada.' },
  { kind: 'mao-cega', name: 'Mão Cega', blind: true, image: '/rituals/mao-cega.png', description: 'Escolha um adversário. Ele joga criaturas pelo verso, sem consultar a própria mão, durante toda a rodada.' },
  { kind: 'roubo-arcano', name: 'Roubo Arcano', blind: false, image: '/rituals/roubo-arcano.png', description: 'Escolha um adversário e veja todas as criaturas da mão dele.' },
  { kind: 'espelho-enfeiticado', name: 'Espelho Enfeitiçado', blind: false, image: '/rituals/espelho-enfeiticado.png', description: 'Cada membro da equipe pode trocar toda a própria mão com a de um adversário. Cada rival só pode ser escolhido uma vez.' },
  { kind: 'olho-da-verdade', name: 'Olho da Verdade', blind: false, image: '/rituals/olho-da-verdade.png', description: 'Escolha um adversário. As criaturas da mão dele ficam visíveis a todos nesta rodada.' },
  { kind: 'acordo-de-sangue', name: 'Acordo de Sangue', blind: false, image: '/rituals/acordo-de-sangue.png', description: 'A equipe vê as mãos dos parceiros e vota. Com maioria favorável, joga por 3 pontos; sem maioria, o rival ganha 1 ponto.' },
  { kind: 'mapa-do-destino', name: 'Mapa do Destino', blind: true, image: undefined, description: 'Antes de ver as três criaturas novas, anuncie 2–0 ou 2–1. Se sua equipe vencer a rodada com esse placar de vazas, ganha 1 ponto extra.' },
  { kind: 'silencio-da-bruxa', name: 'Silêncio da Bruxa', blind: false, description: 'A equipe adversária não pode pedir nem aumentar Trick nesta rodada.' },
] as const;

export type RitualKind = typeof RITUALS[number]['kind'];
export interface RitualCard { id: string; kind: RitualKind; name: string; blind: boolean; image?: string; description: string }
export const RITUAL_BY_KIND: Record<RitualKind, typeof RITUALS[number]> = Object.fromEntries(RITUALS.map(card => [card.kind, card])) as Record<RitualKind, typeof RITUALS[number]>;

// Baralho provisório: quatro cópias dos doze Rituais com arte e regras implementadas.
// Mapa e Silêncio continuam testáveis em cenários, mas fora do sorteio atual.
export const RITUAL_TEST_DECK = RITUALS.slice(0, 12).flatMap(card =>
  [1, 2, 3, 4].map(copy => `${card.kind}#${copy}`),
);

export function ritualFromId(id: string): RitualCard {
  const kind = id.split('#')[0] as RitualKind;
  const card = RITUAL_BY_KIND[kind];
  if (!card || !/^[1-4]$/.test(id.split('#')[1] ?? '') || id !== `${kind}#${id.split('#')[1]}`) throw new Error('Ritual desconhecido.');
  return { ...card, id };
}
