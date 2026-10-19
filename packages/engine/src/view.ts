import { CARD_BY_ID, CREATURE_EFFECTS, type CreatureCard } from './cards.js';
import { teamOf, type AbilityStage, type GameState, type PendingChallenge, type RoundResult, type Team } from './engine.js';

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
  trickWinners: Team[];
  scores: [number, number];
  roundStake: number;
  lastRaiseTeam: Team | null;
  pendingChallenge: PendingChallenge | null;
  pendingAbility: { seat: number; source: 'declined' | 'trick'; stage: AbilityStage; card: CreatureCard | null; appliesNextRound: boolean } | null;
  abilityOptions: AbilityOption[];
  wolfTeam: Team | null;
  lastRound: RoundResult | null;
  round: number;
  roundStarter: number;
  turn: number;
  lastTrickWinner: number | null;
  lastRoundWinner: Team | null;
  winner: Team | null;
}
export interface AbilityOption { value: string; label: string; card?: CreatureCard; seat?: number }
export function abilityOptionsFor(state: GameState, seat: number): AbilityOption[] {
  const pending = state.pendingAbility;
  if (!pending || pending.seat !== seat) return [];
  const cardOption = (id: string): AbilityOption => ({ value: id, label: `${CARD_BY_ID[id]!.name} · Lua ${CARD_BY_ID[id]!.moon}`, card: CARD_BY_ID[id]! });
  const skip = { value: 'skip', label: 'Pular habilidade' };
  switch (pending.stage) {
    case 'source': return [skip, ...state.hands[seat]!.filter(id => CREATURE_EFFECTS[CARD_BY_ID[id]!.kind].available).map(cardOption)];
    case 'offer': return [{ value: 'use', label: 'Usar habilidade' }, skip];
    case 'puppet-card': return [skip, ...state.discard.filter(id => CARD_BY_ID[id]!.kind !== 'puppeteer').map(cardOption)];
    case 'puppet-exchange': return state.hands[seat]!.filter(id => id !== pending.ownCardId).map(cardOption);
    case 'fairy-target':
    case 'goblin-target': return [skip, ...state.hands.flatMap((hand, target): AbilityOption[] => teamOf(target) !== teamOf(seat) && hand.length ? [{ value: String(target), label: `Jogador ${target + 1}`, seat: target }] : [])];
    case 'fairy-card': return (pending.candidates ?? []).map(cardOption);
    case 'goblin-own': return [skip, ...state.hands[seat]!.map(cardOption)];
    case 'griffin-discard': return state.hands[seat]!.map(cardOption);
  }
}
export function viewFor(state: GameState, playerId: string): GameView {
  const seat = state.playerIds.indexOf(playerId);
  if (seat < 0) throw new Error('Jogador não pertence a esta partida.');
  return {
    seat, hand: state.hands[seat]!.map(id => CARD_BY_ID[id]!),
    players: state.hands.map((hand, playerSeat) => ({ seat: playerSeat, handCount: hand.length })),
    trick: state.trick.map(play => ({ seat: play.seat, card: CARD_BY_ID[play.cardId]! })),
    trickWins: [...state.trickWins], trickWinners: [...state.trickWinners],
    scores: [...state.scores], roundStake: state.roundStake,
    lastRaiseTeam: state.lastRaiseTeam,
    pendingChallenge: state.pendingChallenge && { ...state.pendingChallenge },
    pendingAbility: state.pendingAbility && {
      seat: state.pendingAbility.seat, source: state.pendingAbility.source,
      stage: state.pendingAbility.stage, card: state.pendingAbility.cardId ? CARD_BY_ID[state.pendingAbility.cardId]! : null,
      appliesNextRound: state.pendingAbility.endRound !== null,
    },
    abilityOptions: abilityOptionsFor(state, seat),
    wolfTeam: state.activeEffects.find(effect => effect.key === 'wolf') ? teamOf(state.activeEffects.find(effect => effect.key === 'wolf')!.ownerSeat) : null,
    lastRound: state.lastRound && { ...state.lastRound, trickWinners: [...state.lastRound.trickWinners] },
    round: state.round,
    roundStarter: state.roundStarter, turn: state.turn,
    lastTrickWinner: state.lastTrickWinner, lastRoundWinner: state.lastRoundWinner,
    winner: state.winner,
  };
}
