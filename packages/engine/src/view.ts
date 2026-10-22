import { CARD_BY_ID, type CreatureCard, type CreatureKind, type Moon } from './cards.js';
import { abilityAvailableFor, ancientDiscardSeat, championTargetSeat, genjutsuChoices, isBlindToCreatures, isMindControlled, keepsDeclaredRitualMode, mustChooseCreatureBlind, puppeteerChoices, ritualDecisionSeat, teamOf, teamSeats, type AbilityStage, type GameState, type PendingChallenge, type RoundResult, type Team } from './engine.js';
import { ritualFromId, type RitualCard } from './rituals.js';

export interface PlayerView {
  seat: number;
  handCount: number;
  sealedCount: number;
  skipsNextTrick: boolean;
  visibleHand?: CreatureCard[];
}
export interface GameView {
  seat: number;
  hand: CreatureCard[];
  players: PlayerView[];
  trick: { seat: number; card: CreatureCard | null }[];
  trickHistory: { plays: { seat: number; card: CreatureCard }[]; winnerSeat: number; winnerTeam: Team; weakenedSeat?: number; synthetic?: boolean }[];
  lastRoundTricks: { plays: { seat: number; card: CreatureCard }[]; winnerSeat: number; winnerTeam: Team; weakenedSeat?: number; synthetic?: boolean }[];
  trickWins: [number, number];
  trickWinners: Team[];
  scores: [number, number];
  targetScore: 15 | 25;
  roundBaseStake: number;
  roundStake: number;
  acceptedTrickLevel: GameState['acceptedTrickLevel'];
  lastRaiseTeam: Team | null;
  pendingChallenge: PendingChallenge | null;
  mindControlReady: boolean;
  pendingAbility: { seat: number; source: 'declined' | 'trick' | 'ritual'; stage: AbilityStage; card: CreatureCard | null; appliesNextRound: boolean; repeatsLeft: number } | null;
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
  ritualChampionTargetSeat: number | null;
  ritualChampionChosenSeats: number[];
  ritualTurbulentDiscards: { seat: number; card: CreatureCard }[];
  ritualForceKind: CreatureKind | null;
  ritualForceRoll: number | null;
  ritualProphecyNumber: number | null;
  ritualMirrorTargets: number[];
  ritualPermutationChosenSeats: number[];
  ritualBipolarWeakKind: CreatureKind | null;
  ritualDuelSeats: [number, number] | null;
  ritualDiceRolls: GameState['ritualDiceRolls'];
  lastDiceResult: GameState['lastDiceResult'];
  ritualStarAwardedTeam: Team | null;
  ritualWeakenedSeat: number | null;
  ritualWeakeningUsed: boolean;
  ritualWeakeningDecision: boolean;
  ritualMist: { moon: Moon; trickIndex: number } | null;
  ritualSumTrickIndex: number | null;
  ritualSumDecision: boolean;
  ritualGenjutsuUsed: boolean;
  ritualGenjutsuDecision: boolean;
  ritualGenjutsuChoices: CreatureCard[];
  ritualWagerTrickIndex: number | null;
  ritualWagerAwarded: boolean;
  ritualRuneRoll: number | null;
  ritualRuneKind: CreatureKind | null;
  ritualRuneCard: CreatureCard | null;
  ritualBondDrawCount: number;
  ritualBondTargetSeat: number | null;
  ritualBondDiscards: { seat: number; card: CreatureCard }[];
  ritualVotesFor: number;
  ritualVotesCast: number;
  ritualVotesNeeded: number;
  ritualPeekCards: CreatureCard[];
  ritualTeammateHand: { seat: number; cards: CreatureCard[] } | null;
  ritualTeammateHands: { seat: number; cards: CreatureCard[] }[];
  blindSeats: number[];
  mindControlledSeats: number[];
  ancientDiscardSeat: number | null;
  ancientDiscardsLeft: number;
  ritualDiscardOptions: { value: string; card?: CreatureCard }[];
  lastCreatureReveal: { reason: 'declined' | 'accelerated' | 'fairy' | 'goblin' | 'blind-discard'; round: number; seat: number; card: CreatureCard; source?: 'griffin' | 'puppeteer'; targetSeat?: number; tradedCard?: CreatureCard; pointAwarded?: boolean } | null;
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
    case 'puppet-card': return [skip, ...puppeteerChoices(state).filter(id => !pending.recoveredIds?.includes(id)).map(cardOption)];
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
  const creaturesHidden = state.ritualMode && (state.ritualPhase === 'mode' || state.ritualPhase === 'blind' || state.ritualPhase === 'blind-discard' || state.ritualPhase === 'seal' || state.ritualPhase === 'champions' || (state.ritualPhase === 'bond-rival' && seat === state.ritualBondTargetSeat) || isBlindToCreatures(state, seat));
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
      seat: playerSeat, handCount: hand.length + (state.sealedCardIds[playerSeat] ? 1 : 0),
      sealedCount: state.sealedCardIds[playerSeat] ? 1 : 0,
      skipsNextTrick: state.skipNextTrickSeats.includes(playerSeat),
      ...(state.ritualActiveId && ritualFromId(state.ritualActiveId).kind === 'olho-da-verdade' && state.ritualTargetSeat === playerSeat
        ? { visibleHand: hand.map(id => CARD_BY_ID[id]!) } : {}),
    })),
    trick: state.trick.map(play => ({ seat: play.seat, card: state.ritualActiveId && ritualFromId(state.ritualActiveId).kind === 'ritual-oculto' ? null : CARD_BY_ID[play.cardId]! })),
    trickHistory: state.trickHistory.map(trick => ({
      winnerSeat: trick.winnerSeat, winnerTeam: trick.winnerTeam,
      ...(trick.weakenedSeat !== undefined ? { weakenedSeat: trick.weakenedSeat } : {}),
      ...(trick.synthetic ? { synthetic: true } : {}),
      plays: trick.plays.map(play => ({ seat: play.seat, card: CARD_BY_ID[play.cardId]! })),
    })),
    lastRoundTricks: state.lastRoundTricks.map(trick => ({
      winnerSeat: trick.winnerSeat, winnerTeam: trick.winnerTeam,
      ...(trick.weakenedSeat !== undefined ? { weakenedSeat: trick.weakenedSeat } : {}),
      ...(trick.synthetic ? { synthetic: true } : {}),
      plays: trick.plays.map(play => ({ seat: play.seat, card: CARD_BY_ID[play.cardId]! })),
    })),
    trickWins: [...state.trickWins], trickWinners: [...state.trickWinners],
    scores: [...state.scores], targetScore: state.targetScore, roundBaseStake: state.roundBaseStake,
    roundStake: state.roundStake, acceptedTrickLevel: state.acceptedTrickLevel,
    lastRaiseTeam: state.lastRaiseTeam,
    pendingChallenge: state.pendingChallenge && { ...state.pendingChallenge },
    mindControlReady: state.mindControlReady,
    pendingAbility: state.pendingAbility && {
      seat: state.pendingAbility.seat, source: state.pendingAbility.source,
      stage: state.pendingAbility.stage, card: state.pendingAbility.cardId ? CARD_BY_ID[state.pendingAbility.cardId]! : null,
      appliesNextRound: state.pendingAbility.endRound !== null,
      repeatsLeft: state.pendingAbility.repeatsLeft ?? 1,
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
    ritualChampionTargetSeat: championTargetSeat(state),
    ritualChampionChosenSeats: state.ritualChampionCards.flatMap((id, playerSeat) => id === null ? [] : [playerSeat]),
    ritualTurbulentDiscards: state.ritualTurbulentDiscards.map(item => ({ seat: item.seat, card: CARD_BY_ID[item.cardId]! })),
    ritualForceKind: state.ritualForceKind, ritualForceRoll: state.ritualForceRoll,
    ritualProphecyNumber: state.ritualProphecyNumber,
    ritualMirrorTargets: [...state.ritualMirrorTargets],
    ritualPermutationChosenSeats: state.ritualPermutationCards.flatMap((id, playerSeat) => id === null ? [] : [playerSeat]),
    ritualBipolarWeakKind: state.ritualBipolarWeakKind,
    ritualDuelSeats: state.ritualDuelSeats && [...state.ritualDuelSeats] as [number, number],
    ritualDiceRolls: [...state.ritualDiceRolls] as GameState['ritualDiceRolls'],
    lastDiceResult: state.lastDiceResult && { ...state.lastDiceResult, rolls: [...state.lastDiceResult.rolls] as [number, number] },
    ritualStarAwardedTeam: state.ritualStarAwardedTeam,
    ritualWeakenedSeat: state.ritualWeakenedSeat,
    ritualWeakeningUsed: state.ritualWeakeningUsed,
    ritualWeakeningDecision: state.ritualWeakeningDecision,
    ritualMist: state.ritualMist && { ...state.ritualMist },
    ritualSumTrickIndex: state.ritualSumTrickIndex,
    ritualSumDecision: state.ritualSumDecision,
    ritualGenjutsuUsed: state.ritualGenjutsuUsed,
    ritualGenjutsuDecision: state.ritualGenjutsuDecision,
    ritualGenjutsuChoices: state.ritualGenjutsuDecision ? genjutsuChoices(state).map(id => CARD_BY_ID[id]!) : [],
    ritualWagerTrickIndex: state.ritualWagerTrickIndex,
    ritualWagerAwarded: state.ritualWagerAwarded,
    ritualRuneRoll: state.ritualRuneRoll,
    ritualRuneKind: state.ritualRuneCardId ? CARD_BY_ID[state.ritualRuneCardId]!.kind : null,
    ritualRuneCard: state.ritualRuneCardId && (seat === state.ritualChooser || state.hands[seat]!.includes(state.ritualRuneCardId))
      ? CARD_BY_ID[state.ritualRuneCardId]! : null,
    ritualBondDrawCount: state.ritualBondDrawn.length,
    ritualBondTargetSeat: state.ritualBondTargetSeat,
    ritualBondDiscards: state.ritualBondDiscards.map(item => ({ seat: item.seat, card: CARD_BY_ID[item.cardId]! })),
    ritualVotesFor: state.ritualPhase === 'destiny-vote' ? state.ritualDestinyApprovals.length : state.ritualBloodApprovals.length,
    ritualVotesCast: state.ritualTeamDecisions.length,
    ritualVotesNeeded: state.ritualPhase === 'destiny-vote'
      ? teamSeats(state, teamOf(state.ritualChooser)).length
      : Math.floor(teamSeats(state, teamOf(state.ritualChooser)).length / 2) + 1,
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
    mindControlledSeats: state.playerIds.map((_, playerSeat) => playerSeat).filter(playerSeat => isMindControlled(state, playerSeat)),
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
      } : state.lastCreatureReveal.reason === 'fairy' ? { targetSeat: state.lastCreatureReveal.targetSeat }
        : state.lastCreatureReveal.reason === 'blind-discard' ? { source: state.lastCreatureReveal.source } : {}),
    } : null,
  };
}
