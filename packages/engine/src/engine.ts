import { CARD_BY_ID, CARDS, CREATURES, CREATURE_EFFECTS, MOONS, compareCards, type CreatureKind, type Moon } from './cards.js';
import { RITUAL_TEST_DECK, ritualFromId, type RitualKind } from './rituals.js';

export type Team = 0 | 1;
export interface PlayedCard { seat: number; cardId: string }
export interface CompletedTrick { plays: PlayedCard[]; winnerSeat: number; winnerTeam: Team; weakenedSeat?: number; synthetic?: boolean }
export type TrickLevel = 2 | 3 | 4;
export interface PendingChallenge {
  level: TrickLevel;
  challengerSeat: number;
  responderSeat: number;
}
export interface RoundResult {
  winner: Team;
  points: number;
  bonusPoints?: number;
  reason: 'tricks' | 'declined' | 'blood-withdrawal' | 'dice' | 'star' | 'wager';
  trickWinners: Team[];
  starBonusTeam?: Team;
  wagerBonusTeam?: Team;
  loserPenalty?: number;
  winnerPenalty?: number;
}
export interface ActiveEffect {
  key: string;
  ownerSeat: number;
  trigger: 'immediate' | 'next-trick' | 'round-end';
  expires: 'trick' | 'round';
  data: Record<string, unknown>;
}
export type AbilityStage = 'source' | 'offer' | 'puppet-card' | 'puppet-exchange' | 'fairy-target' | 'fairy-card' | 'goblin-own' | 'goblin-target' | 'griffin-discard' | 'wizard-target' | 'wizard-decision' | 'wizard-own' | 'witch-discard';
export interface PendingAbility {
  seat: number;
  source: 'declined' | 'trick' | 'ritual';
  stage: AbilityStage;
  cardId: string | null;
  endRound: { team: Team; reason: RoundResult['reason'] } | null;
  targetSeat?: number;
  targetRitualId?: string;
  ownCardId?: string;
  candidates?: string[];
  fromPreviousRound?: boolean;
  repeatsLeft?: number;
  recoveredIds?: string[];
}
export type CreatureReveal =
  | { reason: 'declined'; round: number; seat: number; cardId: string }
  | { reason: 'accelerated'; round: number; seat: number; cardId: string }
  | { reason: 'fairy'; round: number; seat: number; targetSeat: number; cardId: string }
  | { reason: 'goblin'; round: number; seat: number; targetSeat: number; cardId: string; tradedCardId: string; pointAwarded: boolean }
  | { reason: 'blind-discard'; source: 'griffin' | 'puppeteer'; round: number; seat: number; cardId: string };
export interface GameState {
  playerIds: string[];
  hands: string[][];
  sealedCardIds: (string | null)[];
  deck: string[];
  discard: string[];
  trick: PlayedCard[];
  trickHistory: CompletedTrick[];
  lastRoundTricks: CompletedTrick[];
  trickWins: [number, number];
  trickWinners: Team[];
  arcanaPlayedTeams: Team[];
  skipNextTrickSeats: number[];
  scores: [number, number];
  targetScore: 15 | 25;
  roundBaseStake: number;
  roundStake: number;
  acceptedTrickLevel: 0 | TrickLevel;
  lastRaiseTeam: Team | null;
  pendingChallenge: PendingChallenge | null;
  mindControlReady: boolean;
  pendingAbility: PendingAbility | null;
  pendingRoundAbility: PendingAbility | null;
  lastRound: RoundResult | null;
  round: number;
  roundStarter: number;
  turn: number;
  lastTrickWinner: number | null;
  lastRoundWinner: Team | null;
  winner: Team | null;
  rng: number;
  activeEffects: ActiveEffect[];
  ritualMode: boolean;
  ritualHands: string[][];
  ritualDeck: string[];
  ritualDiscard: string[];
  ritualPhase: 'off' | 'mode' | 'blind' | 'revealed' | 'blind-discard' | 'revealed-discard' | 'seal' | 'champions' | 'force-roll' | 'rune-roll' | 'rune-card' | 'bond-choice' | 'bond-rival' | 'ancient-discard' | 'mirror' | 'fortune' | 'permutation' | 'dice' | 'accelerate' | 'blood-vote' | 'destiny-vote' | 'play';
  ritualModeLocked: boolean;
  ritualChooser: number;
  ritualActiveId: string | null;
  ritualPrediction: '2-0' | '2-1' | null;
  ritualTrailingTeam: Team | null;
  ritualEmpoweredKind: CreatureKind | null;
  ritualTargetSeat: number | null;
  ritualPeek: { targetSeat: number; cardIds: string[] } | null;
  ritualTeamDecisions: number[];
  ritualPermutationCards: (string | null)[];
  ritualChampionCards: (string | null)[];
  ritualTurbulentDiscards: { seat: number; cardId: string }[];
  ritualForceKind: CreatureKind | null;
  ritualForceRoll: number | null;
  ritualProphecyNumber: number | null;
  ritualProphecyCardIds: string[];
  ritualMist: { moon: Moon; trickIndex: number } | null;
  ritualSumTrickIndex: number | null;
  ritualSumDecision: boolean;
  ritualGenjutsuUsed: boolean;
  ritualGenjutsuDecision: boolean;
  ritualWagerTrickIndex: number | null;
  ritualWagerAwarded: boolean;
  ritualRuneRoll: number | null;
  ritualRuneCardId: string | null;
  ritualBondDrawn: string[];
  ritualBondTargetSeat: number | null;
  ritualBondDiscards: { seat: number; cardId: string }[];
  ritualBipolarWeakKind: CreatureKind | null;
  ritualBloodApprovals: number[];
  ritualDestinyApprovals: number[];
  ritualMirrorTargets: number[];
  ritualDuelSeats: [number, number] | null;
  ritualDiceRolls: [number | null, number | null];
  lastDiceResult: { round: number; rolls: [number, number]; winner: Team | null } | null;
  ritualStarAwardedTeam: Team | null;
  ritualWeakenedSeat: number | null;
  ritualWeakeningUsed: boolean;
  ritualWeakeningDecision: boolean;
  ancientDiscardsLeft: number[];
  ritualExchange: { seat: number; newCardIds: string[]; discardsLeft: number } | null;
  lastCreatureReveal: CreatureReveal | null;
}
export type GameAction =
  | { type: 'play'; playerId: string; cardId: string }
  | { type: 'mind-ready'; playerId: string }
  | { type: 'raise'; playerId: string }
  | { type: 'counter'; playerId: string }
  | { type: 'respond'; playerId: string; accept: boolean }
  | { type: 'ability'; playerId: string; choice: string }
  | { type: 'ritual-mode'; playerId: string; blind: boolean }
  | { type: 'ritual-reveal'; playerId: string }
  | { type: 'ritual-play'; playerId: string; ritualId: string; prediction?: '2-0' | '2-1'; creatureKind?: CreatureKind; numberValue?: number; trickNumber?: number; targetSeat?: number; allySeat?: number }
  | { type: 'ritual-seal'; playerId: string; index: number }
  | { type: 'ritual-champion'; playerId: string; index: number }
  | { type: 'ritual-force-roll'; playerId: string }
  | { type: 'ritual-rune-roll'; playerId: string }
  | { type: 'ritual-rune-card'; playerId: string; cardId: string }
  | { type: 'ritual-bond-keep'; playerId: string; discardIds: string[] }
  | { type: 'ritual-bond-pass'; playerId: string }
  | { type: 'ritual-bond-rival'; playerId: string; indices: number[] }
  | { type: 'ritual-mist'; playerId: string; moon: Moon }
  | { type: 'ritual-sum'; playerId: string; activate: boolean }
  | { type: 'ritual-genjutso'; playerId: string; recoverCardId?: string; discardCardId?: string }
  | { type: 'ritual-discard'; playerId: string; choice: string }
  | { type: 'ritual-ancient-discard'; playerId: string; cardId: string }
  | { type: 'ritual-mirror'; playerId: string; targetSeat?: number }
  | { type: 'ritual-fortune'; playerId: string; cardId?: string; targetSeat?: number; targetIndex?: number }
  | { type: 'ritual-permutation'; playerId: string; cardId: string }
  | { type: 'ritual-roll'; playerId: string }
  | { type: 'ritual-blood'; playerId: string; play: boolean }
  | { type: 'ritual-destiny'; playerId: string; approve: boolean }
  | { type: 'ritual-accelerate'; playerId: string; cardId: string }
  | { type: 'ritual-weaken'; playerId: string; targetSeat?: number };
export const TARGET_SCORE = 15;
export const ROUND_POINTS = 1;
export const MAX_TRICK_POINTS = 4;
export const teamOf = (seat: number): Team => (seat % 2) as Team;
export const teamSeats = (state: GameState, team: Team): number[] =>
  state.playerIds.map((_, seat) => seat).filter(seat => teamOf(seat) === team);
const ritualTeamSeats = (state: GameState): number[] =>
  Array.from({ length: state.playerIds.length / 2 }, (_, index) =>
    (state.ritualChooser + index * 2) % state.playerIds.length);
export function isBlindToCreatures(state: GameState, seat: number): boolean {
  if (!state.ritualActiveId) return false;
  const kind = ritualFromId(state.ritualActiveId).kind;
  return kind === 'veu-da-incerteza' || (kind === 'mao-cega' && state.ritualTargetSeat === seat);
}
export function isMindControlled(state: GameState, seat: number): boolean {
  return state.ritualActiveId !== null
    && ritualFromId(state.ritualActiveId).kind === 'controle-mental'
    && teamOf(seat) !== teamOf(state.ritualChooser);
}
export const mindControllerSeat = (state: GameState, targetSeat: number): number =>
  (targetSeat - 1 + state.playerIds.length) % state.playerIds.length;
export function mustChooseCreatureBlind(state: GameState, seat: number, pending: PendingAbility): boolean {
  return (pending.fromPreviousRound === true && state.ritualPhase === 'blind') || isBlindToCreatures(state, seat);
}
export function ancientDiscardSeat(state: GameState): number | null {
  for (const seat of ritualTeamSeats(state)) {
    if (state.ancientDiscardsLeft[seat]! > 0) return seat;
  }
  return null;
}
export function ritualDecisionSeat(state: GameState): number | null {
  if (state.ritualPhase === 'bond-rival') return state.ritualBondTargetSeat;
  if (state.ritualPhase === 'accelerate') return state.ritualChooser;
  if (state.ritualPhase === 'champions') return state.ritualChooser;
  if (state.ritualPhase === 'permutation') return state.playerIds.map((_, offset) => (state.ritualChooser + offset) % state.playerIds.length)
    .find(seat => state.ritualPermutationCards[seat] === null) ?? null;
  if (state.ritualPhase === 'seal') return state.playerIds.findIndex((_, seat) => !state.ritualTeamDecisions.includes(seat));
  if (state.ritualPhase === 'dice') return state.ritualDiceRolls[teamOf(state.ritualChooser)] === null
    ? state.ritualChooser : (state.ritualChooser + 1) % state.playerIds.length;
  if (state.ritualPhase === 'ancient-discard') return ancientDiscardSeat(state);
  if (state.ritualPhase === 'blind-discard' || state.ritualPhase === 'revealed-discard') return state.ritualExchange?.seat ?? null;
  if (state.ritualPhase === 'mirror' || state.ritualPhase === 'fortune' || state.ritualPhase === 'blood-vote' || state.ritualPhase === 'destiny-vote') {
    return ritualTeamSeats(state).find(seat => !state.ritualTeamDecisions.includes(seat)) ?? null;
  }
  return state.ritualChooser;
}
export function championTargetSeat(state: GameState): number | null {
  if (state.ritualPhase !== 'champions') return null;
  return state.playerIds.map((_, offset) => (state.ritualChooser + offset) % state.playerIds.length)
    .find(seat => state.ritualChampionCards[seat] === null) ?? null;
}
export function trickPoints(baseStake: number, level: TrickLevel): number {
  return baseStake === ROUND_POINTS ? level : baseStake + level;
}
export function abilityAvailableFor(state: GameState, cardId: string): boolean {
  const kind = CARD_BY_ID[cardId]!.kind;
  return CREATURE_EFFECTS[kind].available && (state.ritualMode || (kind !== 'wizard' && kind !== 'witch'));
}
export function keepsDeclaredRitualMode(state: GameState, seat: number, discardedId: string, receivedId?: string): boolean {
  if (!state.ritualModeLocked || seat !== state.ritualChooser || !['blind', 'revealed'].includes(state.ritualPhase)) return true;
  const blind = state.ritualPhase === 'blind';
  return [...state.ritualHands[seat]!.filter(id => id !== discardedId), ...(receivedId ? [receivedId] : [])]
    .some(id => ritualFromId(id).blind === blind);
}

function nextRandom(seed: number): number {
  let x = seed | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return x >>> 0 || 0x9e3779b9;
}
function shuffleIds(ids: string[], seed: number): { cards: string[]; seed: number } {
  const cards = [...ids];
  for (let i = cards.length - 1; i > 0; i--) {
    seed = nextRandom(seed);
    const j = seed % (i + 1);
    [cards[i], cards[j]] = [cards[j]!, cards[i]!];
  }
  return { cards, seed };
}
function shuffled(seed: number, reservedCardIds: string[] = []): { cards: string[]; seed: number } {
  return shuffleIds(CARDS.map(card => card.id).filter(id => !reservedCardIds.includes(id)), seed);
}
function deal(state: GameState, reserved?: { seat: number; cardIds: string[] }): GameState {
  const { cards, seed } = shuffled(state.rng, reserved?.cardIds);
  const hands: GameState['hands'] = Array.from({ length: state.playerIds.length }, () => []);
  for (let i = 0; i < state.playerIds.length * 3; i++) hands[i % state.playerIds.length]!.push(cards.pop()!);
  if (reserved) hands[reserved.seat]!.push(...reserved.cardIds);
  return {
    ...state, hands, sealedCardIds: state.playerIds.map(() => null), deck: cards, discard: [], trick: [], trickHistory: [], trickWins: [0, 0],
    trickWinners: [], arcanaPlayedTeams: [], skipNextTrickSeats: [], roundBaseStake: ROUND_POINTS,
    roundStake: ROUND_POINTS, acceptedTrickLevel: 0, lastRaiseTeam: null,
    pendingChallenge: null, mindControlReady: false, pendingAbility: null, pendingRoundAbility: null, turn: state.roundStarter, rng: seed, activeEffects: [],
    ritualPhase: state.ritualMode ? 'blind' : 'off', ritualModeLocked: false, ritualChooser: state.roundStarter,
    ritualActiveId: null, ritualPrediction: null, ritualTrailingTeam: null, ritualEmpoweredKind: null, ritualTargetSeat: null,
    ritualPeek: null, ritualTeamDecisions: [], ritualPermutationCards: state.playerIds.map(() => null),
    ritualChampionCards: state.playerIds.map(() => null), ritualTurbulentDiscards: [], ritualForceKind: null, ritualForceRoll: null,
    ritualProphecyNumber: null, ritualProphecyCardIds: [], ritualMist: null, ritualSumTrickIndex: null, ritualSumDecision: false,
    ritualGenjutsuUsed: false, ritualGenjutsuDecision: false, ritualWagerTrickIndex: null, ritualWagerAwarded: false,
    ritualRuneRoll: null, ritualRuneCardId: null, ritualBondDrawn: [], ritualBondTargetSeat: null, ritualBondDiscards: [],
    ritualBipolarWeakKind: null,
    ritualBloodApprovals: [], ritualDestinyApprovals: [], ritualMirrorTargets: [], ritualDuelSeats: null,
    ritualDiceRolls: [null, null], ritualStarAwardedTeam: null, ritualWeakenedSeat: null, ritualWeakeningUsed: false, ritualWeakeningDecision: false,
    ancientDiscardsLeft: state.playerIds.map(() => 0), ritualExchange: null,
  };
}
export function createGame(playerIds: string[], seed: number, ritualMode = false, targetScore: 15 | 25 = 15): GameState {
  if (![4, 6, 8].includes(playerIds.length) || new Set(playerIds).size !== playerIds.length || playerIds.some(id => !id)) throw new Error('São necessários 4, 6 ou 8 jogadores distintos.');
  if (targetScore !== 15 && targetScore !== 25) throw new Error('Escolha 15 ou 25 pontos.');
  const rng = nextRandom(seed || 0x9e3779b9);
  const state: GameState = {
    playerIds: [...playerIds], hands: playerIds.map(() => []), sealedCardIds: playerIds.map(() => null), deck: [], discard: [], trick: [],
    trickHistory: [], lastRoundTricks: [], trickWins: [0, 0], trickWinners: [], arcanaPlayedTeams: [], skipNextTrickSeats: [], scores: [0, 0], targetScore,
    roundBaseStake: ROUND_POINTS, roundStake: ROUND_POINTS, acceptedTrickLevel: 0,
    lastRaiseTeam: null, pendingChallenge: null, mindControlReady: false, pendingAbility: null, pendingRoundAbility: null, lastRound: null,
    round: 1, roundStarter: rng % playerIds.length,
    turn: rng % playerIds.length, lastTrickWinner: null, lastRoundWinner: null, winner: null,
    rng, activeEffects: [],
    ritualMode, ritualHands: playerIds.map(() => []), ritualDeck: [], ritualDiscard: [],
    ritualPhase: ritualMode ? 'blind' : 'off', ritualModeLocked: false, ritualChooser: rng % playerIds.length,
    ritualActiveId: null, ritualPrediction: null, ritualTrailingTeam: null, ritualEmpoweredKind: null, ritualTargetSeat: null,
    ritualPeek: null, ritualTeamDecisions: [], ritualPermutationCards: playerIds.map(() => null),
    ritualChampionCards: playerIds.map(() => null), ritualTurbulentDiscards: [], ritualForceKind: null, ritualForceRoll: null,
    ritualProphecyNumber: null, ritualProphecyCardIds: [], ritualMist: null, ritualSumTrickIndex: null, ritualSumDecision: false,
    ritualGenjutsuUsed: false, ritualGenjutsuDecision: false, ritualWagerTrickIndex: null, ritualWagerAwarded: false,
    ritualRuneRoll: null, ritualRuneCardId: null, ritualBondDrawn: [], ritualBondTargetSeat: null, ritualBondDiscards: [],
    ritualBipolarWeakKind: null,
    ritualBloodApprovals: [], ritualDestinyApprovals: [], ritualMirrorTargets: [], ritualDuelSeats: null,
    ritualDiceRolls: [null, null], lastDiceResult: null, ritualStarAwardedTeam: null, ritualWeakenedSeat: null, ritualWeakeningUsed: false, ritualWeakeningDecision: false,
    ancientDiscardsLeft: playerIds.map(() => 0), ritualExchange: null,
    lastCreatureReveal: null,
  };
  if (ritualMode) {
    const ritualCards = shuffleIds(RITUAL_TEST_DECK, rng);
    state.rng = ritualCards.seed;
    state.ritualDeck = ritualCards.cards;
    for (let i = 0; i < playerIds.length * 3; i++) state.ritualHands[i % playerIds.length]!.push(state.ritualDeck.pop()!);
  }
  return deal(state);
}
function refillRitualHand(state: GameState, seat: number): GameState {
  if (!state.ritualMode || state.ritualHands[seat]!.length) return state;
  const hands = state.ritualHands.map(hand => [...hand]) as GameState['ritualHands'];
  let deck = [...state.ritualDeck];
  let discard = [...state.ritualDiscard];
  let rng = state.rng;
  for (let i = 0; i < 3; i++) {
    if (!deck.length && discard.length) {
      const shuffledDiscard = shuffleIds(discard, rng);
      deck = shuffledDiscard.cards; rng = shuffledDiscard.seed; discard = [];
    }
    if (!deck.length) break;
    hands[seat]!.push(deck.pop()!);
  }
  return { ...state, ritualHands: hands, ritualDeck: deck, ritualDiscard: discard, rng };
}
function finishRound(state: GameState, team: Team, reason: RoundResult['reason'], reserved?: { seat: number; cardIds: string[] }): GameState {
  const scores = [...state.scores] as GameState['scores'];
  scores[team] += state.roundStake;
  const loser = (1 - team) as Team;
  const ritual = state.ritualActiveId ? ritualFromId(state.ritualActiveId).kind : null;
  const curse = ritual === 'maldicao-da-derrota';
  const loserPenalty = curse ? Math.min(3, scores[loser]) : 0;
  scores[loser] -= loserPenalty;
  const winnerPenalty = ritual === 'escudo-arcano' && team !== teamOf(state.ritualChooser)
    ? Math.min(1, scores[team]) : 0;
  scores[team] -= winnerPenalty;
  let bonusPoints = 0;
  if (ritual === 'mapa-do-destino'
    && team === teamOf(state.ritualChooser) && reason === 'tricks'
    && state.ritualPrediction === (state.trickWins[1 - team] === 0 ? '2-0' : '2-1')) {
    bonusPoints = 1;
  }
  if (ritual === 'zebra-mistica' && team === state.ritualTrailingTeam) bonusPoints = 1;
  if (ritual === 'blefe-premiado' && team === teamOf(state.ritualChooser)
    && !state.arcanaPlayedTeams.includes(team)) bonusPoints = 2;
  if (ritual === 'divida-arcana' && team !== teamOf(state.ritualChooser))
    bonusPoints = state.arcanaPlayedTeams.filter(playedTeam => playedTeam === teamOf(state.ritualChooser)).length;
  scores[team] = Math.min(state.targetScore, scores[team] + bonusPoints);
  const result: RoundResult = {
    winner: team, points: state.roundStake + bonusPoints, ...(bonusPoints ? { bonusPoints } : {}), reason,
    trickWinners: [...state.trickWinners], ...(state.ritualStarAwardedTeam !== null ? { starBonusTeam: state.ritualStarAwardedTeam } : {}),
    ...(state.ritualWagerAwarded ? { wagerBonusTeam: teamOf(state.ritualChooser) } : {}),
    ...(curse ? { loserPenalty } : {}),
    ...(winnerPenalty ? { winnerPenalty } : {}),
  };
  let completed: GameState = {
    ...state, scores, lastRoundWinner: team, lastRound: result,
    lastRoundTricks: state.trickHistory.map(completedTrick => ({ ...completedTrick, plays: completedTrick.plays.map(play => ({ ...play })) })),
    pendingChallenge: null, pendingAbility: null,
    ritualDiscard: state.ritualActiveId ? [...state.ritualDiscard, state.ritualActiveId] : state.ritualDiscard,
    ritualActiveId: null, ritualEmpoweredKind: null,
  };
  completed = refillRitualHand(completed, state.ritualChooser);
  if (scores[team] >= state.targetScore) return { ...completed, winner: team, ritualPhase: 'off' };
  return deal({ ...completed, round: state.round + 1, roundStarter: (state.roundStarter + 1) % state.playerIds.length }, reserved);
}
function abilityBlocked(state: GameState, seat: number): boolean {
  return (state.ritualActiveId !== null && ritualFromId(state.ritualActiveId).kind === 'magia-nula')
    || state.activeEffects.some(effect => effect.key === 'wolf' && teamOf(effect.ownerSeat) !== teamOf(seat));
}
export function puppeteerChoices(state: GameState): string[] {
  return [...state.discard, ...state.trick.map(play => play.cardId)]
    .filter(id => CARD_BY_ID[id]!.kind !== 'puppeteer');
}
export function genjutsuChoices(state: GameState): string[] {
  return [...new Set(state.trickHistory.flatMap(trick => trick.plays
    .filter(play => play.seat === state.ritualChooser && state.discard.includes(play.cardId))
    .map(play => play.cardId)))];
}
function closeAbility(state: GameState): GameState {
  const pending = state.pendingAbility!;
  if ((pending.repeatsLeft ?? 1) > 1 && pending.cardId) {
    const repeated: PendingAbility = { seat: pending.seat, source: pending.source, stage: 'offer', cardId: pending.cardId,
      endRound: pending.endRound, repeatsLeft: (pending.repeatsLeft ?? 1) - 1, fromPreviousRound: pending.fromPreviousRound };
    return activateAbility({ ...state, pendingAbility: repeated });
  }
  const clear = { ...state, pendingAbility: null };
  if (pending.source === 'ritual' && clear.ritualPhase === 'accelerate') return completeRitualPhase(clear);
  return pending.endRound ? finishRound(clear, pending.endRound.team, pending.endRound.reason)
    : clear.ritualPhase === 'play' || !clear.ritualMode ? withAvailableTurn(clear) : clear;
}
function canPlaySeat(state: GameState, seat: number): boolean {
  if (state.ritualDuelSeats && !state.ritualDuelSeats.includes(seat)) return false;
  if (state.skipNextTrickSeats.includes(seat)) return false;
  return state.ritualActiveId && ritualFromId(state.ritualActiveId).kind === 'feitico-oculto'
    && state.trickHistory.length >= 2
    ? state.sealedCardIds[seat] !== null : state.hands[seat]!.length > 0;
}
function withAvailableTurn(state: GameState): GameState {
  const turn = state.playerIds.map((_, offset) => (state.turn + offset) % state.playerIds.length)
    .find(seat => canPlaySeat(state, seat));
  return turn === undefined ? state : { ...state, turn };
}
function activateAbility(state: GameState): GameState {
  const pending = state.pendingAbility!;
  const kind = CARD_BY_ID[pending.cardId!]!.kind;
  const team = teamOf(pending.seat);
  if (kind === 'raven') {
    const scores = [...state.scores] as GameState['scores'];
    const opponent = (1 - team) as Team;
    scores[opponent] = Math.max(0, scores[opponent] - 2);
    return closeAbility({ ...state, scores });
  }
  if (kind === 'familiar') {
    const scores = [...state.scores] as GameState['scores'];
    scores[team] = Math.min(state.targetScore, scores[team] + 1);
    const next = closeAbility({ ...state, scores });
    return scores[team] >= state.targetScore ? { ...next, winner: team } : next;
  }
  if (kind === 'wolf') {
    return closeAbility({ ...state, activeEffects: [...state.activeEffects, {
      key: 'wolf', ownerSeat: pending.seat, trigger: 'immediate', expires: 'round', data: {},
    }] });
  }
  if (kind === 'puppeteer') {
    if (!pending.endRound && !state.hands[pending.seat]!.length) return closeAbility(state);
    const choices = puppeteerChoices(state);
    return choices.length ? { ...state, pendingAbility: { ...pending, stage: 'puppet-card' } } : closeAbility(state);
  }
  if (kind === 'fairy') {
    const targets = state.hands.map((hand, seat) => teamOf(seat) !== team && hand.length ? seat : -1).filter(seat => seat >= 0);
    return targets.length ? { ...state, pendingAbility: { ...pending, stage: 'fairy-target' } } : closeAbility(state);
  }
  if (kind === 'goblin') {
    return state.hands[pending.seat]!.length ? { ...state, pendingAbility: { ...pending, stage: 'goblin-own' } } : closeAbility(state);
  }
  if (kind === 'griffin') {
    if (!state.deck.length) return closeAbility(state);
    const cardId = state.deck[state.deck.length - 1]!;
    const hands = state.hands.map(hand => [...hand]) as GameState['hands'];
    hands[pending.seat]!.push(cardId);
    return { ...state, deck: state.deck.slice(0, -1), hands, pendingAbility: { ...pending, stage: 'griffin-discard' } };
  }
  if (kind === 'wizard') {
    const targets = state.ritualHands.some((hand, seat) => teamOf(seat) !== team && hand.length);
    return state.ritualHands[pending.seat]!.length && targets
      ? { ...state, pendingAbility: { ...pending, stage: 'wizard-target' } } : closeAbility(state);
  }
  if (kind === 'witch') {
    let deck = [...state.ritualDeck];
    let discard = [...state.ritualDiscard];
    let rng = state.rng;
    if (!deck.length && discard.length) {
      const shuffledDiscard = shuffleIds(discard, rng);
      deck = shuffledDiscard.cards; rng = shuffledDiscard.seed; discard = [];
    }
    if (!deck.length) return closeAbility(state);
    const ritualHands = state.ritualHands.map(hand => [...hand]) as GameState['ritualHands'];
    ritualHands[pending.seat]!.push(deck.pop()!);
    return { ...state, rng, ritualDeck: deck, ritualDiscard: discard, ritualHands, pendingAbility: { ...pending, stage: 'witch-discard' } };
  }
  return closeAbility(state);
}
function activateInNextRound(state: GameState): GameState {
  const pending = state.pendingAbility!;
  if (!pending.endRound) return activateAbility(state);
  const next = finishRound(state, pending.endRound.team, pending.endRound.reason);
  if (next.winner !== null) return next;
  if (next.ritualMode) return { ...next, ritualPhase: 'mode', pendingRoundAbility: { ...pending, endRound: null, fromPreviousRound: true } };
  return activateAbility({ ...next, pendingAbility: { ...pending, endRound: null } });
}
function completeRitualPhase(state: GameState): GameState {
  return withAvailableTurn({ ...state, ritualPhase: 'play' });
}
function finishPuppeteerRound(state: GameState, pending: PendingAbility, cardIds: string[]): GameState {
  const next = finishRound(state, pending.endRound!.team, pending.endRound!.reason, { seat: pending.seat, cardIds });
  if (next.winner !== null) return next;
  if (next.ritualMode) return { ...next, ritualPhase: 'mode', ritualExchange: {
    seat: pending.seat, newCardIds: next.hands[pending.seat]!.filter(id => !cardIds.includes(id)), discardsLeft: cardIds.length,
  } };
  return { ...next, pendingAbility: { ...pending, stage: 'puppet-exchange', endRound: null, ownCardId: cardIds[0] } };
}
function chooseAbility(state: GameState, seat: number, choice: string): GameState {
  const pending = state.pendingAbility;
  if (!pending || pending.seat !== seat) throw new Error('Este jogador não pode decidir a habilidade.');
  if (pending.stage === 'source') {
    if (choice === 'skip') return closeAbility({ ...state, pendingAbility: { ...pending, repeatsLeft: 1 } });
    const blind = mustChooseCreatureBlind(state, seat, pending);
    const index = Number(choice);
    const sealedSource = choice === 'sealed' && state.ritualActiveId !== null
      && ritualFromId(state.ritualActiveId).kind === 'feitico-oculto' && state.trickHistory.length >= 2;
    const cardId = sealedSource ? state.sealedCardIds[seat]
      : blind && Number.isInteger(index) && index >= 0 && index < state.hands[seat]!.length
      ? state.hands[seat]![index]! : !blind && state.hands[seat]!.includes(choice) ? choice : null;
    if (!cardId || (!blind && !sealedSource && !abilityAvailableFor(state, cardId))) throw new Error('Escolha uma carta válida da sua mão.');
    const hands = state.hands.map(hand => [...hand]) as GameState['hands'];
    hands[seat] = hands[seat]!.filter(id => id !== cardId);
    const sealedCardIds = [...state.sealedCardIds];
    if (sealedSource) sealedCardIds[seat] = null;
    const next = { ...state, hands, sealedCardIds, discard: [...state.discard, cardId], pendingAbility: { ...pending, cardId, stage: 'offer' as const }, lastCreatureReveal: { reason: 'declined' as const, round: state.round, seat, cardId } };
    if (!abilityAvailableFor(next, cardId)) return closeAbility(next);
    return CARD_BY_ID[cardId]!.kind === 'puppeteer' ? activateAbility(next) : activateInNextRound(next);
  }
  if (pending.stage === 'offer') {
    if (choice === 'skip') return closeAbility({ ...state, pendingAbility: { ...pending, repeatsLeft: 1 } });
    if (choice !== 'use') throw new Error('Escolha usar ou pular a habilidade.');
    return CARD_BY_ID[pending.cardId!]!.kind === 'puppeteer' ? activateAbility(state) : activateInNextRound(state);
  }
  if (pending.stage === 'puppet-card') {
    if (choice === 'skip') return pending.endRound && pending.recoveredIds?.length
      ? finishPuppeteerRound(state, pending, pending.recoveredIds)
      : closeAbility({ ...state, pendingAbility: { ...pending, repeatsLeft: 1 } });
    if (!puppeteerChoices(state).filter(id => !pending.recoveredIds?.includes(id)).includes(choice)) throw new Error('Escolha uma carta já jogada nesta rodada.');
    if (pending.endRound) {
      const recoveredIds = [...(pending.recoveredIds ?? []), choice];
      if ((pending.repeatsLeft ?? 1) > 1 && puppeteerChoices(state).some(id => !recoveredIds.includes(id)))
        return { ...state, pendingAbility: { ...pending, recoveredIds, repeatsLeft: 1 } };
      return finishPuppeteerRound(state, pending, recoveredIds);
    }
    const hands = state.hands.map(hand => [...hand]) as GameState['hands'];
    hands[seat]!.push(choice);
    return { ...state, hands, discard: state.discard.filter(id => id !== choice), pendingAbility: { ...pending, stage: 'puppet-exchange', ownCardId: choice } };
  }
  if (pending.stage === 'puppet-exchange') {
    const blind = mustChooseCreatureBlind(state, seat, pending);
    const index = Number(choice);
    const cardId = blind && Number.isInteger(index) && index >= 0 && index < state.hands[seat]!.length
      ? state.hands[seat]![index]! : !blind && state.hands[seat]!.includes(choice) ? choice : null;
    if (!cardId || cardId === pending.ownCardId) throw new Error('Troque por outra carta da sua mão.');
    const hands = state.hands.map(hand => [...hand]) as GameState['hands'];
    hands[seat] = hands[seat]!.filter(id => id !== cardId);
    return closeAbility({ ...state, hands, discard: [...state.discard, cardId] });
  }
  if (pending.stage === 'fairy-target') {
    if (choice === 'skip') return closeAbility({ ...state, pendingAbility: { ...pending, repeatsLeft: 1 } });
    const targetSeat = Number(choice);
    if (!Number.isInteger(targetSeat) || targetSeat < 0 || targetSeat >= state.playerIds.length || teamOf(targetSeat) === teamOf(seat) || !state.hands[targetSeat]!.length) throw new Error('Escolha um adversário com cartas.');
    const seed = nextRandom(state.rng);
    const hand = state.hands[targetSeat]!;
    const first = seed % hand.length;
    const second = hand.length > 1 ? (first + 1 + nextRandom(seed) % (hand.length - 1)) % hand.length : first;
    return { ...state, rng: nextRandom(seed), pendingAbility: { ...pending, stage: 'fairy-card', targetSeat, candidates: [hand[first]!, ...(second !== first ? [hand[second]!] : [])] } };
  }
  if (pending.stage === 'fairy-card') {
    if (!pending.candidates?.includes(choice) || pending.targetSeat === undefined) throw new Error('Escolha uma das cartas reveladas.');
    const hands = state.hands.map(hand => [...hand]) as GameState['hands'];
    hands[pending.targetSeat] = hands[pending.targetSeat]!.filter(id => id !== choice);
    const skipNextTrickSeats = [...new Set([...state.skipNextTrickSeats, pending.targetSeat])];
    const turn = state.playerIds.map((_, offset) => (state.turn + offset) % state.playerIds.length)
      .find(candidate => !state.trick.some(play => play.seat === candidate)
        && !skipNextTrickSeats.includes(candidate) && hands[candidate]!.length) ?? state.turn;
    return closeAbility({ ...state, hands, discard: [...state.discard, choice], skipNextTrickSeats, turn,
      lastCreatureReveal: { reason: 'fairy', round: state.round, seat, targetSeat: pending.targetSeat, cardId: choice } });
  }
  if (pending.stage === 'goblin-own') {
    if (choice === 'skip') return closeAbility({ ...state, pendingAbility: { ...pending, repeatsLeft: 1 } });
    const blind = mustChooseCreatureBlind(state, seat, pending);
    const index = Number(choice);
    const ownCardId = blind && Number.isInteger(index) && index >= 0 && index < state.hands[seat]!.length
      ? state.hands[seat]![index] : !blind && state.hands[seat]!.includes(choice) ? choice : null;
    if (!ownCardId) throw new Error('Escolha uma carta sua.');
    return { ...state, pendingAbility: { ...pending, stage: 'goblin-target', ownCardId } };
  }
  if (pending.stage === 'goblin-target') {
    if (choice === 'skip') return closeAbility({ ...state, pendingAbility: { ...pending, repeatsLeft: 1 } });
    const targetSeat = Number(choice);
    if (!Number.isInteger(targetSeat) || targetSeat < 0 || targetSeat >= state.playerIds.length || teamOf(targetSeat) === teamOf(seat) || !state.hands[targetSeat]!.length) throw new Error('Escolha um adversário com cartas.');
    const rng = nextRandom(state.rng);
    const received = state.hands[targetSeat]![rng % state.hands[targetSeat]!.length]!;
    const hands = state.hands.map(hand => [...hand]) as GameState['hands'];
    hands[seat] = hands[seat]!.filter(id => id !== pending.ownCardId);
    hands[targetSeat] = hands[targetSeat]!.filter(id => id !== received);
    hands[seat]!.push(received);
    hands[targetSeat]!.push(pending.ownCardId!);
    const scores = [...state.scores] as GameState['scores'];
    const pointAwarded = CARD_BY_ID[received]!.value <= 5;
    if (pointAwarded) scores[teamOf(seat)] = Math.min(state.targetScore, scores[teamOf(seat)] + 1);
    const next = closeAbility({ ...state, rng, hands, scores, lastCreatureReveal: { reason: 'goblin', round: state.round, seat, targetSeat, cardId: received, tradedCardId: pending.ownCardId!, pointAwarded } });
    return scores[teamOf(seat)] >= state.targetScore ? { ...next, winner: teamOf(seat) } : next;
  }
  if (pending.stage === 'griffin-discard') {
    const blind = mustChooseCreatureBlind(state, seat, pending);
    const index = Number(choice);
    const cardId = blind && Number.isInteger(index) && index >= 0 && index < state.hands[seat]!.length
      ? state.hands[seat]![index] : !blind && state.hands[seat]!.includes(choice) ? choice : null;
    if (!cardId) throw new Error('Escolha uma carta para descartar.');
    const hands = state.hands.map(hand => [...hand]) as GameState['hands'];
    hands[seat] = hands[seat]!.filter(id => id !== cardId);
    return closeAbility({ ...state, hands, discard: [...state.discard, cardId], lastCreatureReveal: blind
      ? { reason: 'blind-discard', source: 'griffin', round: state.round, seat, cardId } : state.lastCreatureReveal });
  }
  if (pending.stage === 'wizard-target') {
    if (choice === 'skip') return closeAbility(state);
    const target = Number(choice);
    if (!Number.isInteger(target) || target < 0 || target >= state.playerIds.length || teamOf(target) === teamOf(seat) || !state.ritualHands[target]!.length) throw new Error('Escolha um adversário com Rituais.');
    const rng = nextRandom(state.rng);
    const otherId = state.ritualHands[target]![rng % state.ritualHands[target]!.length]!;
    return { ...state, rng, pendingAbility: { ...pending, stage: 'wizard-decision', targetSeat: target, targetRitualId: otherId } };
  }
  if (pending.stage === 'wizard-decision') {
    if (choice === 'keep') return closeAbility(state);
    if (choice !== 'swap') throw new Error('Escolha trocar ou manter os Rituais.');
    if (!state.ritualHands[seat]!.some(id => keepsDeclaredRitualMode(state, seat, id, pending.targetRitualId))) throw new Error('A troca deixaria você sem Ritual da modalidade declarada.');
    return { ...state, pendingAbility: { ...pending, stage: 'wizard-own' } };
  }
  if (pending.stage === 'wizard-own') {
    if (!state.ritualHands[seat]!.includes(choice)) throw new Error('Escolha um Ritual da sua mão.');
    const target = pending.targetSeat;
    const otherId = pending.targetRitualId;
    if (target === undefined || !otherId || !state.ritualHands[target]!.includes(otherId)) throw new Error('O Ritual revelado não está disponível.');
    if (!keepsDeclaredRitualMode(state, seat, choice, otherId)) throw new Error('A troca deixaria você sem Ritual da modalidade declarada.');
    const ritualHands = state.ritualHands.map(hand => [...hand]) as GameState['ritualHands'];
    ritualHands[seat] = ritualHands[seat]!.filter(id => id !== choice);
    ritualHands[target] = ritualHands[target]!.filter(id => id !== otherId);
    ritualHands[seat]!.push(otherId);
    ritualHands[target]!.push(choice);
    return closeAbility({ ...state, ritualHands });
  }
  if (pending.stage === 'witch-discard') {
    if (!state.ritualHands[seat]!.includes(choice)) throw new Error('Escolha um Ritual da sua mão para descartar.');
    if (!keepsDeclaredRitualMode(state, seat, choice)) throw new Error('O descarte deixaria você sem Ritual da modalidade declarada.');
    const ritualHands = state.ritualHands.map(hand => [...hand]) as GameState['ritualHands'];
    ritualHands[seat] = ritualHands[seat]!.filter(id => id !== choice);
    return closeAbility({ ...state, ritualHands, ritualDiscard: [...state.ritualDiscard, choice] });
  }
  throw new Error('Etapa de habilidade inválida.');
}
function resolveCompletedTrick(state: GameState): GameState {
  const trick = state.trick;
  const ritualKind = state.ritualActiveId ? ritualFromId(state.ritualActiveId).kind : null;
  const adjusted = (play: PlayedCard) => {
    const card = CARD_BY_ID[play.cardId]!;
    const force = ritualKind === 'forca-oculta' && card.kind === state.ritualForceKind ? state.ritualForceRoll ?? 0 : 0;
    const prophecy = ritualKind === 'profecia-maia' && state.ritualProphecyCardIds.includes(play.cardId) ? 2 : 0;
    const echo = ritualKind === 'eco-temporal' && state.trickWinners[0] !== undefined
      && state.trickWinners[0] !== teamOf(state.ritualChooser) && state.trickHistory.length >= 1
      && teamOf(play.seat) === teamOf(state.ritualChooser) && card.kind !== 'arcana' ? 2 : 0;
    const rune = ritualKind === 'bencao-das-runas' && play.cardId === state.ritualRuneCardId ? 2 : 0;
    const weaken = play.seat === state.ritualWeakenedSeat && card.kind !== 'arcana' ? 2 : 0;
    return { ...card, value: card.value + force + prophecy + echo + rune - weaken };
  };
  const winningPlay = trick.reduce((best, play) => {
    const playedCard = adjusted(play);
    const bestCard = adjusted(best);
    const empowered = state.ritualEmpoweredKind;
    const mistMoon = ritualKind === 'nevoa-de-sussurros' && state.ritualMist?.trickIndex === state.trickHistory.length
      ? state.ritualMist.moon : null;
    const weakest = ritualKind === 'caldeirao-bipolar' ? state.ritualBipolarWeakKind : null;
    const playedWins = empowered && (playedCard.kind === empowered) !== (bestCard.kind === empowered)
      ? playedCard.kind === empowered
      : mistMoon && playedCard.value === bestCard.value
        && (playedCard.moon === mistMoon) !== (bestCard.moon === mistMoon)
        ? playedCard.moon === mistMoon
      : weakest && (playedCard.kind === weakest) !== (bestCard.kind === weakest)
        ? playedCard.kind !== weakest
      : ritualKind === 'ciclo-da-lua'
        ? playedCard.value > bestCard.value || (playedCard.value === bestCard.value
          && MOONS.indexOf(playedCard.moon) < MOONS.indexOf(bestCard.moon))
      : ritualKind === 'lua-invertida'
        ? playedCard.kind === 'arcana' && bestCard.kind !== 'arcana'
          ? true
          : playedCard.kind !== 'arcana' && bestCard.kind === 'arcana'
            ? false
            : compareCards(playedCard, bestCard) < 0
        : compareCards(playedCard, bestCard) > 0;
    return playedWins ? play : best;
  });
  let chosenPlay = winningPlay;
  if (ritualKind === 'todos-por-um' && state.ritualSumTrickIndex === state.trickHistory.length) {
    const totals: [number, number] = [0, 0];
    for (const play of trick) {
      const card = CARD_BY_ID[play.cardId]!;
      totals[teamOf(play.seat)] += card.kind === 'arcana' ? 0 : card.value;
    }
    const favored = teamOf(state.ritualChooser);
    const sumTeam: Team = totals[0] === totals[1]
      ? trick.some(play => teamOf(play.seat) === favored) ? favored : (1 - favored) as Team
      : totals[0] > totals[1] ? 0 : 1;
    chosenPlay = trick.filter(play => teamOf(play.seat) === sumTeam).reduce((best, play) =>
      compareCards(CARD_BY_ID[play.cardId]!, CARD_BY_ID[best.cardId]!) > 0
        ? play : best);
  }
  const team = teamOf(chosenPlay.seat);
  const trickWins = [...state.trickWins] as GameState['trickWins'];
  trickWins[team]++;
  const completed: GameState = {
    ...state, trick: [], discard: [...state.discard, ...trick.map(play => play.cardId)], trickWins,
    skipNextTrickSeats: [], turn: chosenPlay.seat, mindControlReady: false,
    ritualBipolarWeakKind: ritualKind === 'caldeirao-bipolar' && trickWins[team] < 2
      ? CARD_BY_ID[chosenPlay.cardId]!.kind : null,
    lastTrickWinner: chosenPlay.seat, trickWinners: [...state.trickWinners, team],
    trickHistory: [...state.trickHistory, { plays: trick.map(play => ({ ...play })), winnerSeat: chosenPlay.seat,
      winnerTeam: team, ...(state.ritualWeakenedSeat !== null ? { weakenedSeat: state.ritualWeakenedSeat } : {}) }],
    ritualWeakenedSeat: null, ritualWeakeningDecision: false,
  };
  let afterBonus = completed;
  if (ritualKind === 'estrela-guia' && state.trickHistory.length === 0) {
    const scores = [...completed.scores] as GameState['scores'];
    scores[team] = Math.min(completed.targetScore, scores[team] + 1);
    afterBonus = { ...completed, scores, ritualStarAwardedTeam: team };
    if (scores[team] >= completed.targetScore) return {
      ...afterBonus, winner: team, lastRoundWinner: team, ritualPhase: 'off', ritualActiveId: null,
      lastRound: { winner: team, points: 1, reason: 'star', trickWinners: [...afterBonus.trickWinners], starBonusTeam: team },
      lastRoundTricks: afterBonus.trickHistory,
      ritualDiscard: completed.ritualActiveId ? [...completed.ritualDiscard, completed.ritualActiveId] : completed.ritualDiscard,
    };
  }
  if (ritualKind === 'vaza-premiada' && state.ritualWagerTrickIndex === state.trickHistory.length
    && team === teamOf(state.ritualChooser)) {
    const scores = [...afterBonus.scores] as GameState['scores'];
    scores[team] = Math.min(afterBonus.targetScore, scores[team] + 1);
    afterBonus = { ...afterBonus, scores, ritualWagerAwarded: true };
    if (scores[team] >= afterBonus.targetScore) return {
      ...afterBonus, winner: team, lastRoundWinner: team, ritualPhase: 'off', ritualActiveId: null,
      lastRound: { winner: team, points: 1, reason: 'wager', trickWinners: [...afterBonus.trickWinners], wagerBonusTeam: team },
      lastRoundTricks: afterBonus.trickHistory,
      ritualDiscard: afterBonus.ritualActiveId ? [...afterBonus.ritualDiscard, afterBonus.ritualActiveId] : afterBonus.ritualDiscard,
    };
  }
  if (ritualKind === 'genjutso' && !afterBonus.ritualGenjutsuUsed
    && genjutsuChoices(afterBonus).length && afterBonus.hands[state.ritualChooser]!.length)
    return { ...afterBonus, ritualGenjutsuDecision: true };
  return finalizeResolvedTrick(afterBonus);
}

function finalizeResolvedTrick(state: GameState): GameState {
  const history = state.trickHistory.at(-1);
  if (!history) throw new Error('Nenhuma vaza concluída.');
  const winnerSeat = history.winnerSeat;
  const team = history.winnerTeam;
  const winningPlay = history.plays.find(play => play.seat === winnerSeat)!;
  const winningCard = CARD_BY_ID[winningPlay.cardId]!;
  const ritualKind = state.ritualActiveId ? ritualFromId(state.ritualActiveId).kind : null;
  const roundEnds = ritualKind === 'cartada-fantasma' || ritualKind === 'campeoes-ocultos' || state.trickWins[team] >= 2;
  if (!abilityAvailableFor(state, winningCard.id) || abilityBlocked(state, winnerSeat))
    return roundEnds ? finishRound(state, team, 'tricks') : withAvailableTurn(state);
  return { ...state, pendingAbility: {
    seat: winnerSeat, source: 'trick', stage: 'offer', cardId: winningPlay.cardId,
    endRound: roundEnds ? { team, reason: 'tricks' } : null,
    repeatsLeft: ritualKind === 'magia-duplicada' ? 2 : 1,
  } };
}

export function reduce(state: GameState, action: GameAction): GameState {
  if (state.winner !== null) throw new Error('A partida terminou.');
  const seat = state.playerIds.indexOf(action.playerId);
  if (seat < 0) throw new Error('Jogador não pertence à partida.');
  if (action.type === 'ability') return chooseAbility(state, seat, action.choice);
  if (state.pendingAbility) throw new Error('Aguarde a decisão da habilidade.');
  if (action.type === 'ritual-mode') {
    if (!state.ritualMode || state.ritualPhase !== 'mode' || seat !== state.ritualChooser) throw new Error('Não é hora de definir a modalidade do Ritual.');
    if (!state.ritualHands[seat]!.some(id => ritualFromId(id).blind === action.blind)) throw new Error('Você não possui Ritual dessa modalidade.');
    const ritualPhase = state.ritualExchange
      ? action.blind ? 'blind-discard' : 'revealed-discard'
      : action.blind ? 'blind' : 'revealed';
    const next: GameState = { ...state, ritualPhase, ritualModeLocked: true, pendingRoundAbility: null };
    return state.pendingRoundAbility ? activateAbility({ ...next, pendingAbility: state.pendingRoundAbility }) : next;
  }
  if (action.type === 'ritual-reveal') {
    if (!state.ritualMode || state.ritualPhase !== 'blind' || state.ritualModeLocked || seat !== state.ritualChooser) throw new Error('Não é hora de revelar as criaturas.');
    if (!state.ritualHands[seat]!.some(id => !ritualFromId(id).blind)) throw new Error('Você precisa escolher um Ritual antes de ver as criaturas.');
    return { ...state, ritualPhase: 'revealed' };
  }
  if (action.type === 'ritual-play') {
    if (!state.ritualMode || seat !== state.ritualChooser || !['blind', 'revealed'].includes(state.ritualPhase)) throw new Error('Não é sua vez de escolher um Ritual.');
    if (!state.ritualHands[seat]!.includes(action.ritualId)) throw new Error('Este Ritual não está na sua mão.');
    const ritual = ritualFromId(action.ritualId);
    if (ritual.blind !== (state.ritualPhase === 'blind')) throw new Error(ritual.blind ? 'Este Ritual deve ser escolhido antes de ver as criaturas.' : 'Veja as criaturas antes de escolher este Ritual.');
    if (ritual.kind === 'mapa-do-destino' && action.prediction !== '2-0' && action.prediction !== '2-1') throw new Error('Escolha o placar previsto: 2–0 ou 2–1.');
    if (ritual.kind === 'runa-da-vontade' && !CREATURES.some(creature => creature.kind === action.creatureKind)) throw new Error('Escolha uma criatura para fortalecer nas quatro Luas.');
    if (ritual.kind === 'forca-oculta' && !CREATURES.some(creature => creature.kind === action.creatureKind && creature.value >= 1 && creature.value <= 6))
      throw new Error('Escolha uma criatura de valor 1 a 6 para receber o resultado do D6.');
    if (ritual.kind === 'profecia-maia' && (!Number.isInteger(action.numberValue) || action.numberValue! < 1 || action.numberValue! > 9))
      throw new Error('Anuncie um número de 1 a 9 antes de ver as criaturas.');
    if (ritual.kind === 'vaza-premiada' && (!Number.isInteger(action.trickNumber) || action.trickNumber! < 1 || action.trickNumber! > 3))
      throw new Error('Escolha a vaza 1, 2 ou 3 para premiar.');
    if (ritual.kind === 'vinculo-as-cegas' && state.deck.length < 2)
      throw new Error('O Vínculo às Cegas precisa de duas criaturas no baralho.');
    if (['mao-cega', 'roubo-arcano', 'olho-da-verdade'].includes(ritual.kind)
      && (!Number.isInteger(action.targetSeat) || action.targetSeat! < 0 || action.targetSeat! >= state.playerIds.length || teamOf(action.targetSeat!) === teamOf(seat))) {
      throw new Error('Escolha um adversário para este Ritual.');
    }
    if (ritual.kind === 'pacto-da-batalha' && (
      !Number.isInteger(action.allySeat) || action.allySeat! < 0 || action.allySeat! >= state.playerIds.length || teamOf(action.allySeat!) !== teamOf(seat)
      || !Number.isInteger(action.targetSeat) || action.targetSeat! < 0 || action.targetSeat! >= state.playerIds.length || teamOf(action.targetSeat!) === teamOf(seat)
      || !state.hands[action.allySeat!]!.length || !state.hands[action.targetSeat!]!.length
    )) throw new Error('Escolha um jogador com cartas de cada equipe para o X1.');
    if (ritual.kind === 'revelacao-do-destino' && state.deck.length < ritualTeamSeats(state).length * 3)
      throw new Error('Não há criaturas suficientes no baralho para a Revelação do Destino.');
    if (ritual.kind === 'magia-acelerada' && !state.hands[seat]!.some(id => CARD_BY_ID[id]!.kind !== 'arcana'))
      throw new Error('Magia Acelerada exige uma criatura sua que não seja Arcana.');
    const ritualHands = state.ritualHands.map(hand => [...hand]) as GameState['ritualHands'];
    ritualHands[seat] = ritualHands[seat]!.filter(id => id !== action.ritualId);
    const selected: GameState = refillRitualHand({
      ...state, ritualHands, ritualActiveId: action.ritualId,
      ritualPrediction: ritual.kind === 'mapa-do-destino' ? action.prediction! : null,
      ritualTrailingTeam: ritual.kind === 'zebra-mistica' && state.scores[0] !== state.scores[1]
        ? state.scores[0] < state.scores[1] ? 0 : 1 : null,
      ritualEmpoweredKind: ritual.kind === 'runa-da-vontade' ? action.creatureKind! : null,
      ritualTargetSeat: ['mao-cega', 'roubo-arcano', 'olho-da-verdade'].includes(ritual.kind) ? action.targetSeat! : null,
      ritualPeek: ritual.kind === 'roubo-arcano' ? { targetSeat: action.targetSeat!, cardIds: [...state.hands[action.targetSeat!]!] } : null,
      ritualTeamDecisions: [], ritualPermutationCards: state.playerIds.map(() => null),
      ritualChampionCards: state.playerIds.map(() => null), ritualTurbulentDiscards: [],
      ritualForceKind: ritual.kind === 'forca-oculta' ? action.creatureKind! : null, ritualForceRoll: null,
      ritualProphecyNumber: ritual.kind === 'profecia-maia' ? action.numberValue! : null,
      ritualProphecyCardIds: ritual.kind === 'profecia-maia' ? state.hands.flatMap((hand, member) => teamOf(member) === teamOf(seat)
        ? hand.filter(id => CARD_BY_ID[id]!.value === action.numberValue) : []) : [], ritualBipolarWeakKind: null,
      ritualMist: null, ritualSumTrickIndex: null, ritualSumDecision: false, ritualGenjutsuUsed: false, ritualGenjutsuDecision: false,
      ritualWagerTrickIndex: ritual.kind === 'vaza-premiada' ? action.trickNumber! - 1 : null, ritualWagerAwarded: false,
      ritualRuneRoll: null, ritualRuneCardId: null, ritualBondDrawn: [], ritualBondTargetSeat: null, ritualBondDiscards: [],
      ritualBloodApprovals: [], ritualDestinyApprovals: [], ritualMirrorTargets: [],
      ritualDiceRolls: [null, null], lastDiceResult: ritual.kind === 'x1-no-dado' ? null : state.lastDiceResult,
      ritualDuelSeats: ritual.kind === 'pacto-da-batalha' ? [action.allySeat!, action.targetSeat!] : null,
      turn: ritual.kind === 'pacto-da-batalha' ? action.allySeat! : state.turn,
      roundBaseStake: ritual.kind === 'doblete-sombrio' ? 2 : ritual.kind === 'trick-explosivo' ? 3 : ritual.kind === 'trick-premiado' ? 4 : state.roundBaseStake,
      roundStake: ritual.kind === 'doblete-sombrio' ? 2 : ritual.kind === 'trick-explosivo' ? 3 : ritual.kind === 'trick-premiado' ? 4 : state.roundStake,
      ritualPhase: ritual.kind === 'campeoes-ocultos' ? 'champions'
        : ritual.kind === 'forca-oculta' ? 'force-roll'
        : ritual.kind === 'bencao-das-runas' ? 'rune-roll'
        : ritual.kind === 'vinculo-as-cegas' ? 'bond-choice'
        : ritual.kind === 'feitico-oculto' ? 'seal'
        : ritual.kind === 'escolha-da-ancia' ? 'ancient-discard'
        : ritual.kind === 'magia-acelerada' ? 'accelerate'
        : ritual.kind === 'espelho-enfeiticado' ? 'mirror'
          : ritual.kind === 'troca-de-sortes' ? 'fortune'
          : ritual.kind === 'permuta-profana' ? 'permutation'
          : ritual.kind === 'x1-no-dado' ? 'dice'
          : ritual.kind === 'acordo-de-sangue' ? 'blood-vote'
            : ritual.kind === 'revelacao-do-destino' ? 'destiny-vote' : 'play',
    }, seat);
    if (ritual.kind === 'feitico-oculto' || ritual.kind === 'campeoes-ocultos' || ritual.kind === 'forca-oculta' || ritual.kind === 'bencao-das-runas') return selected;
    if (ritual.kind === 'vinculo-as-cegas') {
      const deck = [...selected.deck];
      return { ...selected, deck, ritualBondDrawn: [deck.pop()!, deck.pop()!] };
    }
    if (ritual.kind === 'tempestade-de-cartas') {
      const counts = selected.hands.map(hand => hand.length);
      const mixed = shuffleIds(selected.hands.flat(), selected.rng);
      let offset = 0;
      const hands = counts.map(count => {
        const hand = mixed.cards.slice(offset, offset + count);
        offset += count;
        return hand;
      });
      return completeRitualPhase({ ...selected, hands, rng: mixed.seed });
    }
    if (ritual.kind === 'turbilhao-do-destino') {
      const hands = selected.hands.map(hand => [...hand]);
      const discard = [...selected.discard];
      const ritualTurbulentDiscards: GameState['ritualTurbulentDiscards'] = [];
      let rng = selected.rng;
      for (const member of ritualTeamSeats(selected)) {
        if (!hands[member]!.length) throw new Error('A equipe precisa ter uma criatura para descartar pelo Turbilhão.');
        rng = nextRandom(rng);
        const [cardId] = hands[member]!.splice(rng % hands[member]!.length, 1);
        discard.push(cardId!);
        ritualTurbulentDiscards.push({ seat: member, cardId: cardId! });
      }
      const winnerTeam = teamOf(seat);
      const trickWins = [...selected.trickWins] as GameState['trickWins'];
      trickWins[winnerTeam]++;
      return completeRitualPhase({ ...selected, hands, discard, rng, ritualTurbulentDiscards,
        trickWins, trickWinners: [...selected.trickWinners, winnerTeam],
        trickHistory: [...selected.trickHistory, { plays: ritualTurbulentDiscards.map(item => ({ seat: item.seat, cardId: item.cardId })),
          winnerSeat: seat, winnerTeam, synthetic: true }], lastTrickWinner: seat, turn: seat });
    }
    if (ritual.kind === 'escolha-da-ancia') {
      const members = ritualTeamSeats(selected);
      if (selected.deck.length < members.length * 3) throw new Error('Não há criaturas suficientes no baralho para a Escolha da Anciã.');
      const hands = selected.hands.map(hand => [...hand]) as GameState['hands'];
      const deck = [...selected.deck];
      for (const member of members) for (let i = 0; i < 3; i++) hands[member]!.push(deck.pop()!);
      return { ...selected, hands, deck, ancientDiscardsLeft: selected.playerIds.map((_, index) => members.includes(index) ? 3 : 0) };
    }
    return ['espelho-enfeiticado', 'troca-de-sortes', 'permuta-profana', 'x1-no-dado', 'acordo-de-sangue', 'revelacao-do-destino', 'magia-acelerada'].includes(ritual.kind)
      ? selected : completeRitualPhase(selected);
  }
  if (action.type === 'ritual-force-roll') {
    if (state.ritualPhase !== 'force-roll' || seat !== state.ritualChooser || state.ritualForceKind === null)
      throw new Error('Não é sua vez de lançar o D6 da Força Oculta.');
    const rng = nextRandom(state.rng);
    return completeRitualPhase({ ...state, rng, ritualForceRoll: rng % 6 + 1 });
  }
  if (action.type === 'ritual-rune-roll') {
    if (state.ritualPhase !== 'rune-roll' || seat !== state.ritualChooser)
      throw new Error('Não é sua vez de lançar o dado da Bênção das Runas.');
    const rng = nextRandom(state.rng);
    const ritualRuneRoll = rng % 6 + 1;
    const next = { ...state, rng, ritualRuneRoll };
    return ritualRuneRoll % 2 === 0 ? { ...next, ritualPhase: 'rune-card' } : completeRitualPhase(next);
  }
  if (action.type === 'ritual-rune-card') {
    if (state.ritualPhase !== 'rune-card' || seat !== state.ritualChooser || !state.hands[seat]!.includes(action.cardId))
      throw new Error('Escolha uma criatura da sua mão para a Bênção das Runas.');
    return completeRitualPhase({ ...state, ritualRuneCardId: action.cardId });
  }
  if (action.type === 'ritual-bond-keep') {
    if (state.ritualPhase !== 'bond-choice' || seat !== state.ritualChooser)
      throw new Error('Não é sua vez de decidir o Vínculo às Cegas.');
    const ids = action.discardIds;
    if (ids.length > 2 || new Set(ids).size !== ids.length || ids.some(id => !state.hands[seat]!.includes(id)))
      throw new Error('Escolha até duas criaturas da sua mão para trocar.');
    const hands = state.hands.map(hand => [...hand]);
    hands[seat] = hands[seat]!.filter(id => !ids.includes(id)).concat(state.ritualBondDrawn.slice(0, ids.length));
    const remaining = state.ritualBondDrawn.slice(ids.length);
    const next = { ...state, hands, discard: [...state.discard, ...ids], ritualBondDrawn: remaining,
      ritualBondDiscards: ids.map(cardId => ({ seat, cardId })) };
    if (!remaining.length) return completeRitualPhase(next);
    const target = (seat + 1) % state.playerIds.length;
    if (state.hands[target]!.length < remaining.length) throw new Error('O próximo adversário precisa ter criaturas para trocar.');
    return { ...next, ritualPhase: 'bond-rival', ritualBondTargetSeat: target };
  }
  if (action.type === 'ritual-bond-pass') {
    return reduce(state, { type: 'ritual-bond-keep', playerId: action.playerId, discardIds: [] });
  }
  if (action.type === 'ritual-bond-rival') {
    if (state.ritualPhase !== 'bond-rival' || seat !== state.ritualBondTargetSeat)
      throw new Error('Não é sua vez de trocar às cegas pelo Vínculo.');
    const indices = action.indices;
    if (indices.length !== state.ritualBondDrawn.length || new Set(indices).size !== indices.length
      || indices.some(index => !Number.isInteger(index) || index < 0 || index >= state.hands[seat]!.length))
      throw new Error(`Escolha ${state.ritualBondDrawn.length} posição(ões) diferente(s) pelo verso.`);
    const discarded = indices.map(index => state.hands[seat]![index]!);
    const hands = state.hands.map(hand => [...hand]);
    hands[seat] = hands[seat]!.filter((_, index) => !indices.includes(index)).concat(state.ritualBondDrawn);
    return completeRitualPhase({ ...state, hands, discard: [...state.discard, ...discarded], ritualBondDrawn: [],
      ritualBondDiscards: [...state.ritualBondDiscards, ...discarded.map(cardId => ({ seat, cardId }))] });
  }
  if (action.type === 'ritual-accelerate') {
    if (state.ritualPhase !== 'accelerate' || seat !== state.ritualChooser) throw new Error('Não é sua vez de usar Magia Acelerada.');
    const card = CARD_BY_ID[action.cardId];
    if (!card || card.kind === 'arcana' || !state.hands[seat]!.includes(action.cardId)) throw new Error('Escolha uma criatura sua, exceto Arcana.');
    const hands = state.hands.map(hand => [...hand]);
    hands[seat] = hands[seat]!.filter(id => id !== action.cardId);
    const next: GameState = { ...state, hands, discard: [...state.discard, action.cardId],
      skipNextTrickSeats: [...new Set([...state.skipNextTrickSeats, seat])],
      lastCreatureReveal: { reason: 'accelerated', round: state.round, seat, cardId: action.cardId },
      pendingAbility: { seat, source: 'ritual', stage: 'offer', cardId: action.cardId, endRound: null } };
    return abilityAvailableFor(next, action.cardId) && !abilityBlocked(next, seat)
      ? activateAbility(next) : completeRitualPhase({ ...next, pendingAbility: null });
  }
  if (action.type === 'ritual-champion') {
    if (state.ritualPhase !== 'champions' || seat !== state.ritualChooser)
      throw new Error('Não é sua vez de escolher os Campeões Ocultos.');
    const target = championTargetSeat(state);
    if (target === null || !Number.isInteger(action.index) || action.index < 0 || action.index >= state.hands[target]!.length)
      throw new Error('Escolha uma posição da mão pelo verso.');
    const ritualChampionCards = [...state.ritualChampionCards];
    ritualChampionCards[target] = state.hands[target]![action.index]!;
    if (ritualChampionCards.some(id => id === null)) return { ...state, ritualChampionCards };
    const discard = [...state.discard];
    const hands = state.hands.map((hand, playerSeat) => {
      discard.push(...hand.filter(id => id !== ritualChampionCards[playerSeat]));
      return [ritualChampionCards[playerSeat]!];
    });
    return completeRitualPhase({ ...state, hands, discard, ritualChampionCards });
  }
  if (action.type === 'ritual-seal') {
    if (state.ritualPhase !== 'seal' || seat !== ritualDecisionSeat(state))
      throw new Error('Não é sua vez de separar uma criatura.');
    if (!Number.isInteger(action.index) || action.index < 0 || action.index >= state.hands[seat]!.length)
      throw new Error('Escolha uma das cartas pelo verso.');
    const hands = state.hands.map(hand => [...hand]);
    const [cardId] = hands[seat]!.splice(action.index, 1);
    const sealedCardIds = [...state.sealedCardIds];
    sealedCardIds[seat] = cardId!;
    const ritualTeamDecisions = [...state.ritualTeamDecisions, seat];
    const next = { ...state, hands, sealedCardIds, ritualTeamDecisions };
    return ritualTeamDecisions.length === state.playerIds.length ? completeRitualPhase(next) : next;
  }
  if (action.type === 'ritual-mirror') {
    if (state.ritualPhase !== 'mirror' || seat !== ritualDecisionSeat(state)) throw new Error('Não é sua vez de decidir o Espelho.');
    const target = action.targetSeat;
    if (target !== undefined && (!Number.isInteger(target) || target < 0 || target >= state.playerIds.length || teamOf(target) === teamOf(seat))) {
      throw new Error('Escolha um adversário ou passe a troca.');
    }
    if (target !== undefined && state.ritualMirrorTargets.includes(target)) throw new Error('Este adversário já foi escolhido no Espelho.');
    const hands = state.hands.map(hand => [...hand]) as GameState['hands'];
    if (target !== undefined) [hands[seat], hands[target]] = [hands[target]!, hands[seat]!];
    const ritualTeamDecisions = [...state.ritualTeamDecisions, seat];
    const next = { ...state, hands, ritualTeamDecisions,
      ritualMirrorTargets: target === undefined ? state.ritualMirrorTargets : [...state.ritualMirrorTargets, target] };
    return ritualTeamDecisions.length === teamSeats(state, teamOf(seat)).length ? completeRitualPhase(next) : next;
  }
  if (action.type === 'ritual-fortune') {
    if (state.ritualPhase !== 'fortune' || seat !== ritualDecisionSeat(state)) throw new Error('Não é sua vez de decidir a Troca de Sortes.');
    const exchanging = action.cardId !== undefined || action.targetSeat !== undefined || action.targetIndex !== undefined;
    if (exchanging && (!action.cardId || !state.hands[seat]!.includes(action.cardId)
      || !Number.isInteger(action.targetSeat) || action.targetSeat! < 0 || action.targetSeat! >= state.playerIds.length
      || teamOf(action.targetSeat!) === teamOf(seat) || !Number.isInteger(action.targetIndex)
      || action.targetIndex! < 0 || action.targetIndex! >= state.hands[action.targetSeat!]!.length))
      throw new Error('Escolha uma criatura sua e uma posição oculta da mão adversária.');
    let next: GameState = state;
    if (exchanging) {
      const target = action.targetSeat!;
      const hands = state.hands.map(hand => [...hand]);
      const receivedIndex = action.targetIndex!;
      const receivedId = hands[target]![receivedIndex]!;
      hands[seat]![hands[seat]!.indexOf(action.cardId!)] = receivedId;
      hands[target]![receivedIndex] = action.cardId!;
      next = { ...state, hands };
    }
    const ritualTeamDecisions = [...state.ritualTeamDecisions, seat];
    next = { ...next, ritualTeamDecisions };
    return ritualTeamDecisions.length === teamSeats(state, teamOf(seat)).length ? completeRitualPhase(next) : next;
  }
  if (action.type === 'ritual-permutation') {
    if (state.ritualPhase !== 'permutation' || seat !== ritualDecisionSeat(state))
      throw new Error('Não é sua vez de escolher a carta da Permuta Profana.');
    if (!state.hands[seat]!.includes(action.cardId)) throw new Error('Escolha uma criatura da sua mão para passar à direita.');
    const ritualPermutationCards = [...state.ritualPermutationCards];
    ritualPermutationCards[seat] = action.cardId;
    if (ritualPermutationCards.some(id => id === null)) return { ...state, ritualPermutationCards };
    const hands = state.hands.map((hand, playerSeat) => hand.filter(id => id !== ritualPermutationCards[playerSeat]));
    for (let playerSeat = 0; playerSeat < state.playerIds.length; playerSeat++)
      hands[(playerSeat + 1) % state.playerIds.length]!.push(ritualPermutationCards[playerSeat]!);
    return completeRitualPhase({ ...state, hands, ritualPermutationCards });
  }
  if (action.type === 'ritual-roll') {
    if (state.ritualPhase !== 'dice') throw new Error('Não é hora de lançar o dado.');
    const team = teamOf(seat);
    if (state.ritualDiceRolls[team] !== null) throw new Error('Sua equipe já lançou o dado.');
    const rng = nextRandom(state.rng);
    const ritualDiceRolls = [...state.ritualDiceRolls] as GameState['ritualDiceRolls'];
    ritualDiceRolls[team] = rng % 6 + 1;
    if (ritualDiceRolls[0] === null || ritualDiceRolls[1] === null)
      return { ...state, rng, ritualDiceRolls };
    const rolls = ritualDiceRolls as [number, number];
    const winner: Team | null = rolls[0] === rolls[1] ? null : rolls[0] > rolls[1] ? 0 : 1;
    const next = { ...state, rng, lastDiceResult: { round: state.round, rolls, winner } };
    return winner === null ? { ...next, ritualDiceRolls: [null, null] } : finishRound({ ...next, ritualDiceRolls }, winner, 'dice');
  }
  if (action.type === 'ritual-blood') {
    if (state.ritualPhase !== 'blood-vote' || seat !== ritualDecisionSeat(state)) throw new Error('Não é sua vez de decidir o Acordo.');
    const ritualTeamDecisions = [...state.ritualTeamDecisions, seat];
    const ritualBloodApprovals = action.play ? [...state.ritualBloodApprovals, seat] : state.ritualBloodApprovals;
    const next = { ...state, ritualTeamDecisions, ritualBloodApprovals };
    const teamSize = teamSeats(state, teamOf(seat)).length;
    const needed = Math.floor(teamSize / 2) + 1;
    if (ritualBloodApprovals.length >= needed) return completeRitualPhase({ ...next, roundBaseStake: 3, roundStake: 3 });
    if (ritualBloodApprovals.length + teamSize - ritualTeamDecisions.length < needed)
      return finishRound(next, (1 - teamOf(seat)) as Team, 'blood-withdrawal');
    return next;
  }
  if (action.type === 'ritual-destiny') {
    if (state.ritualPhase !== 'destiny-vote' || seat !== ritualDecisionSeat(state))
      throw new Error('Não é sua vez de decidir a Revelação do Destino.');
    if (!action.approve) return completeRitualPhase({ ...state, ritualTeamDecisions: [...state.ritualTeamDecisions, seat] });
    const ritualTeamDecisions = [...state.ritualTeamDecisions, seat];
    const ritualDestinyApprovals = [...state.ritualDestinyApprovals, seat];
    const next = { ...state, ritualTeamDecisions, ritualDestinyApprovals };
    const members = ritualTeamSeats(next);
    if (ritualDestinyApprovals.length < members.length) return next;
    const hands = next.hands.map(hand => [...hand]);
    const deck = [...next.deck];
    const discard = [...next.discard];
    for (const member of members) {
      discard.push(...hands[member]!);
      hands[member] = [];
      for (let i = 0; i < 3; i++) hands[member]!.push(deck.pop()!);
    }
    return completeRitualPhase({ ...next, hands, deck, discard });
  }
  if (action.type === 'ritual-ancient-discard') {
    if (state.ritualPhase !== 'ancient-discard' || seat !== ancientDiscardSeat(state)) throw new Error('Não é sua vez de descartar pela Anciã.');
    if (!state.hands[seat]!.includes(action.cardId)) throw new Error('Escolha uma criatura da sua mão.');
    const hands = state.hands.map(hand => [...hand]) as GameState['hands'];
    hands[seat] = hands[seat]!.filter(id => id !== action.cardId);
    const ancientDiscardsLeft = [...state.ancientDiscardsLeft] as GameState['ancientDiscardsLeft'];
    ancientDiscardsLeft[seat] = ancientDiscardsLeft[seat]! - 1;
    const next = { ...state, hands, ancientDiscardsLeft, discard: [...state.discard, action.cardId] };
    return ancientDiscardSeat(next) === null ? completeRitualPhase(next) : next;
  }
  if (action.type === 'ritual-discard') {
    const exchange = state.ritualExchange;
    if (!exchange || seat !== exchange.seat || !['blind-discard', 'revealed-discard'].includes(state.ritualPhase)) throw new Error('Não há descarte de criatura pendente.');
    const blind = state.ritualPhase === 'blind-discard';
    const index = Number(action.choice);
    const cardId = blind && Number.isInteger(index) && index >= 0 && index < exchange.newCardIds.length
      ? exchange.newCardIds[index]
      : !blind && exchange.newCardIds.includes(action.choice) ? action.choice : null;
    if (!cardId) throw new Error('Escolha uma das três criaturas novas para descartar.');
    const hands = state.hands.map(hand => [...hand]) as GameState['hands'];
    hands[seat] = hands[seat]!.filter(id => id !== cardId);
    const newCardIds = exchange.newCardIds.filter(id => id !== cardId);
    const discardsLeft = exchange.discardsLeft - 1;
    return { ...state, hands, discard: [...state.discard, cardId], ritualExchange: discardsLeft ? { ...exchange, newCardIds, discardsLeft } : null,
      ritualPhase: discardsLeft ? state.ritualPhase : blind ? 'blind' : 'revealed',
      lastCreatureReveal: blind ? { reason: 'blind-discard', source: 'puppeteer', round: state.round, seat, cardId } : state.lastCreatureReveal };
  }
  if (state.ritualMode && state.ritualPhase !== 'play') throw new Error('Escolha o Ritual antes de jogar criaturas.');
  const ritualKind: RitualKind | null = state.ritualActiveId ? ritualFromId(state.ritualActiveId).kind : null;
  if (action.type === 'ritual-mist') {
    if (ritualKind !== 'nevoa-de-sussurros' || seat !== state.ritualChooser || state.ritualMist || state.trick.length
      || state.pendingChallenge || !MOONS.includes(action.moon))
      throw new Error('Escolha uma Lua antes do início de uma vaza, uma vez na rodada.');
    return { ...state, ritualMist: { moon: action.moon, trickIndex: state.trickHistory.length } };
  }
  if (action.type === 'ritual-sum') {
    if (ritualKind !== 'todos-por-um' || seat !== state.ritualChooser || state.ritualSumTrickIndex !== null
      || state.pendingChallenge || (!action.activate && !state.ritualSumDecision))
      throw new Error('Todos por Um só pode ser decidido uma vez nesta rodada.');
    const next = { ...state, ritualSumTrickIndex: action.activate ? state.trickHistory.length : null,
      ritualSumDecision: false };
    return state.ritualSumDecision ? resolveCompletedTrick(next) : next;
  }
  if (state.ritualSumDecision) throw new Error('Aguarde a decisão de Todos por Um antes do resultado da vaza.');
  if (action.type === 'ritual-genjutso') {
    if (ritualKind !== 'genjutso' || seat !== state.ritualChooser || !state.ritualGenjutsuDecision)
      throw new Error('Aguarde o fim da vaza para usar Genjutso.');
    if (action.recoverCardId === undefined && action.discardCardId === undefined)
      return finalizeResolvedTrick({ ...state, ritualGenjutsuDecision: false });
    if (!action.recoverCardId || !genjutsuChoices(state).includes(action.recoverCardId))
      throw new Error('Escolha uma criatura que você jogou nesta rodada e que ainda está no descarte.');
    if (!action.discardCardId || !state.hands[seat]!.includes(action.discardCardId))
      throw new Error('Escolha uma criatura da sua mão para descartar.');
    const hands = state.hands.map(hand => [...hand]);
    hands[seat] = hands[seat]!.filter(id => id !== action.discardCardId).concat(action.recoverCardId);
    const discard = state.discard.filter(id => id !== action.recoverCardId).concat(action.discardCardId);
    return finalizeResolvedTrick({ ...state, hands, discard, ritualGenjutsuUsed: true, ritualGenjutsuDecision: false });
  }
  if (state.ritualGenjutsuDecision) throw new Error('Aguarde a decisão do Genjutso antes de encerrar a vaza.');
  if (action.type === 'ritual-weaken') {
    if (ritualKind !== 'enfraquecer' || seat !== state.ritualChooser || state.ritualWeakeningUsed || state.pendingChallenge)
      throw new Error('Não é hora de usar Enfraquecer.');
    if (action.targetSeat === undefined) {
      if (!state.ritualWeakeningDecision) throw new Error('Espere uma criatura adversária ser jogada.');
      return resolveCompletedTrick({ ...state, ritualWeakeningDecision: false });
    }
    if (!state.trick.some(play => play.seat === action.targetSeat && teamOf(play.seat) !== teamOf(seat)
      && CARD_BY_ID[play.cardId]!.kind !== 'arcana'))
      throw new Error('Escolha uma criatura adversária desta vaza, exceto Arcana.');
    const next = { ...state, ritualWeakenedSeat: action.targetSeat, ritualWeakeningUsed: true, ritualWeakeningDecision: false };
    return state.ritualWeakeningDecision ? resolveCompletedTrick(next) : next;
  }
  if (state.ritualWeakeningDecision) throw new Error('Aguarde a decisão de Enfraquecer antes de encerrar a vaza.');
  if (action.type === 'respond') {
    const pending = state.pendingChallenge;
    if (!pending || pending.responderSeat !== seat) throw new Error('Este jogador não pode responder ao Trick.');
    if (!action.accept) {
      const next = { ...state, pendingChallenge: null };
      const sealedSource = ritualKind === 'feitico-oculto' && next.trickHistory.length >= 2
        && next.sealedCardIds[pending.challengerSeat] !== null;
      if (abilityBlocked(next, pending.challengerSeat) || (!next.hands[pending.challengerSeat]!.length && !sealedSource)
        || (!sealedSource && !isBlindToCreatures(next, pending.challengerSeat) && !next.hands[pending.challengerSeat]!.some(id => abilityAvailableFor(next, id)))) {
        return finishRound(next, teamOf(pending.challengerSeat), 'declined');
      }
      return { ...next, pendingAbility: {
        seat: pending.challengerSeat, source: 'declined', stage: 'source', cardId: null,
        endRound: { team: teamOf(pending.challengerSeat), reason: 'declined' },
        repeatsLeft: ritualKind === 'magia-duplicada' ? 2 : 1,
      } };
    }
    return {
      ...state, roundStake: trickPoints(state.roundBaseStake, pending.level),
      acceptedTrickLevel: pending.level, lastRaiseTeam: teamOf(pending.challengerSeat),
      pendingChallenge: null,
    };
  }
  if (action.type === 'counter') {
    const pending = state.pendingChallenge;
    if (!pending || pending.responderSeat !== seat) throw new Error('Este jogador não pode aumentar o Trick.');
    if (ritualKind === 'silencio-da-bruxa' && teamOf(seat) !== teamOf(state.ritualChooser)) throw new Error('Silêncio da Bruxa impede sua equipe de pedir Trick.');
    if (pending.level >= MAX_TRICK_POINTS) throw new Error('A aposta já está no máximo.');
    return {
      ...state,
      roundStake: trickPoints(state.roundBaseStake, pending.level),
      acceptedTrickLevel: pending.level,
      lastRaiseTeam: teamOf(pending.challengerSeat),
      pendingChallenge: {
        level: (pending.level + 1) as TrickLevel,
        challengerSeat: seat,
        responderSeat: pending.challengerSeat,
      },
    };
  }
  if (state.pendingChallenge) throw new Error('Aguarde a resposta ao Trick.');
  if (action.type === 'mind-ready') {
    if (seat !== state.turn || !isMindControlled(state, seat)) throw new Error('Não é sua vez de entregar a jogada.');
    return { ...state, mindControlReady: true };
  }
  if (action.type === 'raise') {
    if (ritualKind === 'ritual-oculto'
      ? state.trick.some(play => play.seat === seat) || !canPlaySeat(state, seat)
      : seat !== state.turn) throw new Error('Não é a vez desse jogador.');
    if (state.mindControlReady) throw new Error('A jogada já foi entregue ao controlador.');
    if (ritualKind === 'silencio-da-bruxa' && teamOf(seat) !== teamOf(state.ritualChooser)) throw new Error('Silêncio da Bruxa impede sua equipe de pedir Trick.');
    if (state.acceptedTrickLevel >= MAX_TRICK_POINTS) throw new Error('A aposta já está no máximo.');
    if (state.lastRaiseTeam === teamOf(seat)) throw new Error('Só a equipe adversária pode aumentar a aposta.');
    return {
      ...state,
      pendingChallenge: {
        level: (state.acceptedTrickLevel === 0 ? 2 : state.acceptedTrickLevel + 1) as TrickLevel,
        challengerSeat: seat,
        responderSeat: state.ritualDuelSeats
          ? state.ritualDuelSeats.find(duelist => duelist !== seat)!
          : (seat + 1) % state.playerIds.length,
      },
    };
  }
  const playingSeat = ritualKind === 'ritual-oculto' ? seat : state.turn;
  if (state.ritualDuelSeats && !state.ritualDuelSeats.includes(playingSeat)) throw new Error('Apenas os duelistas jogam nesta rodada.');
  if (state.trick.some(play => play.seat === playingSeat) || !canPlaySeat(state, playingSeat)) throw new Error('Este jogador já confirmou a carta desta vaza.');
  const mindControlled = isMindControlled(state, playingSeat);
  if (seat !== (mindControlled ? mindControllerSeat(state, playingSeat) : playingSeat)) throw new Error('Não é sua vez de escolher a criatura.');
  if (mindControlled && !state.mindControlReady) throw new Error('Aguarde o jogador entregar a jogada.');
  if (mindControlled && action.cardId !== 'random') throw new Error('Controle Mental: jogue uma criatura sorteada.');
  const rng = mindControlled ? nextRandom(state.rng) : state.rng;
  const blindPlay = isBlindToCreatures(state, playingSeat);
  const sealedPlay = ritualKind === 'feitico-oculto' && state.trickHistory.length >= 2;
  const blindIndex = Number(action.cardId);
  const cardId = sealedPlay && action.cardId === 'sealed' ? state.sealedCardIds[playingSeat]
    : sealedPlay ? null
    : mindControlled && state.hands[playingSeat]!.length
    ? state.hands[playingSeat]![rng % state.hands[playingSeat]!.length]
    : blindPlay && Number.isInteger(blindIndex) && blindIndex >= 0 && blindIndex < state.hands[playingSeat]!.length
    ? state.hands[playingSeat]![blindIndex]! : !blindPlay && state.hands[playingSeat]!.includes(action.cardId) ? action.cardId : null;
  if (!cardId) throw new Error(sealedPlay ? 'Jogue a carta separada pelo verso na terceira vaza.' : blindPlay ? 'Escolha uma carta pelo verso.' : 'Esta carta não está na sua mão.');
  if (state.skipNextTrickSeats.includes(playingSeat)) throw new Error('Este jogador deve passar esta vaza.');
  const hands = state.hands.map((hand, i) => i === playingSeat ? hand.filter(id => id !== cardId) : [...hand]) as GameState['hands'];
  const sealedCardIds = [...state.sealedCardIds];
  if (sealedPlay) sealedCardIds[playingSeat] = null;
  const trick = [...state.trick, { seat: playingSeat, cardId }];
  const postRemoval = { ...state, hands, sealedCardIds };
  const nextSeat = state.playerIds.slice(1).map((_, index) => (playingSeat + index + 1) % state.playerIds.length)
    .find(candidate => !trick.some(play => play.seat === candidate) && canPlaySeat(postRemoval, candidate));
  const arcanaPlayedTeams = CARD_BY_ID[cardId]!.kind === 'arcana'
    ? [...state.arcanaPlayedTeams, teamOf(playingSeat)] : state.arcanaPlayedTeams;
  if (nextSeat !== undefined) return { ...state, hands, sealedCardIds, trick, arcanaPlayedTeams, turn: nextSeat, rng, mindControlReady: false };

  const afterPlay: GameState = { ...state, hands, sealedCardIds, trick, arcanaPlayedTeams, rng, mindControlReady: false };
  if (ritualKind === 'todos-por-um' && afterPlay.ritualSumTrickIndex === null)
    return { ...afterPlay, ritualSumDecision: true };
  if (ritualKind === 'enfraquecer' && !afterPlay.ritualWeakeningUsed
    && trick.some(play => teamOf(play.seat) !== teamOf(state.ritualChooser) && CARD_BY_ID[play.cardId]!.kind !== 'arcana'))
    return { ...afterPlay, ritualWeakeningDecision: true };
  return resolveCompletedTrick(afterPlay);
}
