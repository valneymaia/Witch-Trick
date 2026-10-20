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
    state = { ...state, ritualPhase: 'mode', ritualExchange: { seat: 2, newCardIds: ['raven-new', 'wolf-new', 'fairy-new'] } };
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
    state = { ...state, ritualPhase: 'mode', ritualExchange: { seat: 2, newCardIds: ['wolf-new', 'fairy-new', 'goblin-new'] } };
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
    state = { ...state, ritualPhase: 'mode', ritualExchange: { seat: 2, newCardIds: state.hands[2]!.slice(0, 1) } };
    state = reduce(state, { type: 'ritual-mode', playerId: 'a', blind: true });
    state = reduce(state, { type: 'ritual-discard', playerId: 'c', choice: '0' });
    expect(() => reduce(state, { type: 'ritual-reveal', playerId: 'a' })).toThrow('Não é hora');
    expect(() => reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'magia-nula#1' })).toThrow('Veja as criaturas');
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
    expect(viewFor(state, 'a').trick[0]?.card.id).toBe('arcana-full');
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
