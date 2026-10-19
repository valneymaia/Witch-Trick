import { describe, expect, it } from 'vitest';
import { CARDS, CARD_BY_ID, MOONS, compareCards, createAbilityScenario, createGame, reduce, teamOf, viewFor, type GameState } from './index.js';

const ids: [string, string, string, string] = ['a', 'b', 'c', 'd'];
function playTrick(state: GameState, cards: string[]): GameState {
  for (const cardId of cards) state = reduce(state, { type: 'play', playerId: state.playerIds[state.turn]!, cardId });
  return state;
}
function controlledState(hands: GameState['hands'], starter = 0): GameState {
  return { ...createGame(ids, 123), hands, deck: [], discard: [], trick: [], trickWins: [0, 0], roundStarter: starter, turn: starter };
}
function skipAbility(state: GameState): GameState {
  while (state.pendingAbility) state = reduce(state, { type: 'ability', playerId: ids[state.pendingAbility.seat]!, choice: 'skip' });
  return state;
}
describe('baralho e comparação', () => {
  it('tem 40 cartas únicas, 10 criaturas e 4 Luas', () => {
    expect(CARDS).toHaveLength(40);
    expect(new Set(CARDS.map(card => card.id)).size).toBe(40);
    expect(new Set(CARDS.map(card => card.kind)).size).toBe(10);
    for (const kind of new Set(CARDS.map(card => card.kind))) {
      expect(CARDS.filter(card => card.kind === kind).map(card => card.moon).sort()).toEqual([...MOONS].sort());
    }
  });
  it('Arcana supera todas as outras criaturas', () => {
    for (const card of CARDS.filter(card => card.kind !== 'arcana')) {
      expect(compareCards(CARD_BY_ID['arcana-new']!, card)).toBeGreaterThan(0);
    }
  });
  it('compara valor antes de Lua e usa Lua para desempatar', () => {
    expect(compareCards(CARD_BY_ID['witch-new']!, CARD_BY_ID['raven-full']!)).toBeGreaterThan(0);
    expect(compareCards(CARD_BY_ID['wolf-full']!, CARD_BY_ID['wolf-waxing']!)).toBeGreaterThan(0);
    expect(compareCards(CARD_BY_ID['wolf-waxing']!, CARD_BY_ID['wolf-waning']!)).toBeGreaterThan(0);
    expect(compareCards(CARD_BY_ID['wolf-waning']!, CARD_BY_ID['wolf-new']!)).toBeGreaterThan(0);
    expect(compareCards(CARD_BY_ID['arcana-full']!, CARD_BY_ID['arcana-new']!)).toBeGreaterThan(0);
  });
});
describe('partida', () => {
  it('começa com três cartas por pessoa e a mesma seed reproduz a distribuição', () => {
    const a = createGame(ids, 42);
    expect(a).toEqual(createGame(ids, 42));
    expect(a.hands.map(hand => hand.length)).toEqual([3, 3, 3, 3]);
    expect(a.deck).toHaveLength(28);
    expect(new Set([...a.deck, ...a.hands.flat()]).size).toBe(40);
    expect(a.scores).toEqual([0, 0]);
    expect(a.roundStarter).toBeGreaterThanOrEqual(0);
    expect(a.roundStarter).toBeLessThan(4);
  });
  it('assentos alternados formam equipes e jogadas seguem sentido anti-horário', () => {
    expect([0, 1, 2, 3].map(teamOf)).toEqual([0, 1, 0, 1]);
    const state = createGame(ids, 1);
    const cardId = state.hands[state.turn]![0]!;
    const next = reduce(state, { type: 'play', playerId: ids[state.turn]!, cardId });
    expect(next.turn).toBe((state.turn + 1) % 4);
    expect(next.trick).toHaveLength(1);
    expect(state.hands[state.turn]).toContain(cardId);
  });
  it('recusa jogador fora de turno, carta alheia e repetição', () => {
    const state = createGame(ids, 2);
    const seat = state.turn;
    expect(() => reduce(state, { type: 'play', playerId: ids[(seat + 1) % 4]!, cardId: state.hands[seat]![0]! })).toThrow();
    expect(() => reduce(state, { type: 'play', playerId: ids[seat]!, cardId: state.hands[(seat + 1) % 4]![0]! })).toThrow();
    const cardId = state.hands[seat]![0]!;
    const next = reduce(state, { type: 'play', playerId: ids[seat]!, cardId });
    expect(() => reduce(next, { type: 'play', playerId: ids[next.turn]!, cardId })).toThrow();
  });
  it('a carta mais forte vence a vaza e seu jogador inicia a próxima', () => {
    const state = controlledState([
      ['raven-full'], ['wizard-new'], ['arcana-new'], ['witch-full'],
    ]);
    const next = playTrick(state, ['raven-full', 'wizard-new', 'arcana-new', 'witch-full']);
    expect(next.lastTrickWinner).toBe(2);
    expect(next.turn).toBe(2);
    expect(next.trickWins).toEqual([1, 0]);
    expect(next.discard).toHaveLength(4);
  });
  it('a primeira equipe com duas vazas ganha um ponto; a próxima rodada muda o inicial', () => {
    let state = controlledState([
      ['arcana-full', 'arcana-waxing', 'raven-new'],
      ['witch-full', 'witch-waxing', 'raven-waning'],
      ['raven-full', 'raven-waxing', 'wolf-new'],
      ['wizard-full', 'wizard-waxing', 'wolf-waning'],
    ]);
    state = playTrick(state, ['arcana-full', 'witch-full', 'raven-full', 'wizard-full']);
    state = playTrick(state, ['arcana-waxing', 'witch-waxing', 'raven-waxing', 'wizard-waxing']);
    expect(state.scores).toEqual([1, 0]);
    expect(state.round).toBe(2);
    expect(state.roundStarter).toBe(1);
    expect(state.turn).toBe(1);
    expect(state.hands.map(hand => hand.length)).toEqual([3, 3, 3, 3]);
    expect(new Set([...state.deck, ...state.hands.flat()]).size).toBe(40);
  });
  it('a rodada pode chegar à terceira vaza', () => {
    let state = controlledState([
      ['arcana-full', 'raven-new', 'witch-full'],
      ['raven-full', 'arcana-new', 'wizard-full'],
      ['wolf-new', 'wolf-waning', 'wolf-waxing'],
      ['fairy-new', 'fairy-waning', 'fairy-waxing'],
    ]);
    state = playTrick(state, ['arcana-full', 'raven-full', 'wolf-new', 'fairy-new']);
    expect(state.trickWinners).toEqual([0]);
    state = playTrick(state, ['raven-new', 'arcana-new', 'wolf-waning', 'fairy-waning']);
    expect(state.trickWins).toEqual([1, 1]);
    expect(state.trickWinners).toEqual([0, 1]);
    expect(state.round).toBe(1);
    state = playTrick(state, ['wizard-full', 'wolf-waxing', 'fairy-waxing', 'witch-full']);
    expect(state.round).toBe(2);
    expect(state.trickWinners).toEqual([]);
    expect(state.lastRound?.trickWinners).toEqual([0, 1, 0]);
  });
  it('encerra em 15 pontos', () => {
    let state = controlledState([['arcana-full'], ['witch-full'], ['raven-full'], ['wizard-full']]);
    state = { ...state, scores: [14, 3], trickWins: [1, 0] };
    state = playTrick(state, ['arcana-full', 'witch-full', 'raven-full', 'wizard-full']);
    expect(state.winner).toBe(0);
    expect(state.scores).toEqual([15, 3]);
    expect(() => reduce(state, { type: 'play', playerId: 'a', cardId: 'raven-new' })).toThrow();
  });
  it('o vencedor pode pular a habilidade da criatura', () => {
    const state = controlledState([['raven-full'], ['raven-new'], ['wolf-new'], ['fairy-new']]);
    let next = playTrick(state, ['raven-full', 'raven-new', 'wolf-new', 'fairy-new']);
    expect(next.pendingAbility?.cardId).toBe('fairy-new');
    next = skipAbility(next);
    expect(next.scores).toEqual([0, 0]);
    expect(next.activeEffects).toEqual([]);
  });
});
describe('Trick', () => {
  it('quem recebe o pedido pode contra-aumentar na hora e devolver a decisão', () => {
    let state = { ...createGame(ids, 7), turn: 0 };
    state = reduce(state, { type: 'raise', playerId: 'a' });
    expect(() => reduce(state, { type: 'counter', playerId: 'c' })).toThrow('não pode aumentar');
    state = reduce(state, { type: 'counter', playerId: 'b' });
    expect(state.roundStake).toBe(2);
    expect(state.pendingChallenge).toEqual({ level: 3, challengerSeat: 1, responderSeat: 0 });
    expect(state.turn).toBe(0);
    expect(() => reduce(state, { type: 'play', playerId: 'a', cardId: state.hands[0]![0]! })).toThrow('Aguarde');
    const declined = skipAbility(reduce(state, { type: 'respond', playerId: 'a', accept: false }));
    expect(declined.scores).toEqual([0, 2]);
    expect(declined.lastRound?.points).toBe(2);
    state = reduce(state, { type: 'counter', playerId: 'a' });
    expect(state.roundStake).toBe(3);
    expect(state.pendingChallenge).toEqual({ level: 4, challengerSeat: 0, responderSeat: 1 });
    expect(() => reduce(state, { type: 'counter', playerId: 'b' })).toThrow('máximo');
    state = reduce(state, { type: 'respond', playerId: 'b', accept: true });
    expect(state.roundStake).toBe(4);
    expect(state.pendingChallenge).toBeNull();
    expect(state.turn).toBe(0);
  });
  it('só pode pedir na própria vez, antes de jogar; o próximo assento responde, inclusive após o último', () => {
    let state = createGame(ids, 4);
    state = { ...state, turn: 3, trick: [{ seat: 0, cardId: 'raven-new' }, { seat: 1, cardId: 'wolf-new' }, { seat: 2, cardId: 'fairy-new' }] };
    expect(() => reduce(state, { type: 'raise', playerId: 'a' })).toThrow('Não é a vez');
    state = reduce(state, { type: 'raise', playerId: 'd' });
    expect(state.pendingChallenge).toEqual({ level: 2, challengerSeat: 3, responderSeat: 0 });
    expect(state.turn).toBe(3);
    expect(() => reduce(state, { type: 'play', playerId: 'd', cardId: state.hands[3]![0]! })).toThrow('Aguarde');
    expect(() => reduce(state, { type: 'respond', playerId: 'b', accept: true })).toThrow('não pode responder');
    state = reduce(state, { type: 'respond', playerId: 'a', accept: true });
    expect(state.roundStake).toBe(2);
    expect(state.turn).toBe(3);
    expect(state.pendingChallenge).toBeNull();
  });
  it('Double, Hat e Poker Trick sobem de 1 a 4 e alternam as equipes', () => {
    let state = { ...createGame(ids, 5), turn: 0 };
    state = reduce(state, { type: 'raise', playerId: 'a' });
    state = reduce(state, { type: 'respond', playerId: 'b', accept: true });
    expect(state.roundStake).toBe(2);
    expect(() => reduce(state, { type: 'raise', playerId: 'a' })).toThrow('equipe adversária');
    let partnerTurn = reduce(state, { type: 'play', playerId: 'a', cardId: state.hands[0]![0]! });
    partnerTurn = reduce(partnerTurn, { type: 'play', playerId: 'b', cardId: partnerTurn.hands[1]![0]! });
    expect(() => reduce(partnerTurn, { type: 'raise', playerId: 'c' })).toThrow('equipe adversária');
    state = reduce(state, { type: 'play', playerId: 'a', cardId: state.hands[0]![0]! });
    state = reduce(state, { type: 'raise', playerId: 'b' });
    expect(state.pendingChallenge?.level).toBe(3);
    state = reduce(state, { type: 'respond', playerId: 'c', accept: true });
    expect(state.roundStake).toBe(3);
    state = reduce(state, { type: 'play', playerId: 'b', cardId: state.hands[1]![0]! });
    state = reduce(state, { type: 'raise', playerId: 'c' });
    expect(state.pendingChallenge?.level).toBe(4);
    const declined = skipAbility(reduce(state, { type: 'respond', playerId: 'd', accept: false }));
    expect(declined.scores).toEqual([3, 0]);
    expect(declined.lastRound?.points).toBe(3);
    state = reduce(state, { type: 'respond', playerId: 'd', accept: true });
    expect(state.roundStake).toBe(4);
    expect(() => reduce(state, { type: 'raise', playerId: 'c' })).toThrow('máximo');
  });
  it('recusar entrega imediatamente à equipe que pediu a aposta anterior, sem consumir cartas', () => {
    let state = { ...createGame(ids, 6), turn: 0, scores: [2, 4] as [number, number] };
    const hands = state.hands.map(hand => [...hand]);
    state = reduce(state, { type: 'raise', playerId: 'a' });
    expect(state.roundStake).toBe(1);
    state = skipAbility(reduce(state, { type: 'respond', playerId: 'b', accept: false }));
    expect(state.scores).toEqual([3, 4]);
    expect(state.lastRound).toEqual({ winner: 0, points: 1, reason: 'declined', trickWinners: [] });
    expect(state.round).toBe(2);
    expect(state.roundStake).toBe(1);
    expect(state.lastRaiseTeam).toBeNull();
    expect(hands.map(hand => hand.length)).toEqual([3, 3, 3, 3]);

    state = { ...state, turn: 0 };
    state = reduce(state, { type: 'raise', playerId: 'a' });
    state = reduce(state, { type: 'respond', playerId: 'b', accept: true });
    state = reduce(state, { type: 'play', playerId: 'a', cardId: state.hands[0]![0]! });
    state = reduce(state, { type: 'raise', playerId: 'b' });
    state = skipAbility(reduce(state, { type: 'respond', playerId: 'c', accept: false }));
    expect(state.scores).toEqual([3, 6]);
    expect(state.lastRound?.points).toBe(2);
    expect(state.lastRound?.winner).toBe(1);
  });
  it('vitória por duas vazas entrega o valor aceito e encerra ao chegar a 15', () => {
    let state = controlledState([
      ['arcana-full', 'arcana-waxing'], ['witch-full', 'witch-waxing'],
      ['raven-full', 'raven-waxing'], ['wizard-full', 'wizard-waxing'],
    ]);
    state = { ...state, scores: [12, 2] };
    state = reduce(state, { type: 'raise', playerId: 'a' });
    state = reduce(state, { type: 'respond', playerId: 'b', accept: true });
    state = playTrick(state, ['arcana-full', 'witch-full', 'raven-full', 'wizard-full']);
    state = playTrick(state, ['arcana-waxing', 'witch-waxing', 'raven-waxing', 'wizard-waxing']);
    expect(state.scores).toEqual([14, 2]);
    expect(state.lastRound).toEqual({ winner: 0, points: 2, reason: 'tricks', trickWinners: [0, 0] });
    expect(state.winner).toBeNull();
    state = { ...state, scores: [14, 2], roundStake: 4, trickWins: [1, 0], trickWinners: [0], turn: 0,
      hands: [['arcana-full'], ['witch-full'], ['raven-full'], ['wizard-full']] };
    state = playTrick(state, ['arcana-full', 'witch-full', 'raven-full', 'wizard-full']);
    expect(state.scores).toEqual([15, 2]);
    expect(state.winner).toBe(0);
    expect(state.lastRound?.points).toBe(4);
  });
});
describe('privacidade', () => {
  it('mostra só a própria mão e contagens alheias', () => {
    const state = createGame(ids, 9);
    const view = viewFor(state, 'a');
    expect(view.hand.map(card => card.id)).toEqual(state.hands[0]);
    expect(view.players.map(player => player.handCount)).toEqual([3, 3, 3, 3]);
    for (const hidden of state.hands.slice(1).flat()) expect(JSON.stringify(view)).not.toContain(`"id":"${hidden}"`);
    expect(JSON.stringify(view)).not.toContain('deck');
    expect(() => viewFor(state, 'outsider')).toThrow();
  });
});
describe('habilidades de criaturas', () => {
  it('cenários solo abrem a decisão de cada criatura sem sorteio', () => {
    for (const kind of ['raven', 'puppeteer', 'wolf', 'fairy', 'goblin', 'griffin', 'familiar'] as const) {
      const trick = createAbilityScenario(ids, kind, 'trick');
      expect(trick.pendingAbility?.cardId).toBe(`${kind}-full`);
      const declined = createAbilityScenario(ids, kind, 'declined');
      expect(declined.pendingAbility?.stage).toBe('source');
      expect(viewFor(declined, 'a').abilityOptions.some(option => option.value === `${kind}-full`)).toBe(true);
    }
  });
  it('Trick recusado permite descartar um Corvo da mão e tirar dois pontos do rival', () => {
    let state = controlledState([
      ['raven-new', 'arcana-new'], ['witch-new'], ['wolf-new'], ['fairy-new'],
    ]);
    state = { ...state, scores: [0, 5] };
    state = reduce(state, { type: 'raise', playerId: 'a' });
    state = reduce(state, { type: 'respond', playerId: 'b', accept: false });
    expect(state.pendingAbility?.stage).toBe('source');
    expect(() => reduce(state, { type: 'ability', playerId: 'b', choice: 'raven-new' })).toThrow();
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'raven-new' });
    expect(state.round).toBe(2);
    expect(state.scores).toEqual([1, 3]);
    expect(state.pendingAbility).toBeNull();
  });
  it('o vencedor ativa Corvo ou Familiar, ou deixa a habilidade passar', () => {
    let raven = controlledState([['raven-full'], ['raven-new'], ['raven-waning'], ['raven-waxing']]);
    raven = { ...raven, scores: [0, 4] };
    raven = playTrick(raven, ['raven-full', 'raven-new', 'raven-waning', 'raven-waxing']);
    raven = reduce(raven, { type: 'ability', playerId: 'a', choice: 'use' });
    expect(raven.scores).toEqual([0, 2]);
    let familiar = controlledState([['familiar-full'], ['raven-new'], ['wolf-new'], ['fairy-new']]);
    familiar = playTrick(familiar, ['familiar-full', 'raven-new', 'wolf-new', 'fairy-new']);
    familiar = reduce(familiar, { type: 'ability', playerId: 'a', choice: 'use' });
    expect(familiar.scores).toEqual([1, 0]);
  });
  it('a habilidade da última vaza é escolhida agora e aplicada na rodada seguinte', () => {
    let state = controlledState([
      ['arcana-full', 'raven-full'], ['witch-full', 'raven-waxing'],
      ['goblin-new', 'raven-waning'], ['wizard-full', 'raven-new'],
    ]);
    state = { ...state, scores: [0, 5] };
    state = playTrick(state, ['arcana-full', 'witch-full', 'goblin-new', 'wizard-full']);
    state = playTrick(state, ['raven-full', 'raven-waxing', 'raven-waning', 'raven-new']);
    expect(state.round).toBe(1);
    expect(state.pendingAbility?.endRound).toEqual({ team: 0, reason: 'tricks' });
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'use' });
    expect(state.round).toBe(2);
    expect(state.scores).toEqual([1, 3]);
  });
  it('se a segunda vaza empata em 1 a 1, o poder entra antes da terceira', () => {
    let state = controlledState([
      ['arcana-full', 'raven-new', 'witch-new'], ['raven-full', 'familiar-full', 'wizard-new'],
      ['wolf-new', 'goblin-new', 'fairy-waning'], ['fairy-new', 'raven-waning', 'wolf-waning'],
    ]);
    state = playTrick(state, ['arcana-full', 'raven-full', 'wolf-new', 'fairy-new']);
    state = playTrick(state, ['raven-new', 'familiar-full', 'goblin-new', 'raven-waning']);
    expect(state.trickWinners).toEqual([0, 1]);
    expect(state.round).toBe(1);
    expect(state.pendingAbility?.endRound).toBeNull();
    state = reduce(state, { type: 'ability', playerId: 'b', choice: 'use' });
    expect(state.scores).toEqual([0, 1]);
    expect(state.turn).toBe(1);
    expect(state.trick).toEqual([]);
  });
  it('Lobo bloqueia habilidades rivais até o fim da rodada', () => {
    let state = controlledState([
      ['wolf-full', 'raven-new'], ['raven-full', 'familiar-full'],
      ['raven-waning', 'goblin-new'], ['raven-waxing', 'fairy-new'],
    ]);
    state = playTrick(state, ['wolf-full', 'raven-full', 'raven-waning', 'raven-waxing']);
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'use' });
    expect(state.activeEffects[0]?.key).toBe('wolf');
    state = playTrick(state, ['raven-new', 'familiar-full', 'goblin-new', 'fairy-new']);
    expect(state.lastTrickWinner).toBe(1);
    expect(state.pendingAbility).toBeNull();
  });
  it('Titereiro troca uma carta própria por outra do descarte', () => {
    let state = controlledState([
      ['puppeteer-full', 'arcana-new'], ['raven-new', 'wizard-new'],
      ['raven-waning', 'witch-new'], ['raven-waxing', 'fairy-new'],
    ]);
    state = playTrick(state, ['puppeteer-full', 'raven-new', 'raven-waning', 'raven-waxing']);
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'use' });
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'raven-new' });
    expect(state.hands[0]).toContain('raven-new');
    expect(state.hands[0]).toContain('arcana-new');
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'arcana-new' });
    expect(state.hands[0]).toEqual(['raven-new']);
    expect(state.discard).toContain('arcana-new');
  });
  it('Titereiro da última vaza reserva a carta escolhida para trocar na próxima rodada', () => {
    let state = controlledState([
      ['arcana-full', 'puppeteer-full'], ['wizard-full', 'raven-full'],
      ['witch-full', 'raven-waning'], ['goblin-full', 'raven-waxing'],
    ]);
    state = playTrick(state, ['arcana-full', 'wizard-full', 'witch-full', 'goblin-full']);
    state = playTrick(state, ['puppeteer-full', 'raven-full', 'raven-waning', 'raven-waxing']);
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'use' });
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'raven-full' });
    expect(state.round).toBe(2);
    expect(state.hands[0]).toContain('raven-full');
    expect(state.hands[0]).toHaveLength(4);
    const own = state.hands[0]!.find(id => id !== 'raven-full')!;
    state = reduce(state, { type: 'ability', playerId: 'a', choice: own });
    expect(state.hands[0]).toHaveLength(3);
    expect(state.discard).toContain(own);
    const all = [...state.deck, ...state.hands.flat(), ...state.discard];
    expect(all).toHaveLength(40);
    expect(new Set(all).size).toBe(40);
  });
  it('Fada revela no máximo duas cartas só ao autor e descarta a escolhida', () => {
    let state = controlledState([
      ['fairy-full', 'arcana-new'], ['raven-new', 'wizard-new', 'witch-waning'],
      ['wolf-new', 'witch-new'], ['puppeteer-new', 'goblin-new'],
    ]);
    state = playTrick(state, ['fairy-full', 'raven-new', 'wolf-new', 'puppeteer-new']);
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'use' });
    state = reduce(state, { type: 'ability', playerId: 'a', choice: '1' });
    const choices = state.pendingAbility?.candidates ?? [];
    expect(choices).toHaveLength(2);
    expect(viewFor(state, 'a').abilityOptions[0]?.card?.id).toBe(choices[0]);
    expect(viewFor(state, 'c').abilityOptions).toEqual([]);
    state = reduce(state, { type: 'ability', playerId: 'a', choice: choices[0]! });
    expect(state.hands[1]).toHaveLength(1);
    state = reduce(state, { type: 'play', playerId: 'a', cardId: 'arcana-new' });
    expect(state.turn).toBe(1);
  });
  it('se a Fada deixar o adversário sem cartas, ele passa a vez', () => {
    let state = controlledState([
      ['fairy-full', 'arcana-new'], ['raven-new', 'wizard-new'],
      ['wolf-new', 'witch-new'], ['puppeteer-new', 'goblin-new'],
    ]);
    state = playTrick(state, ['fairy-full', 'raven-new', 'wolf-new', 'puppeteer-new']);
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'use' });
    state = reduce(state, { type: 'ability', playerId: 'a', choice: '1' });
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'wizard-new' });
    state = reduce(state, { type: 'play', playerId: 'a', cardId: 'arcana-new' });
    expect(state.turn).toBe(2);
    expect(() => reduce(state, { type: 'play', playerId: 'b', cardId: 'wizard-new' })).toThrow();
  });
  it('Mago e Bruxa aguardam os Rituais e não podem ser ativados', () => {
    let state = controlledState([['witch-full'], ['raven-new'], ['wolf-new'], ['fairy-new']]);
    state = playTrick(state, ['witch-full', 'raven-new', 'wolf-new', 'fairy-new']);
    expect(state.pendingAbility).toBeNull();
  });
  it('Goblin troca cartas aleatoriamente e Grifo compra e descarta', () => {
    let goblin = controlledState([
      ['goblin-full', 'witch-new'], ['raven-new', 'wolf-full'],
      ['wolf-new', 'arcana-new'], ['fairy-new', 'wizard-new'],
    ]);
    goblin = playTrick(goblin, ['goblin-full', 'raven-new', 'wolf-new', 'fairy-new']);
    goblin = reduce(goblin, { type: 'ability', playerId: 'a', choice: 'use' });
    goblin = reduce(goblin, { type: 'ability', playerId: 'a', choice: 'witch-new' });
    goblin = reduce(goblin, { type: 'ability', playerId: 'a', choice: '1' });
    expect(goblin.hands[0]).toEqual(['wolf-full']);
    expect(goblin.hands[1]).toEqual(['witch-new']);
    expect(goblin.scores).toEqual([1, 0]);

    let griffin = controlledState([
      ['griffin-full', 'raven-full'], ['raven-new', 'witch-new'],
      ['wolf-new', 'arcana-new'], ['fairy-new', 'wizard-new'],
    ]);
    griffin = { ...griffin, deck: ['witch-full'] };
    griffin = playTrick(griffin, ['griffin-full', 'raven-new', 'wolf-new', 'fairy-new']);
    griffin = reduce(griffin, { type: 'ability', playerId: 'a', choice: 'use' });
    expect(griffin.hands[0]).toEqual(['raven-full', 'witch-full']);
    griffin = reduce(griffin, { type: 'ability', playerId: 'a', choice: 'raven-full' });
    expect(griffin.hands[0]).toEqual(['witch-full']);
  });
});
