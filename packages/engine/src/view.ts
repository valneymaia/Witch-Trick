import { CARD_BY_ID, type CreatureCard, type CreatureKind } from './cards.js';
import { abilityAvailableFor, ancientDiscardSeat, isBlindToCreatures, keepsDeclaredRitualMode, mustChooseCreatureBlind, puppeteerChoices, ritualDecisionSeat, teamOf, teamSeats, type AbilityStage, type GameState, type PendingChallenge, type RoundResult, type Team } from './engine.js';
import { ritualFromId, type RitualCard } from './rituals.js';

export interface PlayerView {
  seat: number;
  handCount: number;
  skipsNextTrick: boolean;
  visibleHand?: CreatureCard[];
}
export interface GameView {
  seat: number;
  hand: CreatureCard[];
  players: PlayerView[];
  trick: { seat: number; card: CreatureCard }[];
  trickWins: [number, number];
  trickWinners: Team[];
  scores: [number, number];
  targetScore: 15 | 25;
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
  ritualDecisionSeat: number | null;
  ritualMirrorTargets: number[];
  ritualVotesFor: number;
  ritualVotesCast: number;
  ritualVotesNeeded: number;
  ritualPeekCards: CreatureCard[];
  ritualTeammateHand: { seat: number; cards: CreatureCard[] } | null;
  ritualTeammateHands: { seat: number; cards: CreatureCard[] }[];
  blindSeats: number[];
  ancientDiscardSeat: number | null;
  ancientDiscardsLeft: number;
  ritualDiscardOptions: { value: string; card?: CreatureCard }[];
  lastCreatureReveal: { reason: 'declined' | 'goblin' | 'blind-discard'; round: number; seat: number; card: CreatureCard; source?: 'griffin' | 'puppeteer'; targetSeat?: number; tradedCard?: CreatureCard; pointAwarded?: boolean } | null;
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
      ...(state.ritualActiveId && ritualFromId(state.ritualActiveId).kind === 'olho-da-verdade' && state.ritualTargetSeat === playerSeat
        ? { visibleHand: hand.map(id => CARD_BY_ID[id]!) } : {}),
    })),
    trick: state.trick.map(play => ({ seat: play.seat, card: CARD_BY_ID[play.cardId]! })),
    trickWins: [...state.trickWins], trickWinners: [...state.trickWinners],
    scores: [...state.scores], targetScore: state.targetScore, roundBaseStake: state.roundBaseStake,
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
    ritualDecisionSeat: ritualDecisionSeat(state),
    ritualMirrorTargets: [...state.ritualMirrorTargets],
    ritualVotesFor: state.ritualBloodApprovals.length,
    ritualVotesCast: state.ritualTeamDecisions.length,
    ritualVotesNeeded: Math.floor(teamSeats(state, teamOf(state.ritualChooser)).length / 2) + 1,
    ritualPeekCards: state.ritualPeek && seat === state.ritualChooser
      ? state.ritualPeek.cardIds.map(id => CARD_BY_ID[id]!) : [],
    ritualTeammateHand: state.ritualActiveId && teamOf(seat) === teamOf(state.ritualChooser)
      && ((ritualFromId(state.ritualActiveId).kind === 'acordo-de-sangue' && state.ritualPhase === 'blood-vote')
        || (ritualFromId(state.ritualActiveId).kind === 'visao-compartilhada' && state.ritualPhase === 'play'))
      ? { seat: teamSeats(state, teamOf(seat)).find(member => member !== seat)!, cards: state.hands[teamSeats(state, teamOf(seat)).find(member => member !== seat)!]!.map(id => CARD_BY_ID[id]!) } : null,
    ritualTeammateHands: state.ritualActiveId && teamOf(seat) === teamOf(state.ritualChooser)
      && ((ritualFromId(state.ritualActiveId).kind === 'acordo-de-sangue' && state.ritualPhase === 'blood-vote')
        || (ritualFromId(state.ritualActiveId).kind === 'visao-compartilhada' && state.ritualPhase === 'play'))
      ? teamSeats(state, teamOf(seat)).filter(member => member !== seat)
        .map(member => ({ seat: member, cards: state.hands[member]!.map(id => CARD_BY_ID[id]!) })) : [],
    blindSeats: state.playerIds.map((_, playerSeat) => playerSeat).filter(playerSeat => isBlindToCreatures(state, playerSeat)),
    ancientDiscardSeat: state.ritualPhase === 'ancient-discard' ? ancientDiscardSeat(state) : null,
    ancientDiscardsLeft: state.ancientDiscardsLeft[seat]!,
    ritualDiscardOptions: discardOptions,
    lastCreatureReveal: state.lastCreatureReveal ? {
      reason: state.lastCreatureReveal.reason, round: state.lastCreatureReveal.round,
      seat: state.lastCreatureReveal.seat, card: CARD_BY_ID[state.lastCreatureReveal.cardId]!,
      ...(state.lastCreatureReveal.reason === 'goblin' ? {
        targetSeat: state.lastCreatureReveal.targetSeat,
        tradedCard: CARD_BY_ID[state.lastCreatureReveal.tradedCardId]!,
        pointAwarded: state.lastCreatureReveal.pointAwarded,
      } : state.lastCreatureReveal.reason === 'blind-discard' ? { source: state.lastCreatureReveal.source } : {}),
    } : null,
  };
}
