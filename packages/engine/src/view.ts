import { CARD_BY_ID, type CreatureCard } from './cards.js';
import type { GameState, Team } from './engine.js';

export interface PlayerView {
  seat: number;
  handCount: number;
}
export interface GameView {
  seat: number;
  hand: CreatureCard[];
  players: PlayerView[];
  trick: { seat: number; card: CreatureCard }[];
  trickWins: [number, number];
  scores: [number, number];
  round: number;
  roundStarter: number;
  turn: number;
  lastTrickWinner: number | null;
  lastRoundWinner: Team | null;
  winner: Team | null;
}
export function viewFor(state: GameState, playerId: string): GameView {
  const seat = state.playerIds.indexOf(playerId);
  if (seat < 0) throw new Error('Jogador não pertence a esta partida.');
  return {
    seat, hand: state.hands[seat]!.map(id => CARD_BY_ID[id]!),
    players: state.hands.map((hand, playerSeat) => ({ seat: playerSeat, handCount: hand.length })),
    trick: state.trick.map(play => ({ seat: play.seat, card: CARD_BY_ID[play.cardId]! })),
    trickWins: [...state.trickWins], scores: [...state.scores], round: state.round,
    roundStarter: state.roundStarter, turn: state.turn,
    lastTrickWinner: state.lastTrickWinner, lastRoundWinner: state.lastRoundWinner,
    winner: state.winner,
  };
}
