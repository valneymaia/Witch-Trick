import { CARDS, CREATURE_EFFECTS, type CreatureKind } from './cards.js';
import { createGame, reduce, type GameState } from './engine.js';

/** A deterministic teaching scenario available only from the server's solo test mode. */
export function createAbilityScenario(playerIds: GameState['playerIds'], kind: CreatureKind, mode: 'trick' | 'declined'): GameState {
  if (!CREATURE_EFFECTS[kind]?.available) throw new Error('Esta habilidade ainda não está disponível.');
  const firstCards = [`${kind}-full`, 'raven-waxing', 'raven-waning', 'raven-new'];
  if (new Set(firstCards).size !== 4) throw new Error('Cenário inválido.');
  const remaining = CARDS.map(card => card.id).filter(id => !firstCards.includes(id));
  const hands: GameState['hands'] = [[], [], [], []];
  for (let seat = 0; seat < 4; seat++) hands[seat]!.push(firstCards[seat]!);
  for (let i = 0; i < 8; i++) hands[i % 4]!.push(remaining.shift()!);
  let state: GameState = {
    ...createGame(playerIds, 123), hands, deck: remaining, discard: [], trick: [],
    trickWins: [0, 0], trickWinners: [], roundStarter: 0, turn: 0,
    scores: [0, 3], pendingChallenge: null, pendingAbility: null,
  };
  if (mode === 'declined') {
    state = reduce(state, { type: 'raise', playerId: playerIds[0] });
    return reduce(state, { type: 'respond', playerId: playerIds[1], accept: false });
  }
  for (let seat = 0; seat < 4; seat++) state = reduce(state, { type: 'play', playerId: playerIds[seat]!, cardId: firstCards[seat]! });
  return state;
}
