import { describe, expect, it } from 'vitest';
import { RITUAL_TEST_DECK, createGame, createRitualScenario, reduce, viewFor, type GameState } from './index.js';

const players: GameState['playerIds'] = ['a', 'b', 'c', 'd'];
function ritualState(rituals: string[], hands: GameState['hands'] = [
  ['arcana-full'], ['witch-new'], ['wolf-new'], ['fairy-new'],
]): GameState {
  const initial = createGame(players, 123, true);
  return {
    ...initial, roundStarter: 0, ritualChooser: 0, turn: 0, hands,
    ritualHands: [rituals, [], [], []], ritualDeck: [], ritualDiscard: [],
    deck: [], discard: [], trick: [], trickWins: [0, 0], trickWinners: [],
  };
}
function playFullTrick(state: GameState, cards: string[]): GameState {
  for (const cardId of cards) state = reduce(state, { type: 'play', playerId: players[state.turn]!, cardId });
  return state;
}

describe('primeiro lote de Rituais', () => {
  it('distribui três Rituais privados por jogador e oculta as criaturas antes da escolha', () => {
    const state = createGame(players, 42, true);
    expect(state.ritualHands.map(hand => hand.length)).toEqual([3, 3, 3, 3]);
    expect(new Set(state.ritualHands.flat()).size).toBe(12);
    expect(state.ritualPhase).toBe('blind');
    for (const playerId of players) {
      const view = viewFor(state, playerId);
      expect(view.hand).toEqual([]);
      expect(view.ritualHand).toHaveLength(3);
      expect(view.ritualHandCounts).toEqual([3, 3, 3, 3]);
      for (const id of state.ritualHands.flat().filter(id => !state.ritualHands[view.seat]!.includes(id))) {
        expect(view.ritualHand.some(card => card.id === id)).toBe(false);
      }
    }
    expect(() => reduce(state, { type: 'play', playerId: players[state.turn]!, cardId: state.hands[state.turn]![0]! })).toThrow('Escolha o Ritual');
  });

  it('Mapa do Destino fixa o palpite antes da revelação e dá um ponto pelo 2–0 correto', () => {
    let state = ritualState(['mapa-do-destino#1'], [
      ['arcana-full'], ['witch-new'], ['wolf-new'], ['fairy-new'],
    ]);
    state = { ...state, trickWins: [1, 0], trickWinners: [0] };
    expect(() => reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'mapa-do-destino#1' })).toThrow('placar previsto');
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'mapa-do-destino#1', prediction: '2-0' });
    expect(state.ritualPhase).toBe('play');
    expect(viewFor(state, 'a').hand).toHaveLength(1);
    state = playFullTrick(state, ['arcana-full', 'witch-new', 'wolf-new', 'fairy-new']);
    expect(state.scores).toEqual([2, 0]);
    expect(state.lastRound?.bonusPoints).toBe(1);
    expect(state.lastRound?.points).toBe(2);
  });

  it('revelar as criaturas fecha a janela do olho cortado; Doblete inicia em dois pontos', () => {
    let state = ritualState(['mapa-do-destino#1', 'doblete-sombrio#1']);
    expect(() => reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'doblete-sombrio#1' })).toThrow('Veja as criaturas');
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    expect(viewFor(state, 'a').hand).toHaveLength(1);
    expect(() => reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'mapa-do-destino#1', prediction: '2-0' })).toThrow('antes de ver');
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'doblete-sombrio#1' });
    expect(state.roundStake).toBe(2);
    state = reduce(state, { type: 'raise', playerId: 'a' });
    expect(state.pendingChallenge?.level).toBe(2);
    state = reduce(state, { type: 'respond', playerId: 'b', accept: false });
    expect(state.scores).toEqual([2, 0]);
  });

  it.each([
    ['doblete-sombrio#1', 2, 4, 5, 6],
    ['trick-explosivo#1', 3, 5, 6, 7],
    ['trick-premiado#1', 4, 6, 7, 8],
  ] as const)('%s soma Double, Hat e Poker à base e paga só o valor aceito na recusa', (ritualId, base, doublePoints, hatPoints, pokerPoints) => {
    let state = ritualState([ritualId], [
      ['arcana-new'], ['arcana-waning'], ['arcana-waxing'], ['arcana-full'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId });
    expect(state.roundBaseStake).toBe(base);
    expect(state.roundStake).toBe(base);
    expect(state.acceptedTrickLevel).toBe(0);
    state = reduce(state, { type: 'raise', playerId: 'a' });
    expect(state.pendingChallenge?.level).toBe(2);
    expect(state.roundStake).toBe(base);
    const declinedDouble = reduce(state, { type: 'respond', playerId: 'b', accept: false });
    expect(declinedDouble.scores).toEqual([base, 0]);

    state = reduce(state, { type: 'counter', playerId: 'b' });
    expect(state.roundStake).toBe(doublePoints);
    expect(state.acceptedTrickLevel).toBe(2);
    expect(state.pendingChallenge?.level).toBe(3);
    const declinedHat = reduce(state, { type: 'respond', playerId: 'a', accept: false });
    expect(declinedHat.scores).toEqual([0, doublePoints]);

    state = reduce(state, { type: 'counter', playerId: 'a' });
    expect(state.roundStake).toBe(hatPoints);
    expect(state.acceptedTrickLevel).toBe(3);
    expect(state.pendingChallenge?.level).toBe(4);
    const declinedPoker = reduce(state, { type: 'respond', playerId: 'b', accept: false });
    expect(declinedPoker.scores).toEqual([hatPoints, 0]);

    state = reduce(state, { type: 'respond', playerId: 'b', accept: true });
    expect(state.roundStake).toBe(pokerPoints);
    expect(state.acceptedTrickLevel).toBe(4);
    expect(() => reduce(state, { type: 'raise', playerId: 'a' })).toThrow('máximo');
    state = {
      ...state, turn: 0, trickWins: [1, 0], trickWinners: [0],
      hands: [['arcana-full'], ['arcana-new'], ['arcana-waning'], ['arcana-waxing']],
    };
    state = playFullTrick(state, ['arcana-full', 'arcana-new', 'arcana-waning', 'arcana-waxing']);
    expect(state.lastRound?.points).toBe(pokerPoints);
    expect(state.scores).toEqual([pokerPoints, 0]);
  });

  it('Runa da Vontade torna todas as Luas da criatura escolhida superiores à Arcana', () => {
    let state = ritualState(['runa-da-vontade#1'], [
      ['raven-new'], ['arcana-full'], ['witch-full'], ['wolf-full'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    expect(() => reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'runa-da-vontade#1' })).toThrow('Escolha uma criatura');
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'runa-da-vontade#1', creatureKind: 'raven' });
    expect(viewFor(state, 'b').ritualEmpoweredKind).toBe('raven');
    state = playFullTrick(state, ['raven-new', 'arcana-full', 'witch-full', 'wolf-full']);
    expect(state.lastTrickWinner).toBe(0);
    expect(state.trickWinners).toEqual([0]);

    state = ritualState(['runa-da-vontade#2'], [
      ['raven-new'], ['arcana-full'], ['raven-full'], ['witch-full'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'runa-da-vontade#2', creatureKind: 'raven' });
    state = playFullTrick(state, ['raven-new', 'arcana-full', 'raven-full', 'witch-full']);
    expect(state.lastTrickWinner).toBe(2);
  });

  it('Magia Nula bloqueia habilidade de criatura na vaza e após Trick recusado', () => {
    let state = ritualState(['magia-nula#1'], [
      ['raven-full'], ['raven-new'], ['raven-waning'], ['raven-waxing'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'magia-nula#1' });
    state = playFullTrick(state, ['raven-full', 'raven-new', 'raven-waning', 'raven-waxing']);
    expect(state.pendingAbility).toBeNull();
    expect(state.trickWins).toEqual([1, 0]);
    state = { ...state, hands: [['raven-full'], ['wolf-new'], ['fairy-new'], ['goblin-new']], turn: 0 };
    state = reduce(state, { type: 'raise', playerId: 'a' });
    state = reduce(state, { type: 'respond', playerId: 'b', accept: false });
    expect(state.pendingAbility).toBeNull();
    expect(state.scores[0]).toBe(1);
  });

  it('Silêncio da Bruxa impede pedidos e contra-aumentos da equipe rival', () => {
    let state = ritualState(['silencio-da-bruxa#1']);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'silencio-da-bruxa#1' });
    state = reduce(state, { type: 'raise', playerId: 'a' });
    expect(() => reduce(state, { type: 'counter', playerId: 'b' })).toThrow('Silêncio da Bruxa');
    state = reduce(state, { type: 'respond', playerId: 'b', accept: true });
    state = reduce(state, { type: 'play', playerId: 'a', cardId: 'arcana-full' });
    expect(state.turn).toBe(1);
    expect(() => reduce(state, { type: 'raise', playerId: 'b' })).toThrow('Silêncio da Bruxa');
  });

  it('Titereiro permite olho cortado e descarte pelo verso de uma das três novas', () => {
    let state = ritualState(['mapa-do-destino#1'], [
      ['witch-new'], ['goblin-new'], ['raven-new', 'wolf-new', 'fairy-new', 'arcana-full'], ['griffin-new'],
    ]);
    state = { ...state, ritualPhase: 'mode', ritualExchange: { seat: 2, newCardIds: ['raven-new', 'wolf-new', 'fairy-new'], discardsLeft: 1 } };
    expect(viewFor(state, 'c').hand.map(card => card.id)).toEqual(['arcana-full']);
    expect(viewFor(state, 'c').ritualDiscardOptions).toEqual([]);
    expect(JSON.stringify(viewFor(state, 'c'))).not.toContain('wolf-new');
    state = reduce(state, { type: 'ritual-mode', playerId: 'a', blind: true });
    const privateView = viewFor(state, 'c');
    expect(privateView.ritualDiscardOptions).toEqual([{ value: '0' }, { value: '1' }, { value: '2' }]);
    expect(JSON.stringify(privateView)).not.toContain('wolf-new');
    expect(viewFor(state, 'a').ritualDiscardOptions).toEqual([]);
    expect(() => reduce(state, { type: 'ritual-discard', playerId: 'a', choice: '1' })).toThrow();
    state = reduce(state, { type: 'ritual-discard', playerId: 'c', choice: '1' });
    expect(state.discard).toContain('wolf-new');
    for (const playerId of players) expect(viewFor(state, playerId).lastCreatureReveal).toMatchObject({
      reason: 'blind-discard', source: 'puppeteer', seat: 2, card: { id: 'wolf-new' },
    });
    expect(state.hands[2]).toEqual(['raven-new', 'fairy-new', 'arcana-full']);
    expect(state.ritualPhase).toBe('blind');
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'mapa-do-destino#1', prediction: '2-1' });
    expect(state.ritualPhase).toBe('play');
  });

  it('reembaralha o descarte de Rituais quando a mão acaba', () => {
    let state = ritualState(['doblete-sombrio#1']);
    state = { ...state, ritualDiscard: ['magia-nula#1', 'silencio-da-bruxa#1', 'mapa-do-destino#1'] };
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'doblete-sombrio#1' });
    state = reduce(state, { type: 'raise', playerId: 'a' });
    state = reduce(state, { type: 'respond', playerId: 'b', accept: false });
    expect(state.ritualHands[0]).toHaveLength(3);
    expect(new Set([...state.ritualHands[0]!, ...state.ritualDeck, ...state.ritualDiscard]).size).toBe(4);
  });

  it('Mago revela um Ritual adversário e pode manter a mão ou trocar', () => {
    let state = ritualState(['doblete-sombrio#1']);
    state = {
      ...state, ritualPhase: 'play', ritualHands: [
        ['doblete-sombrio#1'], ['magia-nula#1'], ['mapa-do-destino#1'], ['silencio-da-bruxa#1'],
      ],
      pendingAbility: { seat: 0, source: 'trick', stage: 'offer', cardId: 'wizard-full', endRound: null },
    };
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'use' });
    expect(state.pendingAbility?.stage).toBe('wizard-target');
    state = reduce(state, { type: 'ability', playerId: 'a', choice: '1' });
    expect(state.pendingAbility?.stage).toBe('wizard-decision');
    expect(viewFor(state, 'a').abilityOptions.find(option => option.value === 'swap')?.ritual?.id).toBe('magia-nula#1');
    expect(JSON.stringify(viewFor(state, 'c'))).not.toContain('magia-nula#1');
    const revealed = state;
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'keep' });
    expect(state.ritualHands[0]).toEqual(['doblete-sombrio#1']);
    expect(state.ritualHands[1]).toEqual(['magia-nula#1']);
    state = reduce(revealed, { type: 'ability', playerId: 'a', choice: 'swap' });
    expect(state.pendingAbility?.stage).toBe('wizard-own');
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'doblete-sombrio#1' });
    expect(state.pendingAbility).toBeNull();
    expect(state.ritualHands[0]).toEqual(['magia-nula#1']);
    expect(state.ritualHands[1]).toEqual(['doblete-sombrio#1']);
  });

  it('Bruxa compra um Ritual extra e obriga a descartar um da mão', () => {
    let state = ritualState(['doblete-sombrio#1']);
    state = {
      ...state, ritualPhase: 'play', ritualDeck: ['magia-nula#1'],
      pendingAbility: { seat: 0, source: 'trick', stage: 'offer', cardId: 'witch-full', endRound: null },
    };
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'use' });
    expect(state.pendingAbility?.stage).toBe('witch-discard');
    expect(state.ritualHands[0]).toEqual(['doblete-sombrio#1', 'magia-nula#1']);
    expect(() => reduce(state, { type: 'ability', playerId: 'b', choice: 'magia-nula#1' })).toThrow();
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'doblete-sombrio#1' });
    expect(state.ritualHands[0]).toEqual(['magia-nula#1']);
    expect(state.ritualDiscard).toContain('doblete-sombrio#1');
  });

  it('poder da última vaza entra antes do próximo Ritual e Magia Nula não o bloqueia', () => {
    let state = ritualState(['doblete-sombrio#1'], [
      ['raven-full'], ['raven-new'], ['raven-waning'], ['raven-waxing'],
    ]);
    state = {
      ...state, ritualPhase: 'play', ritualActiveId: 'doblete-sombrio#1',
      roundStake: 2,
      ritualHands: [[], ['magia-nula#1'], [], []],
      scores: [0, 3], trickWins: [1, 0], trickWinners: [0],
    };
    state = playFullTrick(state, ['raven-full', 'raven-new', 'raven-waning', 'raven-waxing']);
    expect(state.pendingAbility?.stage).toBe('offer');
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'use' });
    expect(state.ritualPhase).toBe('mode');
    expect(state.ritualChooser).toBe(1);
    expect(state.scores).toEqual([2, 3]);
    state = reduce(state, { type: 'ritual-mode', playerId: 'b', blind: false });
    expect(state.scores).toEqual([2, 1]);
    state = reduce(state, { type: 'ritual-play', playerId: 'b', ritualId: 'magia-nula#1' });
    expect(state.pendingAbility).toBeNull();
    expect(state.scores).toEqual([2, 1]);
  });

  it('Mago da última vaza exige decisão antes do Ritual da rodada seguinte', () => {
    let state = ritualState(['doblete-sombrio#1']);
    state = {
      ...state, ritualPhase: 'play', ritualActiveId: 'doblete-sombrio#1', ritualHands: [['runa-da-vontade#1'], ['magia-nula#1'], [], []],
      pendingAbility: { seat: 0, source: 'trick', stage: 'offer', cardId: 'wizard-full', endRound: { team: 0, reason: 'tricks' } },
    };
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'use' });
    expect(state.ritualPhase).toBe('mode');
    expect(state.pendingAbility).toBeNull();
    state = reduce(state, { type: 'ritual-mode', playerId: 'b', blind: false });
    expect(state.pendingAbility?.stage).toBe('wizard-target');
    expect(() => reduce(state, { type: 'ritual-reveal', playerId: 'b' })).toThrow('habilidade');
    state = reduce(state, { type: 'ability', playerId: 'a', choice: '1' });
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'keep' });
    expect(state.pendingAbility).toBeNull();
    expect(state.ritualPhase).toBe('revealed');
  });

  it('Grifo resolve às cegas antes do Ritual com olhinho', () => {
    let state = ritualState(['mapa-do-destino#1', 'magia-nula#1']);
    state = { ...state, ritualPhase: 'mode', deck: ['raven-full'], pendingRoundAbility: { seat: 0, source: 'trick', stage: 'offer', cardId: 'griffin-full', endRound: null, fromPreviousRound: true } };
    state = reduce(state, { type: 'ritual-mode', playerId: 'a', blind: true });
    expect(state.pendingAbility?.stage).toBe('griffin-discard');
    expect(state.ritualPhase).toBe('blind');
    expect(viewFor(state, 'a').hand).toEqual([]);
    expect(viewFor(state, 'a').abilityOptions).toEqual([{ value: '0', label: 'Descartar carta oculta 1' }, { value: '1', label: 'Descartar carta oculta 2' }]);
    expect(JSON.stringify(viewFor(state, 'a'))).not.toContain('raven-full');
    expect(() => reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'mapa-do-destino#1', prediction: '2-0' })).toThrow('habilidade');
    state = reduce(state, { type: 'ability', playerId: 'a', choice: '1' });
    expect(state.discard).toContain('raven-full');
    for (const playerId of players) expect(viewFor(state, playerId).lastCreatureReveal).toMatchObject({
      reason: 'blind-discard', source: 'griffin', seat: 0, card: { id: 'raven-full' },
    });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'mapa-do-destino#1', prediction: '2-0' });
    expect(state.ritualPhase).toBe('play');
  });

  it('Titereiro sem olhinho permite escolher a criatura nova vista antes do Ritual', () => {
    let state = ritualState(['magia-nula#1'], [
      ['arcana-full'], ['raven-new'], ['wolf-new', 'fairy-new', 'goblin-new', 'witch-full'], ['griffin-new'],
    ]);
    state = { ...state, ritualPhase: 'mode', ritualExchange: { seat: 2, newCardIds: ['wolf-new', 'fairy-new', 'goblin-new'], discardsLeft: 1 } };
    state = reduce(state, { type: 'ritual-mode', playerId: 'a', blind: false });
    expect(state.ritualPhase).toBe('revealed-discard');
    expect(viewFor(state, 'c').ritualDiscardOptions.map(option => option.value)).toEqual(['wolf-new', 'fairy-new', 'goblin-new']);
    expect(() => reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'magia-nula#1' })).toThrow();
    state = reduce(state, { type: 'ritual-discard', playerId: 'c', choice: 'fairy-new' });
    expect(state.ritualPhase).toBe('revealed');
    expect(state.hands[2]).toEqual(['wolf-new', 'goblin-new', 'witch-full']);
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'magia-nula#1' });
    expect(state.ritualPhase).toBe('play');
  });

  it('Fada olha duas cartas adversárias antes do Ritual com olhinho sem ver a própria mão', () => {
    let state = ritualState([], [
      ['fairy-full', 'arcana-new'], ['wolf-full', 'goblin-full'], ['witch-new'], ['raven-new'],
    ]);
    state = {
      ...state, ritualPhase: 'mode', ritualChooser: 1, ritualHands: [[], ['mapa-do-destino#1'], [], []],
      pendingRoundAbility: { seat: 0, source: 'trick', stage: 'offer', cardId: 'fairy-full', endRound: null, fromPreviousRound: true },
    };
    state = reduce(state, { type: 'ritual-mode', playerId: 'b', blind: true });
    expect(state.pendingAbility?.stage).toBe('fairy-target');
    state = reduce(state, { type: 'ability', playerId: 'a', choice: '1' });
    expect(viewFor(state, 'a').hand).toEqual([]);
    expect(viewFor(state, 'a').abilityOptions.map(option => option.card?.id)).toEqual(expect.arrayContaining(['wolf-full', 'goblin-full']));
    expect(viewFor(state, 'c').abilityOptions).toEqual([]);
    expect(() => reduce(state, { type: 'ritual-play', playerId: 'b', ritualId: 'mapa-do-destino#1', prediction: '2-0' })).toThrow('habilidade');
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'wolf-full' });
    expect(state.discard).toContain('wolf-full');
    state = reduce(state, { type: 'ritual-play', playerId: 'b', ritualId: 'mapa-do-destino#1', prediction: '2-0' });
    expect(state.ritualPhase).toBe('play');
  });

  it('Goblin com olhinho entrega carta oculta e revela a troca a todos', () => {
    let state = ritualState(['mapa-do-destino#1'], [
      ['arcana-full'], ['raven-new'], ['wolf-new', 'witch-new'], ['griffin-new'],
    ]);
    state = {
      ...state, ritualPhase: 'mode', pendingRoundAbility: { seat: 2, source: 'trick', stage: 'offer', cardId: 'goblin-full', endRound: null, fromPreviousRound: true },
    };
    state = reduce(state, { type: 'ritual-mode', playerId: 'a', blind: true });
    expect(viewFor(state, 'c').abilityOptions.map(option => option.value)).toEqual(['skip', '0', '1']);
    expect(viewFor(state, 'c').hand).toEqual([]);
    expect(() => reduce(state, { type: 'ability', playerId: 'c', choice: 'wolf-new' })).toThrow();
    state = reduce(state, { type: 'ability', playerId: 'c', choice: '0' });
    state = reduce(state, { type: 'ability', playerId: 'c', choice: '1' });
    expect(state.scores[0]).toBe(1);
    for (const playerId of players) expect(viewFor(state, playerId).lastCreatureReveal).toMatchObject({
      reason: 'goblin', card: { id: 'raven-new' }, tradedCard: { id: 'wolf-new' }, pointAwarded: true,
    });
    expect(viewFor(state, 'c').hand).toEqual([]);
  });

  it('Goblin e Grifo sem olhinho deixam escolher uma criatura vista', () => {
    let goblin = ritualState(['magia-nula#1'], [
      ['arcana-full'], ['raven-new'], ['wolf-new', 'witch-new'], ['griffin-new'],
    ]);
    goblin = { ...goblin, ritualPhase: 'mode', pendingRoundAbility: { seat: 2, source: 'trick', stage: 'offer', cardId: 'goblin-full', endRound: null, fromPreviousRound: true } };
    goblin = reduce(goblin, { type: 'ritual-mode', playerId: 'a', blind: false });
    expect(viewFor(goblin, 'c').hand.map(card => card.id)).toEqual(['wolf-new', 'witch-new']);
    goblin = reduce(goblin, { type: 'ability', playerId: 'c', choice: 'witch-new' });
    expect(goblin.pendingAbility?.stage).toBe('goblin-target');

    let griffin = ritualState(['magia-nula#1']);
    griffin = { ...griffin, ritualPhase: 'mode', deck: ['raven-full'], pendingRoundAbility: { seat: 0, source: 'trick', stage: 'offer', cardId: 'griffin-full', endRound: null, fromPreviousRound: true } };
    griffin = reduce(griffin, { type: 'ritual-mode', playerId: 'a', blind: false });
    expect(viewFor(griffin, 'a').abilityOptions.map(option => option.value)).toEqual(['arcana-full', 'raven-full']);
    griffin = reduce(griffin, { type: 'ability', playerId: 'a', choice: 'arcana-full' });
    expect(griffin.discard).toContain('arcana-full');
    expect(griffin.hands[0]).toEqual(['raven-full']);
  });

  it('Mago não pode trocar o último Ritual da modalidade declarada', () => {
    let state = ritualState(['mapa-do-destino#1']);
    state = {
      ...state, ritualPhase: 'mode', ritualHands: [['mapa-do-destino#1'], ['magia-nula#1'], [], []],
      pendingRoundAbility: { seat: 0, source: 'trick', stage: 'offer', cardId: 'wizard-full', endRound: null, fromPreviousRound: true },
    };
    state = reduce(state, { type: 'ritual-mode', playerId: 'a', blind: true });
    state = reduce(state, { type: 'ability', playerId: 'a', choice: '1' });
    expect(viewFor(state, 'a').abilityOptions.map(option => option.value)).toEqual(['keep']);
    expect(() => reduce(state, { type: 'ability', playerId: 'a', choice: 'swap' })).toThrow('modalidade declarada');
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'keep' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'mapa-do-destino#1', prediction: '2-0' });
    expect(state.ritualPhase).toBe('play');
  });

  it('a modalidade declarada não pode ser trocada depois do poder', () => {
    let state = ritualState(['mapa-do-destino#1', 'magia-nula#1']);
    state = { ...state, ritualPhase: 'mode', ritualExchange: { seat: 2, newCardIds: state.hands[2]!.slice(0, 1), discardsLeft: 1 } };
    state = reduce(state, { type: 'ritual-mode', playerId: 'a', blind: true });
    state = reduce(state, { type: 'ritual-discard', playerId: 'c', choice: '0' });
    expect(() => reduce(state, { type: 'ritual-reveal', playerId: 'a' })).toThrow('Não é hora');
    expect(() => reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'magia-nula#1' })).toThrow('Veja as criaturas');
  });
});

describe('últimas oito cartas de Ritual', () => {
  it('inclui as 48 artes e aplica a Névoa somente como desempate de Lua na vaza escolhida', () => {
    expect(RITUAL_TEST_DECK).toHaveLength(48);
    let state = ritualState(['nevoa-de-sussurros#1'], [
      ['goblin-new'], ['goblin-full'], ['raven-waning'], ['wolf-full'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'nevoa-de-sussurros#1' });
    state = reduce(state, { type: 'ritual-mist', playerId: 'a', moon: 'new' });
    state = playFullTrick(state, ['goblin-new', 'goblin-full', 'raven-waning', 'wolf-full']);
    expect(state.trickHistory[0]?.winnerSeat).toBe(0);
    expect(() => reduce(state, { type: 'ritual-mist', playerId: 'a', moon: 'full' })).toThrow();
  });

  it('Todos por Um espera a decisão após todas as jogadas e usa a soma impressa', () => {
    let state = ritualState(['todos-por-um#1'], [
      ['arcana-full'], ['witch-full'], ['goblin-new'], ['raven-new'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'todos-por-um#1' });
    state = playFullTrick(state, ['arcana-full', 'witch-full', 'goblin-new', 'raven-new']);
    expect(state.ritualSumDecision).toBe(true);
    expect(state.trickHistory).toHaveLength(0);
    state = reduce(state, { type: 'ritual-sum', playerId: 'a', activate: true });
    expect(state.trickHistory[0]?.winnerTeam).toBe(1);
  });

  it('Vínculo permite pegar uma oculta e obriga o próximo rival a trocar outra pelo verso sem revelar a mão', () => {
    let state = ritualState(['vinculo-as-cegas#1'], [
      ['raven-new', 'goblin-new', 'wolf-new'], ['raven-full', 'goblin-full', 'wolf-full'],
      ['fairy-new'], ['fairy-full'],
    ]);
    state = { ...state, deck: ['griffin-new', 'griffin-full'] };
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'vinculo-as-cegas#1' });
    expect(state.ritualPhase).toBe('bond-choice');
    expect(viewFor(state, 'a').hand).toHaveLength(3);
    expect(viewFor(state, 'a').ritualBondDrawCount).toBe(2);
    state = reduce(state, { type: 'ritual-bond-keep', playerId: 'a', discardIds: ['raven-new'] });
    expect(state.ritualPhase).toBe('bond-rival');
    expect(viewFor(state, 'b').hand).toEqual([]);
    expect(viewFor(state, 'b').ritualBondDrawCount).toBe(1);
    state = reduce(state, { type: 'ritual-bond-rival', playerId: 'b', indices: [1] });
    expect(state.ritualPhase).toBe('play');
    expect(state.hands[0]).toHaveLength(3);
    expect(state.hands[1]).toHaveLength(3);
    expect(viewFor(state, 'c').ritualBondDiscards.map(item => item.card.id)).toEqual(['raven-new', 'goblin-full']);
  });

  it('Genjutso recupera a carta após o resultado, sem mudar o vencedor', () => {
    let state = ritualState(['genjutso#1'], [
      ['raven-new', 'arcana-full'], ['witch-full', 'goblin-full'], ['goblin-new', 'fairy-full'], ['fairy-new', 'wolf-new'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'genjutso#1' });
    state = playFullTrick(state, ['raven-new', 'witch-full', 'goblin-new', 'fairy-new']);
    expect(state.ritualGenjutsuDecision).toBe(true);
    expect(state.trickHistory[0]?.winnerSeat).toBe(1);
    state = reduce(state, { type: 'ritual-genjutso', playerId: 'a', recoverCardId: 'raven-new', discardCardId: 'arcana-full' });
    expect(state.trickHistory[0]?.winnerSeat).toBe(1);
    expect(state.hands[0]).toContain('raven-new');
    expect(state.discard).toContain('arcana-full');
    expect(state.ritualGenjutsuUsed).toBe(true);
  });

  it('Genjutso recupera uma criatura própria da primeira vaza após a segunda, sem alterar o resultado', () => {
    let state = ritualState(['genjutso#1'], [
      ['raven-new', 'goblin-new', 'wolf-full'], ['arcana-new', 'wizard-new', 'witch-full'],
      ['wolf-new', 'fairy-new', 'griffin-full'], ['fairy-full', 'puppeteer-new', 'raven-full'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'genjutso#1' });
    state = playFullTrick(state, ['raven-new', 'arcana-new', 'wolf-new', 'fairy-full']);
    expect(state.ritualGenjutsuDecision).toBe(true);
    state = reduce(state, { type: 'ritual-genjutso', playerId: 'a' });
    state = playFullTrick(state, ['wizard-new', 'fairy-new', 'puppeteer-new', 'goblin-new']);
    expect(state.ritualGenjutsuDecision).toBe(true);
    expect(viewFor(state, 'a').ritualGenjutsuChoices.map(card => card.id)).toEqual(['raven-new', 'goblin-new']);
    expect(() => reduce(state, { type: 'ritual-genjutso', playerId: 'a', recoverCardId: 'arcana-new', discardCardId: 'wolf-full' })).toThrow();
    const beforeWinner = state.trickHistory[1]?.winnerSeat;
    state = reduce(state, { type: 'ritual-genjutso', playerId: 'a', recoverCardId: 'raven-new', discardCardId: 'wolf-full' });
    expect(state.hands[0]).toContain('raven-new');
    expect(state.discard).toContain('wolf-full');
    expect(state.trickHistory[1]?.winnerSeat).toBe(beforeWinner);
  });

  it('Vaza Premiada concede o ponto na vaza anunciada', () => {
    let state = ritualState(['vaza-premiada#1'], [
      ['arcana-full'], ['witch-new'], ['wolf-new'], ['fairy-new'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    expect(() => reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'vaza-premiada#1' })).toThrow();
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'vaza-premiada#1', trickNumber: 1 });
    state = playFullTrick(state, ['arcana-full', 'witch-new', 'wolf-new', 'fairy-new']);
    expect(state.scores).toEqual([1, 0]);
    expect(state.ritualWagerAwarded).toBe(true);
  });

  it('Eco Temporal dá +2 a todas as criaturas não Arcanas da equipe nas vazas seguintes', () => {
    let state = ritualState(['eco-temporal#1'], [
      ['raven-new', 'goblin-new'], ['arcana-full', 'griffin-full'],
      ['wolf-new', 'fairy-new'], ['witch-new', 'raven-full'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'eco-temporal#1' });
    state = playFullTrick(state, ['raven-new', 'arcana-full', 'wolf-new', 'witch-new']);
    expect(state.trickHistory[0]?.winnerTeam).toBe(1);
    state = playFullTrick(state, ['griffin-full', 'fairy-new', 'raven-full', 'goblin-new']);
    expect(state.trickHistory[1]?.winnerTeam).toBe(0);
  });

  it('Bênção das Runas exige D6 par e escolhe uma carta física', () => {
    let state = ritualState(['bencao-das-runas#1'], [
      ['raven-new', 'goblin-new'], ['wolf-full'], ['fairy-new'], ['witch-new'],
    ]);
    state = { ...state, rng: 1 };
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'bencao-das-runas#1' });
    state = reduce(state, { type: 'ritual-rune-roll', playerId: 'a' });
    expect(state.ritualRuneRoll).toBe(4);
    expect(state.ritualPhase).toBe('rune-card');
    state = reduce(state, { type: 'ritual-rune-card', playerId: 'a', cardId: 'raven-new' });
    expect(state.ritualRuneCardId).toBe('raven-new');
    expect(viewFor(state, 'b').ritualRuneKind).toBe('raven');
    expect(viewFor(state, 'b').ritualRuneCard).toBeNull();
    expect(viewFor(state, 'a').ritualRuneCard?.id).toBe('raven-new');
    const transferred = { ...state, hands: [state.hands[0]!.filter(id => id !== 'raven-new'),
      [...state.hands[1]!, 'raven-new'], state.hands[2]!, state.hands[3]!] };
    expect(viewFor(transferred, 'b').ritualRuneCard?.id).toBe('raven-new');
    expect(viewFor(transferred, 'c').ritualRuneCard).toBeNull();
  });
});

describe('oitavo lote de Rituais', () => {
  it('Magia Acelerada descarta uma criatura não Arcana e aplica seu poder antes da vaza', () => {
    let state = ritualState(['magia-acelerada#1'], [
      ['raven-new', 'arcana-full'], ['fairy-new'], ['wolf-new'], ['goblin-new'],
    ]);
    state = { ...state, scores: [0, 3] };
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'magia-acelerada#1' });
    expect(state.ritualPhase).toBe('accelerate');
    expect(() => reduce(state, { type: 'ritual-accelerate', playerId: 'a', cardId: 'arcana-full' })).toThrow('Arcana');
    state = reduce(state, { type: 'ritual-accelerate', playerId: 'a', cardId: 'raven-new' });
    expect(state.scores).toEqual([0, 1]);
    expect(state.discard).toContain('raven-new');
    expect(state.lastCreatureReveal?.reason).toBe('accelerated');
    expect(state.ritualPhase).toBe('play');
    expect(state.trick).toEqual([]);
    expect(state.skipNextTrickSeats).toContain(0);
    expect(state.turn).toBe(1);
    expect(() => reduce(state, { type: 'play', playerId: 'a', cardId: 'arcana-full' })).toThrow('vez');
  });

  it('Magia Acelerada deixa o jogador voltar a jogar na segunda vaza', () => {
    let state = ritualState(['magia-acelerada#1'], [
      ['raven-new', 'arcana-full', 'fairy-full'], ['fairy-new', 'goblin-new'],
      ['wolf-new', 'raven-full'], ['goblin-full', 'witch-full'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'magia-acelerada#1' });
    state = reduce(state, { type: 'ritual-accelerate', playerId: 'a', cardId: 'raven-new' });
    expect(state.turn).toBe(1);
    state = playFullTrick(state, ['fairy-new', 'wolf-new', 'goblin-full']);
    expect(state.trickHistory).toHaveLength(1);
    expect(state.trickHistory[0]?.plays.map(play => play.seat)).toEqual([1, 2, 3]);
    expect(state.skipNextTrickSeats).toEqual([]);
    expect(state.hands[0]).toContain('arcana-full');
    if (state.pendingAbility) state = reduce(state, { type: 'ability', playerId: players[state.pendingAbility.seat]!, choice: 'skip' });
    for (let i = 0; state.turn !== 0 && i < 3; i++)
      state = reduce(state, { type: 'play', playerId: players[state.turn]!, cardId: state.hands[state.turn]![0]! });
    expect(state.turn).toBe(0);
    state = reduce(state, { type: 'play', playerId: 'a', cardId: 'arcana-full' });
    expect(state.trick.some(play => play.seat === 0)).toBe(true);
  });

  it('Magia Duplicada soma duas aplicações e abre novas escolhas na segunda', () => {
    let state = ritualState(['magia-duplicada#1'], [
      ['familiar-full'], ['fairy-new'], ['raven-new'], ['wolf-new'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'magia-duplicada#1' });
    state = playFullTrick(state, ['familiar-full', 'fairy-new', 'raven-new', 'wolf-new']);
    expect(state.pendingAbility?.repeatsLeft).toBe(2);
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'use' });
    expect(state.scores).toEqual([2, 0]);
    expect(state.pendingAbility).toBeNull();
  });

  it('Magia Duplicada permite escolher outro alvo na segunda aplicação da Fada', () => {
    let state = ritualState(['magia-duplicada#1'], [
      ['fairy-full'], ['raven-new', 'goblin-new'], ['puppeteer-new'], ['wolf-new', 'griffin-new'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'magia-duplicada#1' });
    state = playFullTrick(state, ['fairy-full', 'raven-new', 'puppeteer-new', 'wolf-new']);
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'use' });
    state = reduce(state, { type: 'ability', playerId: 'a', choice: '1' });
    state = reduce(state, { type: 'ability', playerId: 'a', choice: state.pendingAbility!.candidates![0]! });
    expect(state.pendingAbility?.stage).toBe('fairy-target');
    expect(state.pendingAbility?.repeatsLeft).toBe(1);
    state = reduce(state, { type: 'ability', playerId: 'a', choice: '3' });
    state = reduce(state, { type: 'ability', playerId: 'a', choice: state.pendingAbility!.candidates![0]! });
    expect(state.pendingAbility).toBeNull();
    expect(state.skipNextTrickSeats).toEqual(expect.arrayContaining([1, 3]));
  });

  it('Magia Duplicada permite recuperar duas criaturas com o Titereiro no fim da rodada', () => {
    let state = ritualState(['magia-duplicada#1'], [
      ['puppeteer-full'], ['raven-new'], ['raven-waning'], ['raven-waxing'],
    ]);
    state = { ...state, ritualHands: [['magia-duplicada#1'], ['doblete-sombrio#1'], [], []] };
    state = { ...state, trickWins: [1, 0], trickWinners: [0] };
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'magia-duplicada#1' });
    state = playFullTrick(state, ['puppeteer-full', 'raven-new', 'raven-waning', 'raven-waxing']);
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'use' });
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'raven-new' });
    expect(state.pendingAbility?.stage).toBe('puppet-card');
    expect(state.pendingAbility?.recoveredIds).toEqual(['raven-new']);
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'raven-waning' });
    expect(state.round).toBe(2);
    expect(state.hands[0]).toEqual(expect.arrayContaining(['raven-new', 'raven-waning']));
    expect(state.hands[0]).toHaveLength(5);
    expect(state.ritualExchange?.discardsLeft).toBe(2);
    state = reduce(state, { type: 'ritual-mode', playerId: 'b', blind: false });
    expect(state.ritualPhase).toBe('revealed-discard');
    state = reduce(state, { type: 'ritual-discard', playerId: 'a', choice: state.ritualExchange!.newCardIds[0]! });
    expect(state.ritualExchange?.discardsLeft).toBe(1);
    state = reduce(state, { type: 'ritual-discard', playerId: 'a', choice: state.ritualExchange!.newCardIds[0]! });
    expect(state.ritualPhase).toBe('revealed');
    expect(state.hands[0]).toHaveLength(3);
    expect(state.hands[0]).toEqual(expect.arrayContaining(['raven-new', 'raven-waning']));
  });

  it('Ritual Oculto aceita jogadas fora de ordem e revela todas juntas no histórico', () => {
    let state = ritualState(['ritual-oculto#1'], [
      ['arcana-full'], ['fairy-new'], ['wolf-new'], ['raven-new'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'ritual-oculto#1' });
    state = reduce(state, { type: 'play', playerId: 'd', cardId: 'raven-new' });
    expect(viewFor(state, 'a').trick[0]?.card).toBeNull();
    state = reduce(state, { type: 'play', playerId: 'b', cardId: 'fairy-new' });
    expect(() => reduce(state, { type: 'raise', playerId: 'b' })).toThrow('vez');
    state = reduce(state, { type: 'raise', playerId: 'a' });
    expect(state.pendingChallenge?.challengerSeat).toBe(0);
    state = reduce(state, { type: 'respond', playerId: 'b', accept: true });
    state = reduce(state, { type: 'play', playerId: 'a', cardId: 'arcana-full' });
    expect(viewFor(state, 'c').trick.every(play => play.card === null)).toBe(true);
    expect(state.trickHistory).toHaveLength(0);
    state = reduce(state, { type: 'play', playerId: 'c', cardId: 'wolf-new' });
    expect(state.trick).toHaveLength(0);
    expect(viewFor(state, 'd').trickHistory[0]?.plays.map(play => play.card.id)).toEqual(['raven-new', 'fairy-new', 'arcana-full', 'wolf-new']);
    expect(state.trickHistory[0]?.winnerSeat).toBe(0);
  });

  it('Enfraquecer permite escolher a vaza e pausa a resolução da última carta', () => {
    let state = ritualState(['enfraquecer#1'], [
      ['goblin-full', 'raven-new'], ['griffin-new', 'wolf-new'],
      ['fairy-new', 'puppeteer-new'], ['raven-waning', 'familiar-new'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'enfraquecer#1' });
    state = playFullTrick(state, ['goblin-full', 'griffin-new', 'fairy-new', 'raven-waning']);
    expect(state.ritualWeakeningDecision).toBe(true);
    expect(state.trickHistory).toHaveLength(0);
    expect(() => reduce(state, { type: 'play', playerId: 'a', cardId: 'raven-new' })).toThrow('Enfraquecer');
    state = reduce(state, { type: 'ritual-weaken', playerId: 'a' });
    expect(state.ritualWeakeningUsed).toBe(false);
    expect(state.trickHistory[0]?.winnerTeam).toBe(1);
    if (state.pendingAbility) state = reduce(state, { type: 'ability', playerId: state.playerIds[state.pendingAbility.seat]!, choice: 'skip' });
    state = { ...state, turn: 0 };
    state = reduce(state, { type: 'play', playerId: 'a', cardId: 'raven-new' });
    state = reduce(state, { type: 'play', playerId: 'b', cardId: 'wolf-new' });
    state = reduce(state, { type: 'ritual-weaken', playerId: 'a', targetSeat: 1 });
    expect(state.ritualWeakeningUsed).toBe(true);
    expect(state.ritualWeakenedSeat).toBe(1);
  });

  it('Enfraquecer não pode mirar Arcana nem pausa a vaza sem alvo válido', () => {
    let state = ritualState(['enfraquecer#1'], [
      ['goblin-full'], ['arcana-new'], ['fairy-new'], ['arcana-full'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'enfraquecer#1' });
    state = reduce(state, { type: 'play', playerId: 'a', cardId: 'goblin-full' });
    state = reduce(state, { type: 'play', playerId: 'b', cardId: 'arcana-new' });
    expect(() => reduce(state, { type: 'ritual-weaken', playerId: 'a', targetSeat: 1 })).toThrow('exceto Arcana');
    state = reduce(state, { type: 'play', playerId: 'c', cardId: 'fairy-new' });
    state = reduce(state, { type: 'play', playerId: 'd', cardId: 'arcana-full' });
    expect(state.ritualWeakeningDecision).toBe(false);
    expect(state.trickHistory).toHaveLength(1);
    expect(state.trickHistory[0]?.winnerTeam).toBe(1);
  });

  it('a criatura enfraquecida perde para outra do mesmo valor original, mesmo com Lua superior', () => {
    let state = ritualState(['enfraquecer#1'], [
      ['goblin-new'], ['goblin-full'], ['raven-new'], ['wolf-new'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'enfraquecer#1' });
    state = reduce(state, { type: 'play', playerId: 'a', cardId: 'goblin-new' });
    state = reduce(state, { type: 'play', playerId: 'b', cardId: 'goblin-full' });
    state = reduce(state, { type: 'ritual-weaken', playerId: 'a', targetSeat: 1 });
    state = reduce(state, { type: 'play', playerId: 'c', cardId: 'raven-new' });
    state = reduce(state, { type: 'play', playerId: 'd', cardId: 'wolf-new' });
    expect(state.trickHistory[0]?.winnerSeat).toBe(0);
    expect(state.trickHistory[0]?.weakenedSeat).toBe(1);
  });
});

describe('nono lote de Rituais', () => {
  it('inclui Silêncio, Permuta, Ciclo e Caldeirão no baralho e nas artes', () => {
    expect(RITUAL_TEST_DECK).toHaveLength(48);
    for (const kind of ['silencio-da-bruxa', 'permuta-profana', 'ciclo-da-lua', 'caldeirao-bipolar'])
      expect(RITUAL_TEST_DECK).toContain(`${kind}#1`);
  });

  it('Silêncio da Bruxa impede pedido e contra-aumento dos rivais durante a rodada', () => {
    let state = ritualState(['silencio-da-bruxa#1']);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'silencio-da-bruxa#1' });
    state = reduce(state, { type: 'play', playerId: 'a', cardId: 'arcana-full' });
    expect(() => reduce(state, { type: 'raise', playerId: 'b' })).toThrow('Silêncio da Bruxa');
    state = { ...state, turn: 2 };
    state = reduce(state, { type: 'raise', playerId: 'c' });
    expect(state.pendingChallenge?.responderSeat).toBe(3);
    expect(() => reduce(state, { type: 'counter', playerId: 'd' })).toThrow('Silêncio da Bruxa');
  });

  it.each([4, 6, 8])('Permuta Profana passa uma carta escolhida ao próximo assento em sala de %i', size => {
    const ids = Array.from({ length: size }, (_, seat) => `p${seat}`);
    let state = createGame(ids, 734, true);
    state = { ...state, ritualChooser: 0, roundStarter: 0, turn: 0, ritualPhase: 'revealed',
      ritualHands: state.ritualHands.map((hand, seat) => seat === 0 ? ['permuta-profana#1'] : hand) };
    state = reduce(state, { type: 'ritual-play', playerId: ids[0]!, ritualId: 'permuta-profana#1' });
    expect(state.ritualPhase).toBe('permutation');
    const before = state.hands.map(hand => [...hand]);
    const chosen = before.map(hand => hand[0]!);
    state = reduce(state, { type: 'ritual-permutation', playerId: ids[0]!, cardId: chosen[0]! });
    expect(state.hands).toEqual(before);
    expect(viewFor(state, ids[1]!).ritualPermutationChosenSeats).toEqual([0]);
    expect(JSON.stringify(viewFor(state, ids[1]!))).not.toContain(chosen[0]);
    expect(() => reduce(state, { type: 'ritual-permutation', playerId: ids[0]!, cardId: chosen[0]! })).toThrow('vez');
    for (let seat = 1; seat < size; seat++)
      state = reduce(state, { type: 'ritual-permutation', playerId: ids[seat]!, cardId: chosen[seat]! });
    expect(state.ritualPhase).toBe('play');
    for (let seat = 0; seat < size; seat++) {
      expect(state.hands[seat]).toHaveLength(before[seat]!.length);
      expect(state.hands[seat]).not.toContain(chosen[seat]);
      expect(state.hands[seat]).toContain(chosen[(seat - 1 + size) % size]);
    }
  });

  it('Ciclo da Lua inverte só o desempate das Luas e mantém a força das criaturas', () => {
    let state = ritualState(['ciclo-da-lua#1'], [
      ['wolf-new'], ['wolf-full'], ['raven-full'], ['puppeteer-full'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'ciclo-da-lua#1' });
    state = playFullTrick(state, ['wolf-new', 'wolf-full', 'raven-full', 'puppeteer-full']);
    expect(state.trickHistory[0]?.winnerSeat).toBe(0);
    let arcanaState = ritualState(['ciclo-da-lua#1'], [
      ['wolf-new'], ['wolf-full'], ['arcana-full'], ['puppeteer-full'],
    ]);
    arcanaState = reduce(arcanaState, { type: 'ritual-reveal', playerId: 'a' });
    arcanaState = reduce(arcanaState, { type: 'ritual-play', playerId: 'a', ritualId: 'ciclo-da-lua#1' });
    arcanaState = playFullTrick(arcanaState, ['wolf-new', 'wolf-full', 'arcana-full', 'puppeteer-full']);
    expect(arcanaState.trickHistory[0]?.winnerSeat).toBe(2);
  });

  it('Caldeirão torna todas as Luas da vencedora as mais fracas só na vaza seguinte, inclusive Arcana', () => {
    let state = ritualState(['caldeirao-bipolar#1'], [
      ['arcana-full', 'arcana-waning', 'witch-full'],
      ['wolf-new', 'goblin-new', 'goblin-full'],
      ['raven-new', 'raven-full', 'arcana-new'],
      ['puppeteer-new', 'wolf-full', 'familiar-full'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'caldeirao-bipolar#1' });
    state = playFullTrick(state, ['arcana-full', 'wolf-new', 'raven-new', 'puppeteer-new']);
    expect(state.trickHistory[0]?.winnerSeat).toBe(0);
    expect(state.ritualBipolarWeakKind).toBe('arcana');
    state = playFullTrick(state, ['arcana-waning', 'goblin-new', 'raven-full', 'wolf-full']);
    expect(state.trickHistory[1]?.winnerSeat).toBe(1);
    expect(state.ritualBipolarWeakKind).toBe('goblin');
    if (state.pendingAbility) state = reduce(state, { type: 'ability', playerId: players[state.pendingAbility.seat]!, choice: 'skip' });
    state = playFullTrick(state, ['goblin-full', 'arcana-new', 'familiar-full', 'witch-full']);
    expect(state.lastRoundTricks[2]?.winnerSeat).toBe(2);
    expect(state.ritualBipolarWeakKind).toBeNull();
  });
});

describe('décimo lote de Rituais', () => {
  it('Campeões Ocultos escolhe posições pelo verso e decide a rodada em uma vaza', () => {
    let state = ritualState(['campeoes-ocultos#1'], [
      ['arcana-new', 'raven-new', 'wolf-new'], ['fairy-new', 'goblin-new', 'griffin-new'],
      ['familiar-new', 'wizard-new', 'witch-new'], ['arcana-full', 'raven-full', 'wolf-full'],
    ]);
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'campeoes-ocultos#1' });
    expect(state.ritualPhase).toBe('champions');
    expect(viewFor(state, 'a').hand).toEqual([]);
    expect(viewFor(state, 'b').hand).toEqual([]);
    expect(viewFor(state, 'a').ritualChampionTargetSeat).toBe(0);
    expect(() => reduce(state, { type: 'ritual-champion', playerId: 'b', index: 0 })).toThrow('vez');
    for (const index of [0, 1, 2, 0])
      state = reduce(state, { type: 'ritual-champion', playerId: 'a', index });
    expect(state.ritualPhase).toBe('play');
    expect(state.hands).toEqual([['arcana-new'], ['goblin-new'], ['witch-new'], ['arcana-full']]);
    expect(state.discard).toHaveLength(8);
    state = playFullTrick(state, ['arcana-new', 'goblin-new', 'witch-new', 'arcana-full']);
    expect(state.round).toBe(2);
    expect(state.lastRoundTricks).toHaveLength(1);
    expect(state.lastRound?.winner).toBe(1);
  });

  it('Turbilhão concede a primeira vaza com os descartes revelados e deixa duas vazas jogáveis', () => {
    let state = ritualState(['turbilhao-do-destino#1'], [
      ['wolf-new', 'wolf-waning', 'wolf-waxing'], ['raven-full', 'goblin-new', 'fairy-new'],
      ['griffin-new', 'griffin-waning', 'griffin-waxing'], ['puppeteer-new', 'puppeteer-waning', 'goblin-waning'],
    ]);
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'turbilhao-do-destino#1' });
    expect(state.ritualPhase).toBe('play');
    expect(state.hands.map(hand => hand.length)).toEqual([2, 3, 2, 3]);
    expect(state.ritualTurbulentDiscards.map(item => item.seat)).toEqual([0, 2]);
    expect(state.discard).toHaveLength(2);
    expect(viewFor(state, 'd').ritualTurbulentDiscards).toHaveLength(2);
    expect(state.trickWins).toEqual([1, 0]);
    expect(state.trickHistory[0]).toMatchObject({ synthetic: true, winnerTeam: 0 });
    expect(state.trickHistory[0]?.plays.map(play => play.cardId)).toEqual(state.ritualTurbulentDiscards.map(item => item.cardId));
    state = playFullTrick(state, [state.hands[0]![0]!, 'raven-full', state.hands[2]![0]!, 'puppeteer-new']);
    if (state.pendingAbility) state = reduce(state, { type: 'ability', playerId: players[state.pendingAbility.seat]!, choice: 'skip' });
    expect(state.round).toBe(2);
    expect(state.lastRoundTricks).toHaveLength(2);
    expect(state.lastRound?.trickWinners).toEqual([0, 0]);
  });

  it('Turbilhão concede a vaza com um descarte de cada aliado em oito assentos', () => {
    const ids = Array.from({ length: 8 }, (_, seat) => `p${seat}`);
    let state = createGame(ids, 987, true);
    state = { ...state, ritualChooser: 0, roundStarter: 0, turn: 0, ritualPhase: 'blind',
      ritualHands: ids.map((_, seat) => seat === 0 ? ['turbilhao-do-destino#1'] : []) };
    state = reduce(state, { type: 'ritual-play', playerId: 'p0', ritualId: 'turbilhao-do-destino#1' });
    expect(state.hands.map(hand => hand.length)).toEqual([2, 3, 2, 3, 2, 3, 2, 3]);
    expect(state.trickHistory[0]?.plays.map(play => play.seat)).toEqual([0, 2, 4, 6]);
    expect(state.trickWins).toEqual([1, 0]);
    expect(viewFor(state, 'p7').trickHistory[0]?.plays).toHaveLength(4);
  });

  it('Força Oculta exige escolha de valor 1–6, lança D6 e fortalece todas as Luas da criatura', () => {
    let state = ritualState(['forca-oculta#1'], [
      ['raven-new'], ['arcana-new'], ['griffin-full'], ['wolf-new'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    expect(() => reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'forca-oculta#1', creatureKind: 'arcana' })).toThrow('valor 1 a 6');
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'forca-oculta#1', creatureKind: 'griffin' });
    expect(state.ritualPhase).toBe('force-roll');
    expect(() => reduce(state, { type: 'ritual-force-roll', playerId: 'b' })).toThrow('vez');
    state = reduce(state, { type: 'ritual-force-roll', playerId: 'a' });
    expect(state.ritualForceRoll).toBeGreaterThanOrEqual(1);
    expect(state.ritualForceRoll).toBeLessThanOrEqual(6);
    expect(viewFor(state, 'd').ritualForceRoll).toBe(state.ritualForceRoll);
    state = { ...state, ritualForceRoll: 6 };
    state = playFullTrick(state, ['raven-new', 'arcana-new', 'griffin-full', 'wolf-new']);
    expect(state.trickHistory[0]?.winnerSeat).toBe(2);
  });

  it('Profecia Maia anuncia às cegas e fortalece cartas do número de toda a equipe', () => {
    let state = ritualState(['profecia-maia#1'], [
      ['raven-new'], ['familiar-new'], ['griffin-new'], ['wolf-new'],
    ]);
    expect(() => reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'profecia-maia#1' })).toThrow('Anuncie');
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'profecia-maia#1', numberValue: 6 });
    expect(state.ritualProphecyCardIds).toEqual(['griffin-new']);
    expect(viewFor(state, 'b').ritualProphecyNumber).toBe(6);
    state = playFullTrick(state, ['raven-new', 'familiar-new', 'griffin-new', 'wolf-new']);
    expect(state.trickHistory[0]?.winnerSeat).toBe(2);
  });
});

describe('terceiro lote de Rituais', () => {
  it('Roubo Arcano mostra uma fotografia da mão adversária somente a quem jogou o Ritual', () => {
    let state = ritualState(['roubo-arcano#1'], [
      ['arcana-full'], ['witch-new', 'wolf-new'], ['fairy-new'], ['goblin-new'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    expect(() => reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'roubo-arcano#1', targetSeat: 2 })).toThrow('adversário');
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'roubo-arcano#1', targetSeat: 1 });
    expect(viewFor(state, 'a').ritualPeekCards.map(card => card.id)).toEqual(['witch-new', 'wolf-new']);
    for (const id of ['b', 'c', 'd']) expect(viewFor(state, id).ritualPeekCards).toEqual([]);
    state = reduce(state, { type: 'play', playerId: 'a', cardId: 'arcana-full' });
    state = reduce(state, { type: 'play', playerId: 'b', cardId: 'witch-new' });
    expect(viewFor(state, 'a').ritualPeekCards.map(card => card.id)).toEqual(['witch-new', 'wolf-new']);
  });

  it('Olho da Verdade expõe a mão atual do alvo a todos, sem mostrar outras mãos', () => {
    let state = ritualState(['olho-da-verdade#1'], [
      ['arcana-full'], ['witch-new', 'wolf-new'], ['fairy-new'], ['goblin-new'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'olho-da-verdade#1', targetSeat: 1 });
    for (const id of players) {
      const view = viewFor(state, id);
      expect(view.players[1]?.visibleHand?.map(card => card.id)).toEqual(['witch-new', 'wolf-new']);
      expect(view.players[2]?.visibleHand).toBeUndefined();
    }
    state = reduce(state, { type: 'play', playerId: 'a', cardId: 'arcana-full' });
    state = reduce(state, { type: 'play', playerId: 'b', cardId: 'witch-new' });
    expect(viewFor(state, 'd').players[1]?.visibleHand?.map(card => card.id)).toEqual(['wolf-new']);
  });

  it('Espelho permite decisão individual, troca mãos inteiras e impede repetir adversário', () => {
    let state = ritualState(['espelho-enfeiticado#1'], [
      ['arcana-full', 'wolf-full'], ['witch-new'], ['fairy-new'], ['goblin-new', 'raven-new'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'espelho-enfeiticado#1' });
    expect(state.ritualPhase).toBe('mirror');
    expect(viewFor(state, 'd').ritualDecisionSeat).toBe(0);
    expect(() => reduce(state, { type: 'ritual-mirror', playerId: 'c', targetSeat: 3 })).toThrow('Não é sua vez');
    state = reduce(state, { type: 'ritual-mirror', playerId: 'a', targetSeat: 1 });
    expect(state.hands[0]).toEqual(['witch-new']);
    expect(state.hands[1]).toEqual(['arcana-full', 'wolf-full']);
    expect(viewFor(state, 'c').ritualDecisionSeat).toBe(2);
    expect(() => reduce(state, { type: 'ritual-mirror', playerId: 'c', targetSeat: 1 })).toThrow('já foi escolhido');
    state = reduce(state, { type: 'ritual-mirror', playerId: 'c', targetSeat: 3 });
    expect(state.hands[2]).toEqual(['goblin-new', 'raven-new']);
    expect(state.hands[3]).toEqual(['fairy-new']);
    expect(state.ritualPhase).toBe('play');
  });

  it('Acordo revela mãos só aos parceiros; ambos aceitam ou um desiste por 1 ponto rival', () => {
    let state = ritualState(['acordo-de-sangue#1'], [
      ['arcana-full'], ['witch-new'], ['fairy-new'], ['goblin-new'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'acordo-de-sangue#1' });
    expect(state.ritualPhase).toBe('blood-vote');
    expect(viewFor(state, 'a').ritualTeammateHand?.cards.map(card => card.id)).toEqual(['fairy-new']);
    expect(viewFor(state, 'c').ritualTeammateHand?.cards.map(card => card.id)).toEqual(['arcana-full']);
    expect(viewFor(state, 'b').ritualTeammateHand).toBeNull();
    expect(() => reduce(state, { type: 'ritual-blood', playerId: 'c', play: true })).toThrow('Não é sua vez');
    state = reduce(state, { type: 'ritual-blood', playerId: 'a', play: true });
    const refused = reduce(state, { type: 'ritual-blood', playerId: 'c', play: false });
    expect(refused.scores).toEqual([0, 1]);
    expect(refused.lastRound?.reason).toBe('blood-withdrawal');
    state = reduce(state, { type: 'ritual-blood', playerId: 'c', play: true });
    expect(state.ritualPhase).toBe('play');
    expect(state.roundStake).toBe(3);
    state = reduce(state, { type: 'raise', playerId: 'a' });
    state = reduce(state, { type: 'respond', playerId: 'b', accept: true });
    expect(state.roundStake).toBe(5);
  });
});

describe('segundo lote de Rituais', () => {
  it('teste solo prepara o Ritual escolhido na mão do primeiro jogador sem duplicar cartas', () => {
    for (const kind of ['veu-da-incerteza', 'escolha-da-ancia', 'mao-cega', 'magia-nula'] as const) {
      const state = createRitualScenario(players, kind);
      expect(state.ritualChooser).toBe(0);
      expect(state.ritualPhase).toBe('blind');
      expect(state.ritualHands[0]!.some(id => id.startsWith(`${kind}#`))).toBe(true);
      const all = [...state.ritualDeck, ...state.ritualHands.flat()];
      expect(all).toHaveLength(RITUAL_TEST_DECK.length);
      expect(new Set(all).size).toBe(all.length);
    }
  });
  it('Maldição tira três pontos da equipe derrotada após Trick recusado e respeita o mínimo zero', () => {
    let state = ritualState(['maldicao-da-derrota#1'], [
      ['arcana-full'], ['arcana-new'], ['arcana-waning'], ['arcana-waxing'],
    ]);
    state = { ...state, scores: [4, 5] };
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'maldicao-da-derrota#1' });
    state = reduce(state, { type: 'raise', playerId: 'a' });
    state = reduce(state, { type: 'respond', playerId: 'b', accept: false });
    expect(state.scores).toEqual([5, 2]);
    expect(state.lastRound?.loserPenalty).toBe(3);

    let floor = ritualState(['maldicao-da-derrota#2'], [
      ['arcana-full'], ['arcana-new'], ['arcana-waning'], ['arcana-waxing'],
    ]);
    floor = { ...floor, scores: [0, 1] };
    floor = reduce(floor, { type: 'ritual-reveal', playerId: 'a' });
    floor = reduce(floor, { type: 'ritual-play', playerId: 'a', ritualId: 'maldicao-da-derrota#2' });
    floor = reduce(floor, { type: 'raise', playerId: 'a' });
    floor = reduce(floor, { type: 'respond', playerId: 'b', accept: false });
    expect(floor.scores).toEqual([1, 0]);
    expect(floor.lastRound?.loserPenalty).toBe(1);
  });

  it('Anciã dá três criaturas extras a cada aliado e exige três descartes privados de cada um', () => {
    let state = ritualState(['escolha-da-ancia#1'], [
      ['arcana-full', 'witch-new', 'wolf-new'], ['arcana-new', 'fairy-new', 'raven-new'],
      ['arcana-waning', 'goblin-new', 'griffin-new'], ['arcana-waxing', 'familiar-new', 'puppeteer-new'],
    ]);
    state = { ...state, deck: ['raven-full', 'wolf-full', 'fairy-full', 'goblin-full', 'griffin-full', 'witch-full'] };
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'escolha-da-ancia#1' });
    expect(state.hands.map(hand => hand.length)).toEqual([6, 3, 6, 3]);
    expect(state.ritualPhase).toBe('ancient-discard');
    expect(viewFor(state, 'a').ancientDiscardSeat).toBe(0);
    expect(viewFor(state, 'b').hand.map(card => card.id)).toEqual(state.hands[1]);
    expect(() => reduce(state, { type: 'play', playerId: 'a', cardId: state.hands[0]![0]! })).toThrow('Ritual');
    expect(() => reduce(state, { type: 'ritual-ancient-discard', playerId: 'c', cardId: state.hands[2]![0]! })).toThrow('Não é sua vez');
    for (const seat of [0, 2]) for (let i = 0; i < 3; i++) {
      state = reduce(state, { type: 'ritual-ancient-discard', playerId: players[seat]!, cardId: state.hands[seat]![0]! });
    }
    expect(state.hands.map(hand => hand.length)).toEqual([3, 3, 3, 3]);
    expect(state.discard).toHaveLength(6);
    expect(state.ritualPhase).toBe('play');
  });

  it('Véu mantém as quatro mãos ocultas e aceita somente posição de carta na vaza', () => {
    let state = ritualState(['veu-da-incerteza#1'], [
      ['arcana-full', 'witch-new'], ['arcana-new', 'fairy-new'],
      ['arcana-waning', 'goblin-new'], ['arcana-waxing', 'wolf-new'],
    ]);
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'veu-da-incerteza#1' });
    for (const id of players) {
      expect(viewFor(state, id).hand).toEqual([]);
      expect(viewFor(state, id).blindSeats).toEqual([0, 1, 2, 3]);
    }
    expect(() => reduce(state, { type: 'play', playerId: 'a', cardId: 'arcana-full' })).toThrow('pelo verso');
    state = reduce(state, { type: 'play', playerId: 'a', cardId: '0' });
    expect(state.trick[0]?.cardId).toBe('arcana-full');
    expect(viewFor(state, 'a').hand).toEqual([]);
    expect(viewFor(state, 'a').trick[0]?.card?.id).toBe('arcana-full');
  });

  it('Mão Cega limita a cegueira ao adversário escolhido', () => {
    let state = ritualState(['mao-cega#1'], [
      ['arcana-full'], ['arcana-new'], ['arcana-waning'], ['arcana-waxing'],
    ]);
    expect(() => reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'mao-cega#1', targetSeat: 2 })).toThrow('adversário');
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'mao-cega#1', targetSeat: 1 });
    expect(viewFor(state, 'a').blindSeats).toEqual([1]);
    expect(viewFor(state, 'a').hand.map(card => card.id)).toEqual(['arcana-full']);
    expect(viewFor(state, 'b').hand).toEqual([]);
    state = reduce(state, { type: 'play', playerId: 'a', cardId: 'arcana-full' });
    expect(() => reduce(state, { type: 'play', playerId: 'b', cardId: 'arcana-new' })).toThrow('pelo verso');
    state = reduce(state, { type: 'play', playerId: 'b', cardId: '0' });
    expect(state.trick[1]?.cardId).toBe('arcana-new');
  });
});

describe('quarto lote de Rituais', () => {
  function choose(kind: 'escudo-arcano' | 'zebra-mistica' | 'blefe-premiado' | 'visao-compartilhada', hands?: GameState['hands'], scores?: GameState['scores']): GameState {
    let state = ritualState([`${kind}#1`], hands);
    if (scores) state = { ...state, scores };
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    return reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: `${kind}#1` });
  }

  it('Escudo tira um ponto da equipe que vence contra quem jogou o Ritual, inclusive após Trick recusado', () => {
    let state = choose('escudo-arcano', [
      ['witch-new'], ['arcana-full'], ['wolf-new'], ['fairy-new'],
    ], [4, 14]);
    state = { ...state, turn: 1 };
    state = reduce(state, { type: 'raise', playerId: 'b' });
    state = reduce(state, { type: 'respond', playerId: 'c', accept: false });
    expect(state.scores).toEqual([4, 14]);
    expect(state.winner).toBeNull();
    expect(state.lastRound?.winnerPenalty).toBe(1);
    expect(state.lastRound?.points).toBe(1);
  });

  it('Zebra fixa a equipe atrás no instante da escolha; empate não cria bônus', () => {
    let state = choose('zebra-mistica', [
      ['arcana-full'], ['witch-new'], ['wolf-new'], ['fairy-new'],
    ], [2, 4]);
    expect(state.ritualTrailingTeam).toBe(0);
    state = { ...state, scores: [5, 4] };
    state = reduce(state, { type: 'raise', playerId: 'a' });
    state = reduce(state, { type: 'respond', playerId: 'b', accept: false });
    expect(state.scores).toEqual([7, 4]);
    expect(state.lastRound?.bonusPoints).toBe(1);

    state = choose('zebra-mistica', undefined, [3, 3]);
    expect(state.ritualTrailingTeam).toBeNull();
    state = reduce(state, { type: 'raise', playerId: 'a' });
    state = reduce(state, { type: 'respond', playerId: 'b', accept: false });
    expect(state.lastRound?.bonusPoints).toBeUndefined();
  });

  it('Blefe dá dois pontos só à equipe do Ritual quando ela não jogou Arcana', () => {
    let state = choose('blefe-premiado', [
      ['raven-new'], ['arcana-new'], ['wolf-new'], ['fairy-new'],
    ]);
    state = { ...state, arcanaPlayedTeams: [1] };
    state = reduce(state, { type: 'raise', playerId: 'a' });
    state = reduce(state, { type: 'respond', playerId: 'b', accept: false });
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'skip' });
    expect(state.scores).toEqual([3, 0]);
    expect(state.lastRound?.bonusPoints).toBe(2);

    state = choose('blefe-premiado', [
      ['arcana-full', 'raven-new'], ['witch-new'], ['wolf-new'], ['fairy-new'],
    ]);
    state = playFullTrick(state, ['arcana-full', 'witch-new', 'wolf-new', 'fairy-new']);
    expect(state.arcanaPlayedTeams).toContain(0);
    state = reduce(state, { type: 'raise', playerId: 'a' });
    state = reduce(state, { type: 'respond', playerId: 'b', accept: false });
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'skip' });
    expect(state.scores).toEqual([1, 0]);
    expect(state.lastRound?.bonusPoints).toBeUndefined();

    state = choose('blefe-premiado', [
      ['witch-new'], ['arcana-full'], ['wolf-new'], ['fairy-new'],
    ]);
    state = { ...state, turn: 1 };
    state = reduce(state, { type: 'raise', playerId: 'b' });
    state = reduce(state, { type: 'respond', playerId: 'c', accept: false });
    expect(state.scores).toEqual([0, 1]);
  });

  it('Visão revela a mão atual somente à equipe do Ritual e acompanha cartas jogadas', () => {
    let state = choose('visao-compartilhada', [
      ['arcana-full'], ['witch-new'], ['wolf-new', 'raven-new'], ['fairy-new'],
    ]);
    expect(viewFor(state, 'a').ritualTeammateHands[0]?.cards.map(card => card.id)).toEqual(['wolf-new', 'raven-new']);
    expect(viewFor(state, 'c').ritualTeammateHands[0]?.cards.map(card => card.id)).toEqual(['arcana-full']);
    expect(viewFor(state, 'b').ritualTeammateHands).toEqual([]);
    expect(viewFor(state, 'd').ritualTeammateHands).toEqual([]);
    state = reduce(state, { type: 'play', playerId: 'a', cardId: 'arcana-full' });
    expect(viewFor(state, 'c').ritualTeammateHands[0]?.cards).toEqual([]);
  });
});

describe('quinto lote de Rituais', () => {
  function choose(kind: 'cartada-fantasma' | 'tempestade-de-cartas' | 'lua-invertida' | 'controle-mental', hands: GameState['hands']): GameState {
    let state = ritualState([`${kind}#1`], hands);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    return reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: `${kind}#1` });
  }

  it('Cartada Fantasma encerra a rodada após uma vaza completa, com as quatro cartas no histórico', () => {
    let state = choose('cartada-fantasma', [
      ['arcana-full'], ['witch-new'], ['wolf-new'], ['fairy-new'],
    ]);
    expect(() => reduce(state, { type: 'play', playerId: 'a', cardId: 'witch-new' })).toThrow();
    state = playFullTrick(state, ['arcana-full', 'witch-new', 'wolf-new', 'fairy-new']);
    expect(state.round).toBe(2);
    expect(state.scores).toEqual([1, 0]);
    expect(state.lastRound?.trickWinners).toEqual([0]);
    expect(state.lastRoundTricks[0]?.plays).toHaveLength(4);
  });

  it('Tempestade mistura apenas as mãos e preserva a quantidade de cartas de cada pessoa', () => {
    const original = [
      ['arcana-full', 'witch-new', 'wolf-new'], ['fairy-new', 'raven-full'],
      ['goblin-new', 'griffin-new', 'wizard-new'], ['puppeteer-new'],
    ];
    const state = choose('tempestade-de-cartas', original);
    expect(state.hands.map(hand => hand.length)).toEqual([3, 2, 3, 1]);
    expect(state.hands.flat().sort()).toEqual(original.flat().sort());
    expect(state.hands).not.toEqual(original);
    expect(state.deck).toHaveLength(0);
    expect(state.ritualPhase).toBe('play');
    expect(viewFor(state, 'a').players[1]?.visibleHand).toBeUndefined();
    expect(viewFor(state, 'a').hand.map(card => card.id)).toEqual(state.hands[0]);
  });

  it('Lua Invertida põe a criatura menor acima da maior e inverte também a Lua', () => {
    let state = choose('lua-invertida', [
      ['raven-full'], ['witch-new'], ['raven-new'], ['fairy-new'],
    ]);
    state = playFullTrick(state, ['raven-full', 'witch-new', 'raven-new', 'fairy-new']);
    expect(state.lastTrickWinner).toBe(2);
    expect(state.trickWinners).toEqual([0]);

    state = choose('lua-invertida', [
      ['raven-new'], ['arcana-full'], ['arcana-new'], ['witch-new'],
    ]);
    state = playFullTrick(state, ['raven-new', 'arcana-full', 'arcana-new', 'witch-new']);
    expect(state.lastTrickWinner).toBe(2);
  });

  it('Controle Mental exige sorteio no servidor para adversários à esquerda, sem retirar o direito de pedir Trick', () => {
    let state = choose('controle-mental', [
      ['arcana-full', 'wolf-new'], ['witch-new', 'raven-new'],
      ['fairy-new', 'goblin-new'], ['arcana-new', 'griffin-new'],
    ]);
    expect(viewFor(state, 'a').mindControlledSeats).toEqual([1, 3]);
    state = reduce(state, { type: 'play', playerId: 'a', cardId: 'arcana-full' });
    expect(() => reduce(state, { type: 'play', playerId: 'b', cardId: 'witch-new' })).toThrow('sua vez');
    state = reduce(state, { type: 'raise', playerId: 'b' });
    state = reduce(state, { type: 'respond', playerId: 'c', accept: true });
    const expected = state.hands[1]!;
    expect(() => reduce(state, { type: 'play', playerId: 'a', cardId: 'random' })).toThrow('Aguarde');
    state = reduce(state, { type: 'mind-ready', playerId: 'b' });
    expect(() => reduce(state, { type: 'raise', playerId: 'b' })).toThrow('entregue');
    expect(() => reduce(state, { type: 'play', playerId: 'a', cardId: 'witch-new' })).toThrow('Controle Mental');
    state = reduce(state, { type: 'play', playerId: 'a', cardId: 'random' });
    expect(expected).toContain(state.trick[1]?.cardId);
    expect(state.trick[1]?.seat).toBe(1);
    expect(state.hands[1]).toHaveLength(1);
    expect(state.mindControlReady).toBe(false);
    expect(viewFor(state, 'a').players[1]?.visibleHand).toBeUndefined();
  });

  it('Controle Mental também cobre todos os adversários em salas de seis e oito', () => {
    for (const count of [6, 8]) {
      const ids = Array.from({ length: count }, (_, index) => `p${index}`);
      let state = createRitualScenario(ids, 'controle-mental');
      state = reduce(state, { type: 'ritual-reveal', playerId: ids[0]! });
      state = reduce(state, { type: 'ritual-play', playerId: ids[0]!, ritualId: 'controle-mental#1' });
      expect(viewFor(state, ids[0]!).mindControlledSeats).toEqual(ids.map((_, seat) => seat).filter(seat => seat % 2 === 1));
    }
  });
});

describe('sexto lote de Rituais', () => {
  it('Revelação exige unanimidade; uma recusa mantém todas as mãos', () => {
    let state = createRitualScenario(players, 'revelacao-do-destino');
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'revelacao-do-destino#1' });
    const original = state.hands.map(hand => [...hand]);
    expect(state.ritualPhase).toBe('destiny-vote');
    expect(viewFor(state, 'a').ritualVotesNeeded).toBe(2);
    expect(() => reduce(state, { type: 'play', playerId: 'a', cardId: original[0]![0]! })).toThrow('Ritual');
    state = reduce(state, { type: 'ritual-destiny', playerId: 'a', approve: true });
    expect(state.hands).toEqual(original);
    state = reduce(state, { type: 'ritual-destiny', playerId: 'c', approve: false });
    expect(state.ritualPhase).toBe('play');
    expect(state.hands).toEqual(original);
    expect(state.discard).toEqual([]);
  });

  it('Revelação troca as três criaturas de cada aliado somente após todos concordarem em oito jogadores', () => {
    const ids = Array.from({ length: 8 }, (_, seat) => `p${seat}`);
    let state = createRitualScenario(ids, 'revelacao-do-destino');
    state = reduce(state, { type: 'ritual-reveal', playerId: ids[0]! });
    state = reduce(state, { type: 'ritual-play', playerId: ids[0]!, ritualId: 'revelacao-do-destino#1' });
    const original = state.hands.map(hand => [...hand]);
    expect(viewFor(state, ids[0]!).ritualVotesNeeded).toBe(4);
    for (const seat of [0, 2, 4]) {
      state = reduce(state, { type: 'ritual-destiny', playerId: ids[seat]!, approve: true });
      expect(state.hands).toEqual(original);
    }
    state = reduce(state, { type: 'ritual-destiny', playerId: ids[6]!, approve: true });
    expect(state.ritualPhase).toBe('play');
    for (const seat of [0, 2, 4, 6]) {
      expect(state.hands[seat]).toHaveLength(3);
      expect(state.hands[seat]!.some(id => original[seat]!.includes(id))).toBe(false);
      for (const id of original[seat]!) expect(state.discard).toContain(id);
    }
    for (const seat of [1, 3, 5, 7]) expect(state.hands[seat]).toEqual(original[seat]);
  });

  it('Feitiço separa uma carta secreta por pessoa e só aceita jogá-la na terceira vaza', () => {
    let state = ritualState(['feitico-oculto#1'], [
      ['arcana-full', 'raven-new', 'wolf-new'], ['arcana-new', 'fairy-new', 'goblin-new'],
      ['arcana-waning', 'griffin-new', 'familiar-new'], ['arcana-waxing', 'wizard-new', 'witch-new'],
    ]);
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'feitico-oculto#1' });
    expect(state.ritualPhase).toBe('seal');
    expect(viewFor(state, 'a').hand).toEqual([]);
    expect(() => reduce(state, { type: 'ritual-seal', playerId: 'b', index: 0 })).toThrow('vez');
    expect(() => reduce(state, { type: 'ritual-seal', playerId: 'a', index: 3 })).toThrow('verso');
    const positions = [2, 1, 0, 2];
    const chosen = state.hands.map((hand, seat) => hand[positions[seat]!]!);
    for (let seat = 0; seat < 4; seat++) {
      state = reduce(state, { type: 'ritual-seal', playerId: players[seat]!, index: positions[seat]! });
      if (seat < 3) expect(viewFor(state, players[seat]!).hand).toEqual([]);
    }
    expect(state.ritualPhase).toBe('play');
    expect(state.sealedCardIds).toEqual(chosen);
    expect(state.hands.map(hand => hand.length)).toEqual([2, 2, 2, 2]);
    expect(viewFor(state, 'a').players.map(player => player.handCount)).toEqual([3, 3, 3, 3]);
    expect(viewFor(state, 'a').players.map(player => player.sealedCount)).toEqual([1, 1, 1, 1]);
    const sealed = [...state.sealedCardIds];
    expect(JSON.stringify(viewFor(state, 'a'))).not.toContain(sealed[0]);
    expect(() => reduce(state, { type: 'play', playerId: 'a', cardId: 'sealed' })).toThrow();
    state = reduce(state, { type: 'play', playerId: 'a', cardId: state.hands[0]![0]! });
    expect(state.sealedCardIds).toEqual(sealed);

    state = { ...state, trick: [], turn: 0, trickWins: [1, 1], trickWinners: [0, 1],
      trickHistory: [{ plays: [], winnerSeat: 0, winnerTeam: 0 }, { plays: [], winnerSeat: 1, winnerTeam: 1 }] };
    expect(() => reduce(state, { type: 'play', playerId: 'a', cardId: state.hands[0]![0]! })).toThrow('terceira vaza');
    for (let seat = 0; seat < 4; seat++) {
      state = reduce(state, { type: 'play', playerId: players[seat]!, cardId: 'sealed' });
      if (seat < 3) expect(state.trick[seat]?.cardId).toBe(sealed[seat]);
    }
    expect(state.lastRoundTricks[2]?.plays.map(play => play.cardId)).toEqual(sealed);
    expect(state.round).toBe(2);
  });

  it('Feitiço permite revelar a carta separada se o Trick for recusado na terceira vaza', () => {
    let state = ritualState(['feitico-oculto#1'], [
      ['raven-full', 'raven-new', 'raven-waning'], ['arcana-new', 'fairy-new', 'goblin-new'],
      ['arcana-waning', 'griffin-new', 'familiar-new'], ['arcana-waxing', 'wizard-new', 'witch-new'],
    ]);
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'feitico-oculto#1' });
    for (const playerId of players) state = reduce(state, { type: 'ritual-seal', playerId, index: 0 });
    const sealed = state.sealedCardIds[0];
    state = { ...state, trick: [], turn: 0, trickWins: [1, 1], trickWinners: [0, 1],
      trickHistory: [{ plays: [], winnerSeat: 0, winnerTeam: 0 }, { plays: [], winnerSeat: 1, winnerTeam: 1 }] };
    state = reduce(state, { type: 'raise', playerId: 'a' });
    state = reduce(state, { type: 'respond', playerId: 'b', accept: false });
    expect(state.pendingAbility?.stage).toBe('source');
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'sealed' });
    expect(state.sealedCardIds[0]).toBeNull();
    expect(state.lastCreatureReveal?.cardId).toBe(sealed);
    expect(state.round).toBe(2);
  });

  it('Feitiço mantém as mãos ocultas até os oito jogadores escolherem pelo verso', () => {
    const ids = Array.from({ length: 8 }, (_, seat) => `p${seat}`);
    let state = createRitualScenario(ids, 'feitico-oculto');
    state = reduce(state, { type: 'ritual-play', playerId: ids[0]!, ritualId: 'feitico-oculto#1' });
    const original = state.hands.map(hand => [...hand]);
    for (let seat = 0; seat < ids.length; seat++) {
      expect(viewFor(state, ids[seat]!).hand).toEqual([]);
      state = reduce(state, { type: 'ritual-seal', playerId: ids[seat]!, index: seat % 3 });
      expect(state.sealedCardIds[seat]).toBe(original[seat]![seat % 3]);
    }
    expect(state.ritualPhase).toBe('play');
    expect(state.hands.every(hand => hand.length === 2)).toBe(true);
    expect(viewFor(state, ids[7]!).hand).toHaveLength(2);
  });

  it('Pacto limita as três vazas aos dois escolhidos e permite escolher o autor como duelista', () => {
    let state = ritualState(['pacto-da-batalha#1'], [
      ['arcana-full', 'arcana-new', 'arcana-waning'], ['raven-new', 'raven-waning', 'raven-waxing'],
      ['witch-new', 'witch-waning', 'witch-waxing'], ['fairy-new', 'fairy-waning', 'fairy-waxing'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    expect(() => reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'pacto-da-batalha#1', allySeat: 1, targetSeat: 3 })).toThrow('X1');
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'pacto-da-batalha#1', allySeat: 0, targetSeat: 3 });
    expect(viewFor(state, 'b').ritualDuelSeats).toEqual([0, 3]);
    expect(state.turn).toBe(0);
    state = reduce(state, { type: 'raise', playerId: 'a' });
    expect(state.pendingChallenge?.responderSeat).toBe(3);
    state = reduce(state, { type: 'respond', playerId: 'd', accept: true });
    expect(() => reduce(state, { type: 'play', playerId: 'b', cardId: 'raven-new' })).toThrow();
    state = reduce(state, { type: 'play', playerId: 'a', cardId: 'arcana-full' });
    expect(state.turn).toBe(3);
    state = reduce(state, { type: 'play', playerId: 'd', cardId: 'fairy-new' });
    expect(state.trickHistory[0]?.plays.map(play => play.seat)).toEqual([0, 3]);
    expect(state.turn).toBe(0);
    state = reduce(state, { type: 'play', playerId: 'a', cardId: 'arcana-new' });
    state = reduce(state, { type: 'play', playerId: 'd', cardId: 'fairy-waning' });
    expect(state.lastRoundTricks.every(trick => trick.plays.length === 2)).toBe(true);
    expect(state.lastRound?.points).toBe(2);
    expect(state.round).toBe(2);
  });

  it('Pacto permite escolher outro aliado e rival em seis ou oito assentos', () => {
    for (const count of [6, 8]) {
      const ids = Array.from({ length: count }, (_, seat) => `p${seat}`);
      let state = createRitualScenario(ids, 'pacto-da-batalha');
      state = reduce(state, { type: 'ritual-reveal', playerId: ids[0]! });
      state = reduce(state, { type: 'ritual-play', playerId: ids[0]!, ritualId: 'pacto-da-batalha#1', allySeat: 2, targetSeat: count - 1 });
      expect(state.ritualDuelSeats).toEqual([2, count - 1]);
      expect(state.turn).toBe(2);
      state = reduce(state, { type: 'play', playerId: ids[2]!, cardId: state.hands[2]![0]! });
      expect(state.turn).toBe(count - 1);
    }
  });
});

describe('sétimo lote de Rituais', () => {
  it('Troca de Sortes permite a cada aliado escolher uma carta e um rival ou passar', () => {
    let state = ritualState(['troca-de-sortes#1'], [
      ['arcana-full', 'raven-new', 'wolf-new'], ['fairy-new', 'goblin-new', 'griffin-new'],
      ['witch-new', 'familiar-new', 'wizard-new'], ['arcana-new', 'raven-full', 'wolf-full'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'troca-de-sortes#1' });
    expect(state.ritualPhase).toBe('fortune');
    expect(() => reduce(state, { type: 'ritual-fortune', playerId: 'c' })).toThrow('vez');
    expect(() => reduce(state, { type: 'ritual-fortune', playerId: 'a', cardId: 'arcana-full', targetSeat: 2, targetIndex: 0 })).toThrow('posição oculta');
    const rivalHand = [...state.hands[1]!];
    expect(() => reduce(state, { type: 'ritual-fortune', playerId: 'a', cardId: 'arcana-full', targetSeat: 1, targetIndex: 3 })).toThrow('posição oculta');
    state = reduce(state, { type: 'ritual-fortune', playerId: 'a', cardId: 'arcana-full', targetSeat: 1, targetIndex: 1 });
    expect(state.hands[0]).toContain(rivalHand[1]);
    expect(state.hands[1]![1]).toBe('arcana-full');
    expect(state.lastCreatureReveal).toBeNull();
    expect(state.hands.map(hand => hand.length)).toEqual([3, 3, 3, 3]);
    expect(viewFor(state, 'd').lastCreatureReveal).toBeNull();
    expect(viewFor(state, 'd').players[0]?.visibleHand).toBeUndefined();
    state = reduce(state, { type: 'ritual-fortune', playerId: 'c' });
    expect(state.ritualPhase).toBe('play');
    expect(state.hands[2]).toContain('witch-new');
  });

  it('Troca de Sortes permite todos os aliados em oito jogadores, inclusive repetir o mesmo rival', () => {
    const ids = Array.from({ length: 8 }, (_, seat) => `p${seat}`);
    let state = createRitualScenario(ids, 'troca-de-sortes');
    state = reduce(state, { type: 'ritual-reveal', playerId: ids[0]! });
    state = reduce(state, { type: 'ritual-play', playerId: ids[0]!, ritualId: 'troca-de-sortes#1' });
    const counts = state.hands.map(hand => hand.length);
    for (const seat of [0, 2, 4, 6]) {
      state = reduce(state, { type: 'ritual-fortune', playerId: ids[seat]!, cardId: state.hands[seat]![0]!, targetSeat: 1, targetIndex: 0 });
    }
    expect(state.ritualPhase).toBe('play');
    expect(state.hands.map(hand => hand.length)).toEqual(counts);
    expect(viewFor(state, ids[0]!).players[1]?.visibleHand).toBeUndefined();
  });

  it('x1 no Dado aceita qualquer aliado, impede segundo lançamento e repete empate', () => {
    let state = ritualState(['x1-no-dado#1']);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'x1-no-dado#1' });
    expect(state.ritualPhase).toBe('dice');
    const step = (seed: number) => { let x = seed | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0 || 0x9e3779b9; };
    const tieSeed = Array.from({ length: 1000 }, (_, index) => index + 1).find(seed => step(seed) % 6 === step(step(seed)) % 6)!;
    state = { ...state, rng: tieSeed };
    state = reduce(state, { type: 'ritual-roll', playerId: 'c' });
    expect(state.ritualDiceRolls[0]).toBeGreaterThanOrEqual(1);
    expect(() => reduce(state, { type: 'ritual-roll', playerId: 'a' })).toThrow('já lançou');
    state = reduce(state, { type: 'ritual-roll', playerId: 'd' });
    expect(state.ritualPhase).toBe('dice');
    expect(state.ritualDiceRolls).toEqual([null, null]);
    expect(state.lastDiceResult?.winner).toBeNull();
    for (let attempts = 0; state.ritualPhase === 'dice' && attempts < 20; attempts++) {
      state = reduce(state, { type: 'ritual-roll', playerId: 'a' });
      state = reduce(state, { type: 'ritual-roll', playerId: 'b' });
    }
    expect(state.lastRound?.reason).toBe('dice');
    expect(state.round).toBe(2);
    expect(state.scores[state.lastDiceResult!.winner!]).toBe(1);
  });

  it('Estrela Guia dá o ponto na primeira vaza mesmo à equipe que depois perde a rodada', () => {
    let state = ritualState(['estrela-guia#1'], [
      ['raven-new', 'arcana-full'], ['arcana-new', 'raven-waning'],
      ['wolf-new', 'wolf-full'], ['fairy-new', 'fairy-full'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'estrela-guia#1' });
    state = playFullTrick(state, ['raven-new', 'arcana-new', 'wolf-new', 'fairy-new']);
    expect(state.scores).toEqual([0, 1]);
    expect(state.ritualStarAwardedTeam).toBe(1);
    expect(state.round).toBe(1);
    state = { ...state, turn: 0, trickWins: [1, 1], trickWinners: [1, 0],
      trickHistory: [...state.trickHistory, { plays: [], winnerSeat: 0, winnerTeam: 0 }] };
    state = playFullTrick(state, ['arcana-full', 'raven-waning', 'wolf-full', 'fairy-full']);
    expect(state.scores).toEqual([1, 1]);
    expect(state.lastRound?.winner).toBe(0);
    expect(state.lastRound?.starBonusTeam).toBe(1);
  });

  it('Estrela Guia pode encerrar a partida ao alcançar o placar alvo na primeira vaza', () => {
    let state = ritualState(['estrela-guia#1'], [
      ['raven-new'], ['arcana-full'], ['wolf-new'], ['fairy-new'],
    ]);
    state = { ...state, scores: [0, 14] };
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'estrela-guia#1' });
    state = playFullTrick(state, ['raven-new', 'arcana-full', 'wolf-new', 'fairy-new']);
    expect(state.winner).toBe(1);
    expect(state.scores).toEqual([0, 15]);
    expect(state.lastRound?.reason).toBe('star');
  });

  it('Dívida Arcana soma as Arcanas jogadas pela equipe do Ritual se ela perder por Trick recusado', () => {
    let state = ritualState(['divida-arcana#1'], [
      ['arcana-new', 'raven-new'], ['arcana-full', 'raven-waning'],
      ['arcana-waning', 'wolf-new'], ['fairy-new', 'goblin-new'],
    ]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'divida-arcana#1' });
    state = playFullTrick(state, ['arcana-new', 'arcana-full', 'arcana-waning', 'fairy-new']);
    expect(state.arcanaPlayedTeams).toEqual([0, 1, 0]);
    expect(state.turn).toBe(1);
    state = reduce(state, { type: 'raise', playerId: 'b' });
    state = reduce(state, { type: 'respond', playerId: 'c', accept: false });
    if (state.pendingAbility) state = reduce(state, { type: 'ability', playerId: 'b', choice: 'skip' });
    expect(state.scores).toEqual([0, 3]);
    expect(state.lastRound?.bonusPoints).toBe(2);
    expect(state.lastRound?.points).toBe(3);
  });
});
