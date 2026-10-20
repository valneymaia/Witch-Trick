import { CARD_BY_ID, type CreatureCard, type CreatureKind } from './cards.js';
import { abilityAvailableFor, ancientDiscardSeat, isBlindToCreatures, keepsDeclaredRitualMode, mustChooseCreatureBlind, puppeteerChoices, teamOf, type AbilityStage, type GameState, type PendingChallenge, type RoundResult, type Team } from './engine.js';
import { ritualFromId, type RitualCard } from './rituals.js';

export interface PlayerView {
  seat: number;
  handCount: number;
  skipsNextTrick: boolean;
}
export interface GameView {
  seat: number;
  hand: CreatureCard[];
  players: PlayerView[];
  trick: { seat: number; card: CreatureCard }[];
  trickWins: [number, number];
  trickWinners: Team[];
  scores: [number, number];
  roundBaseStake: number;
  roundStake: number;
  acceptedTrickLevel: GameState['acceptedTrickLevel'];
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
  ritualMode: boolean;
  ritualPhase: GameState['ritualPhase'];
  ritualModeLocked: boolean;
  ritualChooser: number;
  ritualDiscardSeat: number | null;
  ritualHand: RitualCard[];
  ritualHandCounts: number[];
  ritualActive: RitualCard | null;
  ritualPrediction: '2-0' | '2-1' | null;
  ritualEmpoweredKind: CreatureKind | null;
  ritualTargetSeat: number | null;
  blindSeats: number[];
  ancientDiscardSeat: number | null;
  ancientDiscardsLeft: number;
  ritualDiscardOptions: { value: string; card?: CreatureCard }[];
  lastCreatureReveal: CreatureCard | null;
}
export interface AbilityOption { value: string; label: string; card?: CreatureCard; ritual?: RitualCard; seat?: number }
export function abilityOptionsFor(state: GameState, seat: number): AbilityOption[] {
  const pending = state.pendingAbility;
  if (!pending || pending.seat !== seat) return [];
  const cardOption = (id: string): AbilityOption => ({ value: id, label: `${CARD_BY_ID[id]!.name} · Lua ${CARD_BY_ID[id]!.moon}`, card: CARD_BY_ID[id]! });
  const ritualOption = (id: string): AbilityOption => ({ value: id, label: ritualFromId(id).name, ritual: ritualFromId(id) });
  const skip = { value: 'skip', label: 'Pular habilidade' };
  switch (pending.stage) {
    case 'source': return [skip, ...(mustChooseCreatureBlind(state, seat, pending)
      ? state.hands[seat]!.map((_, index) => ({ value: String(index), label: `Ativar carta oculta ${index + 1}` }))
      : state.hands[seat]!.filter(id => abilityAvailableFor(state, id)).map(cardOption))];
    case 'offer': return [{ value: 'use', label: 'Usar habilidade' }, skip];
    case 'puppet-card': return [skip, ...puppeteerChoices(state).map(cardOption)];
    case 'puppet-exchange': return mustChooseCreatureBlind(state, seat, pending)
      ? state.hands[seat]!.flatMap((id, index) => id === pending.ownCardId ? [] : [{ value: String(index), label: `Descartar carta oculta ${index + 1}` }])
      : state.hands[seat]!.filter(id => id !== pending.ownCardId).map(cardOption);
    case 'fairy-target':
    case 'goblin-target': return [skip, ...state.hands.flatMap((hand, target): AbilityOption[] => teamOf(target) !== teamOf(seat) && hand.length ? [{ value: String(target), label: `Jogador ${target + 1}`, seat: target }] : [])];
    case 'fairy-card': return (pending.candidates ?? []).map(cardOption);
    case 'goblin-own': return [skip, ...(mustChooseCreatureBlind(state, seat, pending)
      ? state.hands[seat]!.map((_, index) => ({ value: String(index), label: `Entregar carta oculta ${index + 1}` }))
      : state.hands[seat]!.map(cardOption))];
    case 'griffin-discard': return mustChooseCreatureBlind(state, seat, pending)
      ? state.hands[seat]!.map((_, index) => ({ value: String(index), label: `Descartar carta oculta ${index + 1}` }))
      : state.hands[seat]!.map(cardOption);
    case 'wizard-target': return [skip, ...state.ritualHands.flatMap((hand, target): AbilityOption[] => teamOf(target) !== teamOf(seat) && hand.length ? [{ value: String(target), label: `Jogador ${target + 1}`, seat: target }] : [])];
    case 'wizard-decision': return pending.targetRitualId ? [
      { value: 'keep', label: 'Manter seus Rituais; não trocar' },
      ...(state.ritualHands[seat]!.some(id => keepsDeclaredRitualMode(state, seat, id, pending.targetRitualId))
        ? [{ value: 'swap', label: `Trocar pelo ${ritualFromId(pending.targetRitualId).name}`, ritual: ritualFromId(pending.targetRitualId) }] : []),
    ] : [];
    case 'wizard-own': return state.ritualHands[seat]!.filter(id => keepsDeclaredRitualMode(state, seat, id, pending.targetRitualId)).map(ritualOption);
    case 'witch-discard': return state.ritualHands[seat]!.filter(id => keepsDeclaredRitualMode(state, seat, id)).map(ritualOption);
  }
}
export function viewFor(state: GameState, playerId: string): GameView {
  const seat = state.playerIds.indexOf(playerId);
  if (seat < 0) throw new Error('Jogador não pertence a esta partida.');
  const creaturesHidden = state.ritualMode && (state.ritualPhase === 'mode' || state.ritualPhase === 'blind' || state.ritualPhase === 'blind-discard' || isBlindToCreatures(state, seat));
  const visibleHand = creaturesHidden
    ? state.ritualExchange?.seat === seat ? state.hands[seat]!.filter(id => !state.ritualExchange!.newCardIds.includes(id))
      : []
    : state.hands[seat]!;
  const exchange = state.ritualExchange;
  const discardOptions = exchange && exchange.seat === seat && ['blind-discard', 'revealed-discard'].includes(state.ritualPhase)
    ? exchange.newCardIds.map((id, index) => state.ritualPhase === 'blind-discard'
      ? { value: String(index) }
      : { value: id, card: CARD_BY_ID[id]! })
    : [];
  return {
    seat, hand: visibleHand.map(id => CARD_BY_ID[id]!),
    players: state.hands.map((hand, playerSeat) => ({
      seat: playerSeat, handCount: hand.length,
      skipsNextTrick: state.skipNextTrickSeats.includes(playerSeat),
    })),
    trick: state.trick.map(play => ({ seat: play.seat, card: CARD_BY_ID[play.cardId]! })),
    trickWins: [...state.trickWins], trickWinners: [...state.trickWinners],
    scores: [...state.scores], roundBaseStake: state.roundBaseStake,
    roundStake: state.roundStake, acceptedTrickLevel: state.acceptedTrickLevel,
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
    ritualMode: state.ritualMode, ritualPhase: state.ritualPhase, ritualModeLocked: state.ritualModeLocked, ritualChooser: state.ritualChooser,
    ritualDiscardSeat: state.ritualExchange?.seat ?? null,
    ritualHand: state.ritualHands[seat]!.map(ritualFromId),
    ritualHandCounts: state.ritualHands.map(hand => hand.length),
    ritualActive: state.ritualActiveId ? ritualFromId(state.ritualActiveId) : null,
    ritualPrediction: state.ritualPrediction,
    ritualEmpoweredKind: state.ritualEmpoweredKind,
    ritualTargetSeat: state.ritualTargetSeat,
    blindSeats: [0, 1, 2, 3].filter(playerSeat => isBlindToCreatures(state, playerSeat)),
    ancientDiscardSeat: state.ritualPhase === 'ancient-discard' ? ancientDiscardSeat(state) : null,
    ancientDiscardsLeft: state.ancientDiscardsLeft[seat]!,
    ritualDiscardOptions: discardOptions,
    lastCreatureReveal: state.lastCreatureReveal?.seat === seat ? CARD_BY_ID[state.lastCreatureReveal.cardId]! : null,
  };
}
