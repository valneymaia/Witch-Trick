import { CARD_BY_ID, CARDS, compareCards } from './cards.js';

export type Team = 0 | 1;
export interface PlayedCard { seat: number; cardId: string }
export interface ActiveEffect {
  key: string;
  ownerSeat: number;
  trigger: 'immediate' | 'next-trick' | 'round-end';
  expires: 'trick' | 'round';
  data: Record<string, unknown>;
}
export interface GameState {
  playerIds: [string, string, string, string];
  hands: [string[], string[], string[], string[]];
  deck: string[];
  discard: string[];
  trick: PlayedCard[];
  trickWins: [number, number];
  scores: [number, number];
  round: number;
  roundStarter: number;
  turn: number;
  lastTrickWinner: number | null;
  lastRoundWinner: Team | null;
  winner: Team | null;
  rng: number;
  activeEffects: ActiveEffect[];
}
export type GameAction = { type: 'play'; playerId: string; cardId: string };
export const TARGET_SCORE = 15;
export const ROUND_POINTS = 1;
export const teamOf = (seat: number): Team => (seat % 2) as Team;

function nextRandom(seed: number): number {
  let x = seed | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return x >>> 0 || 0x9e3779b9;
}
function shuffled(seed: number): { cards: string[]; seed: number } {
  const cards = CARDS.map(card => card.id);
  for (let i = cards.length - 1; i > 0; i--) {
    seed = nextRandom(seed);
    const j = seed % (i + 1);
    [cards[i], cards[j]] = [cards[j]!, cards[i]!];
  }
  return { cards, seed };
}
function deal(state: GameState): GameState {
  const { cards, seed } = shuffled(state.rng);
  const hands: GameState['hands'] = [[], [], [], []];
  for (let i = 0; i < 12; i++) hands[i % 4]!.push(cards.pop()!);
  return {
    ...state, hands, deck: cards, discard: [], trick: [], trickWins: [0, 0],
    turn: state.roundStarter, rng: seed, activeEffects: [],
  };
}
export function createGame(playerIds: [string, string, string, string], seed: number): GameState {
  if (new Set(playerIds).size !== 4 || playerIds.some(id => !id)) throw new Error('Quatro jogadores distintos são necessários.');
  const rng = nextRandom(seed || 0x9e3779b9);
  const state: GameState = {
    playerIds: [...playerIds], hands: [[], [], [], []], deck: [], discard: [], trick: [],
    trickWins: [0, 0], scores: [0, 0], round: 1, roundStarter: rng % 4,
    turn: rng % 4, lastTrickWinner: null, lastRoundWinner: null, winner: null,
    rng, activeEffects: [],
  };
  return deal(state);
}
export function reduce(state: GameState, action: GameAction): GameState {
  if (state.winner !== null) throw new Error('A partida terminou.');
  if (action.type !== 'play') throw new Error('Ação desconhecida.');
  const seat = state.playerIds.indexOf(action.playerId);
  if (seat < 0 || seat !== state.turn) throw new Error('Não é a vez desse jogador.');
  if (!state.hands[seat]!.includes(action.cardId)) throw new Error('Esta carta não está na sua mão.');
  const hands = state.hands.map((hand, i) => i === seat ? hand.filter(id => id !== action.cardId) : [...hand]) as GameState['hands'];
  const trick = [...state.trick, { seat, cardId: action.cardId }];
  if (trick.length < 4) return { ...state, hands, trick, turn: (seat + 1) % 4 };

  const winningPlay = trick.reduce((best, play) =>
    compareCards(CARD_BY_ID[play.cardId]!, CARD_BY_ID[best.cardId]!) > 0 ? play : best,
  );
  const team = teamOf(winningPlay.seat);
  const trickWins = [...state.trickWins] as GameState['trickWins'];
  trickWins[team]++;
  const discard = [...state.discard, ...trick.map(play => play.cardId)];
  const completed: GameState = {
    ...state, hands, trick: [], discard, trickWins, turn: winningPlay.seat,
    lastTrickWinner: winningPlay.seat,
  };
  if (trickWins[team] < 2) return completed;

  const scores = [...state.scores] as GameState['scores'];
  scores[team] += ROUND_POINTS;
  const afterRound: GameState = { ...completed, scores, lastRoundWinner: team };
  if (scores[team] >= TARGET_SCORE) return { ...afterRound, winner: team };
  return deal({ ...afterRound, round: state.round + 1, roundStarter: (state.roundStarter + 1) % 4 });
}
