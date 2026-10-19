import { CARD_BY_ID, CARDS, compareCards } from './cards.js';

export type Team = 0 | 1;
export interface PlayedCard { seat: number; cardId: string }
export type TrickLevel = 2 | 3 | 4;
export interface PendingChallenge {
  level: TrickLevel;
  challengerSeat: number;
  responderSeat: number;
}
export interface RoundResult {
  winner: Team;
  points: number;
  reason: 'tricks' | 'declined';
  trickWinners: Team[];
}
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
  trickWinners: Team[];
  scores: [number, number];
  roundStake: number;
  lastRaiseTeam: Team | null;
  pendingChallenge: PendingChallenge | null;
  lastRound: RoundResult | null;
  round: number;
  roundStarter: number;
  turn: number;
  lastTrickWinner: number | null;
  lastRoundWinner: Team | null;
  winner: Team | null;
  rng: number;
  activeEffects: ActiveEffect[];
}
export type GameAction =
  | { type: 'play'; playerId: string; cardId: string }
  | { type: 'raise'; playerId: string }
  | { type: 'counter'; playerId: string }
  | { type: 'respond'; playerId: string; accept: boolean };
export const TARGET_SCORE = 15;
export const ROUND_POINTS = 1;
export const MAX_TRICK_POINTS = 4;
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
    trickWinners: [], roundStake: ROUND_POINTS, lastRaiseTeam: null,
    pendingChallenge: null, turn: state.roundStarter, rng: seed, activeEffects: [],
  };
}
export function createGame(playerIds: [string, string, string, string], seed: number): GameState {
  if (new Set(playerIds).size !== 4 || playerIds.some(id => !id)) throw new Error('Quatro jogadores distintos são necessários.');
  const rng = nextRandom(seed || 0x9e3779b9);
  const state: GameState = {
    playerIds: [...playerIds], hands: [[], [], [], []], deck: [], discard: [], trick: [],
    trickWins: [0, 0], trickWinners: [], scores: [0, 0], roundStake: ROUND_POINTS,
    lastRaiseTeam: null, pendingChallenge: null, lastRound: null,
    round: 1, roundStarter: rng % 4,
    turn: rng % 4, lastTrickWinner: null, lastRoundWinner: null, winner: null,
    rng, activeEffects: [],
  };
  return deal(state);
}
function finishRound(state: GameState, team: Team, reason: RoundResult['reason']): GameState {
  const scores = [...state.scores] as GameState['scores'];
  scores[team] = Math.min(TARGET_SCORE, scores[team] + state.roundStake);
  const result: RoundResult = {
    winner: team, points: state.roundStake, reason,
    trickWinners: [...state.trickWinners],
  };
  const completed: GameState = {
    ...state, scores, lastRoundWinner: team, lastRound: result, pendingChallenge: null,
  };
  if (scores[team] >= TARGET_SCORE) return { ...completed, winner: team };
  return deal({ ...completed, round: state.round + 1, roundStarter: (state.roundStarter + 1) % 4 });
}
export function reduce(state: GameState, action: GameAction): GameState {
  if (state.winner !== null) throw new Error('A partida terminou.');
  const seat = state.playerIds.indexOf(action.playerId);
  if (seat < 0) throw new Error('Jogador não pertence à partida.');
  if (action.type === 'respond') {
    const pending = state.pendingChallenge;
    if (!pending || pending.responderSeat !== seat) throw new Error('Este jogador não pode responder ao Trick.');
    if (!action.accept) return finishRound({ ...state, pendingChallenge: null }, teamOf(pending.challengerSeat), 'declined');
    return {
      ...state, roundStake: pending.level, lastRaiseTeam: teamOf(pending.challengerSeat),
      pendingChallenge: null,
    };
  }
  if (action.type === 'counter') {
    const pending = state.pendingChallenge;
    if (!pending || pending.responderSeat !== seat) throw new Error('Este jogador não pode aumentar o Trick.');
    if (pending.level >= MAX_TRICK_POINTS) throw new Error('A aposta já está no máximo.');
    return {
      ...state,
      roundStake: pending.level,
      lastRaiseTeam: teamOf(pending.challengerSeat),
      pendingChallenge: {
        level: (pending.level + 1) as TrickLevel,
        challengerSeat: seat,
        responderSeat: pending.challengerSeat,
      },
    };
  }
  if (state.pendingChallenge) throw new Error('Aguarde a resposta ao Trick.');
  if (seat !== state.turn) throw new Error('Não é a vez desse jogador.');
  if (action.type === 'raise') {
    if (state.roundStake >= MAX_TRICK_POINTS) throw new Error('A aposta já está no máximo.');
    if (state.lastRaiseTeam === teamOf(seat)) throw new Error('Só a equipe adversária pode aumentar a aposta.');
    return {
      ...state,
      pendingChallenge: {
        level: (state.roundStake + 1) as TrickLevel,
        challengerSeat: seat,
        responderSeat: (seat + 1) % 4,
      },
    };
  }
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
    lastTrickWinner: winningPlay.seat, trickWinners: [...state.trickWinners, team],
  };
  if (trickWins[team] < 2) return completed;
  return finishRound(completed, team, 'tricks');
}
