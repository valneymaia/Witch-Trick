import { describe, expect, it } from 'vitest';
import { CARDS, createGame, createRitualScenario, reduce, ritualDecisionSeat, viewFor, type GameState } from './index.js';

const players = (count: number) => Array.from({ length: count }, (_, seat) => `player-${seat}`);

describe('salas com 4, 6 ou 8 jogadores', () => {
  it.each([4, 6, 8])('distribui três criaturas e três Rituais a cada um dos %i jogadores', count => {
    const state = createGame(players(count), 42, true, 25);
    expect(state.hands).toHaveLength(count);
    expect(state.hands.map(hand => hand.length)).toEqual(Array(count).fill(3));
    expect(state.ritualHands.map(hand => hand.length)).toEqual(Array(count).fill(3));
    expect(state.targetScore).toBe(25);
    expect(new Set([...state.hands.flat(), ...state.deck])).toHaveProperty('size', 40);
  });

  it('circula a vaza de oito assentos e entrega a resposta do Trick ao assento seguinte', () => {
    const ids = players(8);
    let state = { ...createGame(ids, 31), turn: 7, roundStarter: 7 };
    state = reduce(state, { type: 'raise', playerId: ids[7]! });
    expect(state.pendingChallenge?.responderSeat).toBe(0);
    state = reduce(state, { type: 'respond', playerId: ids[0]!, accept: true });
    for (const seat of [7, 0, 1, 2, 3, 4, 5, 6]) {
      expect(state.turn).toBe(seat);
      state = reduce(state, { type: 'play', playerId: ids[seat]!, cardId: state.hands[seat]![0]! });
    }
    expect(state.trickWinners).toHaveLength(1);
    expect(state.trick).toHaveLength(0);
    expect(viewFor(state, ids[0]!).hand).toHaveLength(2);
    expect(viewFor(state, ids[0]!).players[1]?.visibleHand).toBeUndefined();
  });

  it('Anciã compra e descarta três criaturas para cada um dos quatro parceiros', () => {
    const ids = players(8);
    let state = createRitualScenario(ids, 'escolha-da-ancia');
    state = reduce(state, { type: 'ritual-reveal', playerId: ids[0]! });
    state = reduce(state, { type: 'ritual-play', playerId: ids[0]!, ritualId: 'escolha-da-ancia#1' });
    expect(state.hands.map(hand => hand.length)).toEqual([6, 3, 6, 3, 6, 3, 6, 3]);
    expect(state.deck).toHaveLength(4);
    for (const seat of [0, 2, 4, 6]) for (let index = 0; index < 3; index++) {
      expect(ritualDecisionSeat(state)).toBe(seat);
      state = reduce(state, { type: 'ritual-ancient-discard', playerId: ids[seat]!, cardId: state.hands[seat]![0]! });
    }
    expect(state.hands.map(hand => hand.length)).toEqual(Array(8).fill(3));
    expect(state.ritualPhase).toBe('play');
  });

  it('Espelho oferece uma decisão a cada parceiro sem repetir o adversário', () => {
    const ids = players(6);
    let state = createRitualScenario(ids, 'espelho-enfeiticado');
    state = reduce(state, { type: 'ritual-reveal', playerId: ids[0]! });
    state = reduce(state, { type: 'ritual-play', playerId: ids[0]!, ritualId: 'espelho-enfeiticado#1' });
    state = reduce(state, { type: 'ritual-mirror', playerId: ids[0]!, targetSeat: 1 });
    expect(ritualDecisionSeat(state)).toBe(2);
    expect(() => reduce(state, { type: 'ritual-mirror', playerId: ids[2]!, targetSeat: 1 })).toThrow();
    state = reduce(state, { type: 'ritual-mirror', playerId: ids[2]!, targetSeat: 3 });
    state = reduce(state, { type: 'ritual-mirror', playerId: ids[4]!, targetSeat: 5 });
    expect(state.ritualPhase).toBe('play');
  });

  it('as decisões da equipe começam em quem jogou o Ritual e giram pelos parceiros', () => {
    const ids = players(8);
    let state: GameState = { ...createGame(ids, 17, true), ritualPhase: 'mirror',
      ritualActiveId: 'espelho-enfeiticado#1', ritualChooser: 4 };
    for (const seat of [4, 6, 0, 2]) {
      expect(ritualDecisionSeat(state)).toBe(seat);
      state = reduce(state, { type: 'ritual-mirror', playerId: ids[seat]! });
    }
    expect(state.ritualPhase).toBe('play');
  });

  it('Acordo de Sangue em oito jogadores exige maioria e só revela mãos à equipe', () => {
    const ids = players(8);
    const start = { ...createGame(ids, 17, true, 25), ritualPhase: 'blood-vote' as const,
      ritualActiveId: 'acordo-de-sangue#1', ritualChooser: 0 };
    expect(viewFor(start, ids[0]!).ritualTeammateHands.map(hand => hand.seat)).toEqual([2, 4, 6]);
    expect(viewFor(start, ids[1]!).ritualTeammateHands).toEqual([]);
    let state = reduce(start, { type: 'ritual-blood', playerId: ids[0]!, play: true });
    state = reduce(state, { type: 'ritual-blood', playerId: ids[2]!, play: false });
    state = reduce(state, { type: 'ritual-blood', playerId: ids[4]!, play: true });
    expect(state.ritualPhase).toBe('blood-vote');
    state = reduce(state, { type: 'ritual-blood', playerId: ids[6]!, play: true });
    expect(state.ritualPhase).toBe('play');
    expect(state.roundStake).toBe(3);

    let rejected = reduce(start, { type: 'ritual-blood', playerId: ids[0]!, play: true });
    rejected = reduce(rejected, { type: 'ritual-blood', playerId: ids[2]!, play: false });
    rejected = reduce(rejected, { type: 'ritual-blood', playerId: ids[4]!, play: false });
    expect(rejected.scores).toEqual([0, 1]);
    expect(rejected.lastRound?.reason).toBe('blood-withdrawal');
  });

  it('encerra uma partida de oito jogadores no alvo escolhido de 25 pontos', () => {
    const ids = players(8);
    const cards = ['arcana-full', ...CARDS.map(card => card.id).filter(id => !id.startsWith('arcana-')).slice(0, 7)];
    let state = { ...createGame(ids, 17, false, 25), hands: cards.map(id => [id]),
      scores: [24, 0] as [number, number], trickWins: [1, 0] as [number, number], turn: 0, roundStake: 2 };
    for (let seat = 0; seat < 8; seat++) state = reduce(state, { type: 'play', playerId: ids[seat]!, cardId: cards[seat]! });
    expect(state.scores).toEqual([25, 0]);
    expect(state.winner).toBe(0);
  });
});
