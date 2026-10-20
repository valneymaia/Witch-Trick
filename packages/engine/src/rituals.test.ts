import { describe, expect, it } from 'vitest';
import { createGame, reduce, viewFor, type GameState } from './index.js';

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
    expect(state.pendingChallenge?.level).toBe(3);
    state = reduce(state, { type: 'respond', playerId: 'b', accept: false });
    expect(state.scores).toEqual([2, 0]);
  });

  it('Trick Explosivo inicia em três pontos e pode subir para Poker Trick', () => {
    let state = ritualState(['trick-explosivo#1']);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'a' });
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'trick-explosivo#1' });
    expect(state.roundStake).toBe(3);
    state = reduce(state, { type: 'raise', playerId: 'a' });
    expect(state.pendingChallenge?.level).toBe(4);
    state = reduce(state, { type: 'respond', playerId: 'b', accept: false });
    expect(state.scores).toEqual([3, 0]);
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
    state = { ...state, ritualExchange: { seat: 2, newCardIds: ['raven-new', 'wolf-new', 'fairy-new'] } };
    expect(viewFor(state, 'c').hand.map(card => card.id)).toEqual(['arcana-full']);
    state = reduce(state, { type: 'ritual-play', playerId: 'a', ritualId: 'mapa-do-destino#1', prediction: '2-1' });
    const privateView = viewFor(state, 'c');
    expect(privateView.ritualDiscardOptions).toEqual([{ value: '0' }, { value: '1' }, { value: '2' }]);
    expect(JSON.stringify(privateView)).not.toContain('wolf-new');
    expect(viewFor(state, 'a').ritualDiscardOptions).toEqual([]);
    expect(() => reduce(state, { type: 'ritual-discard', playerId: 'a', choice: '1' })).toThrow();
    state = reduce(state, { type: 'ritual-discard', playerId: 'c', choice: '1' });
    expect(state.discard).toContain('wolf-new');
    expect(state.hands[2]).toEqual(['raven-new', 'fairy-new', 'arcana-full']);
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

  it('Mago troca um Ritual escolhido por um Ritual aleatório de um adversário', () => {
    let state = ritualState(['doblete-sombrio#1']);
    state = {
      ...state, ritualPhase: 'play', ritualHands: [
        ['doblete-sombrio#1'], ['magia-nula#1'], ['mapa-do-destino#1'], ['silencio-da-bruxa#1'],
      ],
      pendingAbility: { seat: 0, source: 'trick', stage: 'offer', cardId: 'wizard-full', endRound: null },
    };
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'use' });
    expect(state.pendingAbility?.stage).toBe('wizard-own');
    state = reduce(state, { type: 'ability', playerId: 'a', choice: 'doblete-sombrio#1' });
    state = reduce(state, { type: 'ability', playerId: 'a', choice: '1' });
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

  it('poder da última vaza espera a escolha do próximo Ritual e Magia Nula pode bloqueá-lo', () => {
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
    expect(state.ritualPhase).toBe('blind');
    expect(state.ritualChooser).toBe(1);
    expect(state.deferredAbility?.cardId).toBe('raven-full');
    expect(state.scores).toEqual([2, 3]);
    state = reduce(state, { type: 'ritual-reveal', playerId: 'b' });
    state = reduce(state, { type: 'ritual-play', playerId: 'b', ritualId: 'magia-nula#1' });
    expect(state.deferredAbility).toBeNull();
    expect(state.pendingAbility).toBeNull();
    expect(state.scores).toEqual([2, 3]);
  });
});
