import { CARDS, CREATURE_EFFECTS, type CreatureKind } from './cards.js';
import { createGame, reduce, type GameState } from './engine.js';
import { RITUAL_TEST_DECK, type RitualKind } from './rituals.js';

/** Start a solo test with a chosen playable Ritual in the first player's hand. */
export function createRitualScenario(playerIds: GameState['playerIds'], kind: RitualKind, targetScore: 15 | 25 = 15): GameState {
  const chosenId = `${kind}#1`;
  if (!RITUAL_TEST_DECK.includes(chosenId)) throw new Error('Este Ritual ainda não está no baralho de teste.');
  const state = createGame(playerIds, 123, true, targetScore);
  const ritualHands = state.ritualHands.map(hand => [...hand]) as GameState['ritualHands'];
  const ritualDeck = [...state.ritualDeck];
  if (!ritualHands[0]!.includes(chosenId)) {
    const replacedId = ritualHands[0]![0]!;
    const owner = ritualHands.findIndex(hand => hand.includes(chosenId));
    if (owner >= 0) ritualHands[owner]![ritualHands[owner]!.indexOf(chosenId)] = replacedId;
    else ritualDeck[ritualDeck.indexOf(chosenId)] = replacedId;
    ritualHands[0]![0] = chosenId;
  }
  return { ...state, ritualHands, ritualDeck, roundStarter: 0, turn: 0, ritualChooser: 0 };
}

/** A deterministic teaching scenario available only from the server's solo test mode. */
export function createAbilityScenario(playerIds: GameState['playerIds'], kind: CreatureKind, mode: 'trick' | 'declined', targetScore: 15 | 25 = 15): GameState {
  if (playerIds.length !== 4) throw new Error('Este cenário de habilidade requer quatro jogadores.');
  if (!CREATURE_EFFECTS[kind]?.available) throw new Error('Esta habilidade ainda não está disponível.');
  const puppetDeclined = kind === 'puppeteer' && mode === 'declined';
  const firstCards = puppetDeclined
    ? ['puppeteer-full', 'arcana-full', 'wizard-full', 'fairy-new']
    : [`${kind}-full`, 'raven-waxing', 'raven-waning', 'raven-new'];
  if (new Set(firstCards).size !== 4) throw new Error('Cenário inválido.');
  const remaining = CARDS.map(card => card.id).filter(id => !firstCards.includes(id));
  const hands: GameState['hands'] = [[], [], [], []];
  for (let seat = 0; seat < 4; seat++) hands[seat]!.push(firstCards[seat]!);
  for (let i = 0; i < 8; i++) hands[i % 4]!.push(remaining.shift()!);
  const ritualMode = true;
  let state: GameState = {
    ...createGame(playerIds, 123, ritualMode, targetScore), hands, deck: remaining, discard: [], trick: [],
    trickWins: [0, 0], trickWinners: [], roundStarter: puppetDeclined ? 1 : 0, turn: puppetDeclined ? 1 : 0,
    scores: [0, 3], pendingChallenge: null, pendingAbility: null,
    ritualPhase: ritualMode ? 'play' : 'off', ritualChooser: 0,
  };
  if (mode === 'declined') {
    if (puppetDeclined) {
      for (const seat of [1, 2, 3]) state = reduce(state, { type: 'play', playerId: playerIds[seat]!, cardId: firstCards[seat]! });
    }
    state = reduce(state, { type: 'raise', playerId: playerIds[0]! });
    return reduce(state, { type: 'respond', playerId: playerIds[1]!, accept: false });
  }
  for (let seat = 0; seat < 4; seat++) state = reduce(state, { type: 'play', playerId: playerIds[seat]!, cardId: firstCards[seat]! });
  return state;
}
