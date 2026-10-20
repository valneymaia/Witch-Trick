import { CARD_BY_ID, CARDS, CREATURES, CREATURE_EFFECTS, compareCards, type CreatureKind } from './cards.js';
import { RITUAL_TEST_DECK, ritualFromId, type RitualKind } from './rituals.js';

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
  bonusPoints?: number;
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
export type AbilityStage = 'source' | 'offer' | 'puppet-card' | 'puppet-exchange' | 'fairy-target' | 'fairy-card' | 'goblin-own' | 'goblin-target' | 'griffin-discard' | 'wizard-own' | 'wizard-target' | 'witch-discard';
export interface PendingAbility {
  seat: number;
  source: 'declined' | 'trick';
  stage: AbilityStage;
  cardId: string | null;
  endRound: { team: Team; reason: RoundResult['reason'] } | null;
  targetSeat?: number;
  ownCardId?: string;
  candidates?: string[];
}
export interface GameState {
  playerIds: [string, string, string, string];
  hands: [string[], string[], string[], string[]];
  deck: string[];
  discard: string[];
  trick: PlayedCard[];
  trickWins: [number, number];
  trickWinners: Team[];
  skipNextTrickSeats: number[];
  scores: [number, number];
  roundBaseStake: number;
  roundStake: number;
  acceptedTrickLevel: 0 | TrickLevel;
  lastRaiseTeam: Team | null;
  pendingChallenge: PendingChallenge | null;
  pendingAbility: PendingAbility | null;
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
  ritualHands: [string[], string[], string[], string[]];
  ritualDeck: string[];
  ritualDiscard: string[];
  ritualPhase: 'off' | 'blind' | 'revealed' | 'blind-discard' | 'revealed-discard' | 'play';
  ritualChooser: number;
  ritualActiveId: string | null;
  ritualPrediction: '2-0' | '2-1' | null;
  ritualEmpoweredKind: CreatureKind | null;
  ritualExchange: { seat: number; newCardIds: string[] } | null;
  deferredAbility: PendingAbility | null;
}
export type GameAction =
  | { type: 'play'; playerId: string; cardId: string }
  | { type: 'raise'; playerId: string }
  | { type: 'counter'; playerId: string }
  | { type: 'respond'; playerId: string; accept: boolean }
  | { type: 'ability'; playerId: string; choice: string }
  | { type: 'ritual-reveal'; playerId: string }
  | { type: 'ritual-play'; playerId: string; ritualId: string; prediction?: '2-0' | '2-1'; creatureKind?: CreatureKind }
  | { type: 'ritual-discard'; playerId: string; choice: string };
export const TARGET_SCORE = 15;
export const ROUND_POINTS = 1;
export const MAX_TRICK_POINTS = 4;
export const teamOf = (seat: number): Team => (seat % 2) as Team;
export function trickPoints(baseStake: number, level: TrickLevel): number {
  return baseStake === ROUND_POINTS ? level : baseStake + level;
}
export function abilityAvailableFor(state: GameState, cardId: string): boolean {
  const kind = CARD_BY_ID[cardId]!.kind;
  return CREATURE_EFFECTS[kind].available && (state.ritualMode || (kind !== 'wizard' && kind !== 'witch'));
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
function shuffled(seed: number, reservedCardId?: string): { cards: string[]; seed: number } {
  return shuffleIds(CARDS.map(card => card.id).filter(id => id !== reservedCardId), seed);
}
function deal(state: GameState, reserved?: { seat: number; cardId: string }): GameState {
  const { cards, seed } = shuffled(state.rng, reserved?.cardId);
  const hands: GameState['hands'] = [[], [], [], []];
  for (let i = 0; i < 12; i++) hands[i % 4]!.push(cards.pop()!);
  if (reserved) hands[reserved.seat]!.push(reserved.cardId);
  return {
    ...state, hands, deck: cards, discard: [], trick: [], trickWins: [0, 0],
    trickWinners: [], skipNextTrickSeats: [], roundBaseStake: ROUND_POINTS,
    roundStake: ROUND_POINTS, acceptedTrickLevel: 0, lastRaiseTeam: null,
    pendingChallenge: null, pendingAbility: null, turn: state.roundStarter, rng: seed, activeEffects: [],
    ritualPhase: state.ritualMode ? 'blind' : 'off', ritualChooser: state.roundStarter,
    ritualActiveId: null, ritualPrediction: null, ritualEmpoweredKind: null, ritualExchange: null,
    deferredAbility: null,
  };
}
export function createGame(playerIds: [string, string, string, string], seed: number, ritualMode = false): GameState {
  if (new Set(playerIds).size !== 4 || playerIds.some(id => !id)) throw new Error('Quatro jogadores distintos são necessários.');
  const rng = nextRandom(seed || 0x9e3779b9);
  const state: GameState = {
    playerIds: [...playerIds], hands: [[], [], [], []], deck: [], discard: [], trick: [],
    trickWins: [0, 0], trickWinners: [], skipNextTrickSeats: [], scores: [0, 0],
    roundBaseStake: ROUND_POINTS, roundStake: ROUND_POINTS, acceptedTrickLevel: 0,
    lastRaiseTeam: null, pendingChallenge: null, pendingAbility: null, lastRound: null,
    round: 1, roundStarter: rng % 4,
    turn: rng % 4, lastTrickWinner: null, lastRoundWinner: null, winner: null,
    rng, activeEffects: [],
    ritualMode, ritualHands: [[], [], [], []], ritualDeck: [], ritualDiscard: [],
    ritualPhase: ritualMode ? 'blind' : 'off', ritualChooser: rng % 4,
    ritualActiveId: null, ritualPrediction: null, ritualEmpoweredKind: null, ritualExchange: null,
    deferredAbility: null,
  };
  if (ritualMode) {
    const ritualCards = shuffleIds(RITUAL_TEST_DECK, rng);
    state.rng = ritualCards.seed;
    state.ritualDeck = ritualCards.cards;
    for (let i = 0; i < 12; i++) state.ritualHands[i % 4]!.push(state.ritualDeck.pop()!);
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
function finishRound(state: GameState, team: Team, reason: RoundResult['reason'], reserved?: { seat: number; cardId: string }): GameState {
  const scores = [...state.scores] as GameState['scores'];
  scores[team] = Math.min(TARGET_SCORE, scores[team] + state.roundStake);
  let bonusPoints = 0;
  if (state.ritualActiveId && ritualFromId(state.ritualActiveId).kind === 'mapa-do-destino'
    && team === teamOf(state.ritualChooser) && reason === 'tricks'
    && state.ritualPrediction === (state.trickWins[1 - team] === 0 ? '2-0' : '2-1')) {
    scores[team] = Math.min(TARGET_SCORE, scores[team] + 1);
    bonusPoints = 1;
  }
  const result: RoundResult = {
    winner: team, points: state.roundStake + bonusPoints, ...(bonusPoints ? { bonusPoints } : {}), reason,
    trickWinners: [...state.trickWinners],
  };
  let completed: GameState = {
    ...state, scores, lastRoundWinner: team, lastRound: result, pendingChallenge: null, pendingAbility: null,
    ritualDiscard: state.ritualActiveId ? [...state.ritualDiscard, state.ritualActiveId] : state.ritualDiscard,
    ritualActiveId: null, ritualEmpoweredKind: null,
  };
  completed = refillRitualHand(completed, state.ritualChooser);
  if (scores[team] >= TARGET_SCORE) return { ...completed, winner: team, ritualPhase: 'off' };
  return deal({ ...completed, round: state.round + 1, roundStarter: (state.roundStarter + 1) % 4 }, reserved);
}
function abilityBlocked(state: GameState, seat: number): boolean {
  return (state.ritualActiveId !== null && ritualFromId(state.ritualActiveId).kind === 'magia-nula')
    || state.activeEffects.some(effect => effect.key === 'wolf' && teamOf(effect.ownerSeat) !== teamOf(seat));
}
export function puppeteerChoices(state: GameState): string[] {
  return [...state.discard, ...state.trick.map(play => play.cardId)]
    .filter(id => CARD_BY_ID[id]!.kind !== 'puppeteer');
}
function closeAbility(state: GameState): GameState {
  const pending = state.pendingAbility!;
  const clear = { ...state, pendingAbility: null };
  return pending.endRound ? finishRound(clear, pending.endRound.team, pending.endRound.reason) : clear;
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
    scores[team] = Math.min(TARGET_SCORE, scores[team] + 1);
    const next = closeAbility({ ...state, scores });
    return scores[team] >= TARGET_SCORE ? { ...next, winner: team } : next;
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
      ? { ...state, pendingAbility: { ...pending, stage: 'wizard-own' } } : closeAbility(state);
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
  if (next.ritualMode) return { ...next, deferredAbility: { ...pending, endRound: null } };
  return activateAbility({ ...next, pendingAbility: { ...pending, endRound: null } });
}
function completeRitualPhase(state: GameState): GameState {
  const next = { ...state, ritualPhase: 'play' as const, deferredAbility: null };
  if (!state.deferredAbility || abilityBlocked(next, state.deferredAbility.seat)) return next;
  return activateAbility({ ...next, pendingAbility: state.deferredAbility });
}
function chooseAbility(state: GameState, seat: number, choice: string): GameState {
  const pending = state.pendingAbility;
  if (!pending || pending.seat !== seat) throw new Error('Este jogador não pode decidir a habilidade.');
  if (pending.stage === 'source') {
    if (choice === 'skip') return closeAbility(state);
    if (!state.hands[seat]!.includes(choice) || !abilityAvailableFor(state, choice)) throw new Error('Escolha uma carta válida da sua mão.');
    const hands = state.hands.map(hand => [...hand]) as GameState['hands'];
    hands[seat] = hands[seat]!.filter(id => id !== choice);
    const next = { ...state, hands, discard: [...state.discard, choice], pendingAbility: { ...pending, cardId: choice, stage: 'offer' as const } };
    return CARD_BY_ID[choice]!.kind === 'puppeteer' ? activateAbility(next) : activateInNextRound(next);
  }
  if (pending.stage === 'offer') {
    if (choice === 'skip') return closeAbility(state);
    if (choice !== 'use') throw new Error('Escolha usar ou pular a habilidade.');
    return CARD_BY_ID[pending.cardId!]!.kind === 'puppeteer' ? activateAbility(state) : activateInNextRound(state);
  }
  if (pending.stage === 'puppet-card') {
    if (choice === 'skip') return closeAbility(state);
    if (!puppeteerChoices(state).includes(choice)) throw new Error('Escolha uma carta já jogada nesta rodada.');
    if (pending.endRound) {
      const next = finishRound(state, pending.endRound.team, pending.endRound.reason, { seat, cardId: choice });
      if (next.winner !== null) return next;
      if (next.ritualMode) return { ...next, ritualExchange: { seat, newCardIds: next.hands[seat]!.filter(id => id !== choice) } };
      return { ...next, pendingAbility: { ...pending, stage: 'puppet-exchange', endRound: null, ownCardId: choice } };
    }
    const hands = state.hands.map(hand => [...hand]) as GameState['hands'];
    hands[seat]!.push(choice);
    return { ...state, hands, discard: state.discard.filter(id => id !== choice), pendingAbility: { ...pending, stage: 'puppet-exchange', ownCardId: choice } };
  }
  if (pending.stage === 'puppet-exchange') {
    if (!state.hands[seat]!.includes(choice) || choice === pending.ownCardId) throw new Error('Troque por outra carta da sua mão.');
    const hands = state.hands.map(hand => [...hand]) as GameState['hands'];
    hands[seat] = hands[seat]!.filter(id => id !== choice);
    return closeAbility({ ...state, hands, discard: [...state.discard, choice] });
  }
  if (pending.stage === 'fairy-target') {
    if (choice === 'skip') return closeAbility(state);
    const targetSeat = Number(choice);
    if (!Number.isInteger(targetSeat) || targetSeat < 0 || targetSeat > 3 || teamOf(targetSeat) === teamOf(seat) || !state.hands[targetSeat]!.length) throw new Error('Escolha um adversário com cartas.');
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
    const turn = [0, 1, 2, 3].map(offset => (state.turn + offset) % 4)
      .find(candidate => !state.trick.some(play => play.seat === candidate)
        && !skipNextTrickSeats.includes(candidate) && hands[candidate]!.length) ?? state.turn;
    return closeAbility({ ...state, hands, discard: [...state.discard, choice], skipNextTrickSeats, turn });
  }
  if (pending.stage === 'goblin-own') {
    if (choice === 'skip') return closeAbility(state);
    if (!state.hands[seat]!.includes(choice)) throw new Error('Escolha uma carta sua.');
    return { ...state, pendingAbility: { ...pending, stage: 'goblin-target', ownCardId: choice } };
  }
  if (pending.stage === 'goblin-target') {
    if (choice === 'skip') return closeAbility(state);
    const targetSeat = Number(choice);
    if (!Number.isInteger(targetSeat) || targetSeat < 0 || targetSeat > 3 || teamOf(targetSeat) === teamOf(seat) || !state.hands[targetSeat]!.length) throw new Error('Escolha um adversário com cartas.');
    const rng = nextRandom(state.rng);
    const received = state.hands[targetSeat]![rng % state.hands[targetSeat]!.length]!;
    const hands = state.hands.map(hand => [...hand]) as GameState['hands'];
    hands[seat] = hands[seat]!.filter(id => id !== pending.ownCardId);
    hands[targetSeat] = hands[targetSeat]!.filter(id => id !== received);
    hands[seat]!.push(received);
    hands[targetSeat]!.push(pending.ownCardId!);
    const scores = [...state.scores] as GameState['scores'];
    if (CARD_BY_ID[received]!.value < 5) scores[teamOf(seat)] = Math.min(TARGET_SCORE, scores[teamOf(seat)] + 1);
    const next = closeAbility({ ...state, rng, hands, scores });
    return scores[teamOf(seat)] >= TARGET_SCORE ? { ...next, winner: teamOf(seat) } : next;
  }
  if (pending.stage === 'griffin-discard') {
    if (!state.hands[seat]!.includes(choice)) throw new Error('Escolha uma carta para descartar.');
    const hands = state.hands.map(hand => [...hand]) as GameState['hands'];
    hands[seat] = hands[seat]!.filter(id => id !== choice);
    return closeAbility({ ...state, hands, discard: [...state.discard, choice] });
  }
  if (pending.stage === 'wizard-own') {
    if (choice === 'skip') return closeAbility(state);
    if (!state.ritualHands[seat]!.includes(choice)) throw new Error('Escolha um Ritual da sua mão.');
    return { ...state, pendingAbility: { ...pending, stage: 'wizard-target', ownCardId: choice } };
  }
  if (pending.stage === 'wizard-target') {
    if (choice === 'skip') return closeAbility(state);
    const target = Number(choice);
    if (!Number.isInteger(target) || target < 0 || target > 3 || teamOf(target) === teamOf(seat) || !state.ritualHands[target]!.length) throw new Error('Escolha um adversário com Rituais.');
    const rng = nextRandom(state.rng);
    const otherId = state.ritualHands[target]![rng % state.ritualHands[target]!.length]!;
    const ritualHands = state.ritualHands.map(hand => [...hand]) as GameState['ritualHands'];
    ritualHands[seat] = ritualHands[seat]!.filter(id => id !== pending.ownCardId);
    ritualHands[target] = ritualHands[target]!.filter(id => id !== otherId);
    ritualHands[seat]!.push(otherId);
    ritualHands[target]!.push(pending.ownCardId!);
    return closeAbility({ ...state, rng, ritualHands });
  }
  if (pending.stage === 'witch-discard') {
    if (!state.ritualHands[seat]!.includes(choice)) throw new Error('Escolha um Ritual da sua mão para descartar.');
    const ritualHands = state.ritualHands.map(hand => [...hand]) as GameState['ritualHands'];
    ritualHands[seat] = ritualHands[seat]!.filter(id => id !== choice);
    return closeAbility({ ...state, ritualHands, ritualDiscard: [...state.ritualDiscard, choice] });
  }
  throw new Error('Etapa de habilidade inválida.');
}
export function reduce(state: GameState, action: GameAction): GameState {
  if (state.winner !== null) throw new Error('A partida terminou.');
  const seat = state.playerIds.indexOf(action.playerId);
  if (seat < 0) throw new Error('Jogador não pertence à partida.');
  if (action.type === 'ability') return chooseAbility(state, seat, action.choice);
  if (state.pendingAbility) throw new Error('Aguarde a decisão da habilidade.');
  if (action.type === 'ritual-reveal') {
    if (!state.ritualMode || state.ritualPhase !== 'blind' || seat !== state.ritualChooser) throw new Error('Não é hora de revelar as criaturas.');
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
    const ritualHands = state.ritualHands.map(hand => [...hand]) as GameState['ritualHands'];
    ritualHands[seat] = ritualHands[seat]!.filter(id => id !== action.ritualId);
    const selected: GameState = refillRitualHand({
      ...state, ritualHands, ritualActiveId: action.ritualId,
      ritualPrediction: ritual.kind === 'mapa-do-destino' ? action.prediction! : null,
      ritualEmpoweredKind: ritual.kind === 'runa-da-vontade' ? action.creatureKind! : null,
      roundBaseStake: ritual.kind === 'doblete-sombrio' ? 2 : ritual.kind === 'trick-explosivo' ? 3 : state.roundBaseStake,
      roundStake: ritual.kind === 'doblete-sombrio' ? 2 : ritual.kind === 'trick-explosivo' ? 3 : state.roundStake,
      ritualPhase: state.ritualExchange ? (state.ritualPhase === 'blind' ? 'blind-discard' : 'revealed-discard') : 'play',
    }, seat);
    return selected.ritualExchange ? selected : completeRitualPhase(selected);
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
    return completeRitualPhase({ ...state, hands, discard: [...state.discard, cardId], ritualExchange: null });
  }
  if (state.ritualMode && state.ritualPhase !== 'play') throw new Error('Escolha o Ritual antes de jogar criaturas.');
  const ritualKind: RitualKind | null = state.ritualActiveId ? ritualFromId(state.ritualActiveId).kind : null;
  if (action.type === 'respond') {
    const pending = state.pendingChallenge;
    if (!pending || pending.responderSeat !== seat) throw new Error('Este jogador não pode responder ao Trick.');
    if (!action.accept) {
      const next = { ...state, pendingChallenge: null };
      if (abilityBlocked(next, pending.challengerSeat) || !next.hands[pending.challengerSeat]!.some(id => abilityAvailableFor(next, id))) {
        return finishRound(next, teamOf(pending.challengerSeat), 'declined');
      }
      return { ...next, pendingAbility: {
        seat: pending.challengerSeat, source: 'declined', stage: 'source', cardId: null,
        endRound: { team: teamOf(pending.challengerSeat), reason: 'declined' },
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
  if (seat !== state.turn) throw new Error('Não é a vez desse jogador.');
  if (action.type === 'raise') {
    if (ritualKind === 'silencio-da-bruxa' && teamOf(seat) !== teamOf(state.ritualChooser)) throw new Error('Silêncio da Bruxa impede sua equipe de pedir Trick.');
    if (state.acceptedTrickLevel >= MAX_TRICK_POINTS) throw new Error('A aposta já está no máximo.');
    if (state.lastRaiseTeam === teamOf(seat)) throw new Error('Só a equipe adversária pode aumentar a aposta.');
    return {
      ...state,
      pendingChallenge: {
        level: (state.acceptedTrickLevel === 0 ? 2 : state.acceptedTrickLevel + 1) as TrickLevel,
        challengerSeat: seat,
        responderSeat: (seat + 1) % 4,
      },
    };
  }
  if (!state.hands[seat]!.includes(action.cardId)) throw new Error('Esta carta não está na sua mão.');
  if (state.skipNextTrickSeats.includes(seat)) throw new Error('Este jogador deve passar esta vaza.');
  const hands = state.hands.map((hand, i) => i === seat ? hand.filter(id => id !== action.cardId) : [...hand]) as GameState['hands'];
  const trick = [...state.trick, { seat, cardId: action.cardId }];
  const nextSeat = [1, 2, 3].map(offset => (seat + offset) % 4)
    .find(candidate => !trick.some(play => play.seat === candidate)
      && !state.skipNextTrickSeats.includes(candidate) && hands[candidate]!.length);
  if (nextSeat !== undefined) return { ...state, hands, trick, turn: nextSeat };

  const winningPlay = trick.reduce((best, play) => {
    const playedCard = CARD_BY_ID[play.cardId]!;
    const bestCard = CARD_BY_ID[best.cardId]!;
    const empowered = state.ritualEmpoweredKind;
    const playedWins = empowered && (playedCard.kind === empowered) !== (bestCard.kind === empowered)
      ? playedCard.kind === empowered
      : compareCards(playedCard, bestCard) > 0;
    return playedWins ? play : best;
  });
  const team = teamOf(winningPlay.seat);
  const trickWins = [...state.trickWins] as GameState['trickWins'];
  trickWins[team]++;
  const discard = [...state.discard, ...trick.map(play => play.cardId)];
  const completed: GameState = {
    ...state, hands, trick: [], discard, trickWins, skipNextTrickSeats: [], turn: winningPlay.seat,
    lastTrickWinner: winningPlay.seat, trickWinners: [...state.trickWinners, team],
  };
  const roundEnds = trickWins[team] >= 2;
  const winningCard = CARD_BY_ID[winningPlay.cardId]!;
  if (!abilityAvailableFor(completed, winningCard.id) || abilityBlocked(completed, winningPlay.seat)) {
    return roundEnds ? finishRound(completed, team, 'tricks') : completed;
  }
  return { ...completed, pendingAbility: {
    seat: winningPlay.seat, source: 'trick', stage: 'offer', cardId: winningPlay.cardId,
    endRound: roundEnds ? { team, reason: 'tricks' } : null,
  } };
}
