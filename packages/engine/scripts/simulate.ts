import { CARD_BY_ID, RITUAL_TEST_DECK, abilityOptionsFor, createGame, isBlindToCreatures, reduce, ritualDecisionSeat, ritualFromId, type GameState } from '../src/index.js';

const ids: [string, string, string, string] = ['bot-0', 'bot-1', 'bot-2', 'bot-3'];
const count = Number(process.argv.slice(2).find(arg => !arg.startsWith('--')) ?? 2000);
const ritualMode = process.argv.includes('--rituals');
if (!Number.isInteger(count) || count < 1) throw new Error('Informe uma quantidade positiva de partidas.');
for (let seed = 1; seed <= count; seed++) {
  let state = createGame(ids, seed, ritualMode);
  let moves = 0;
  while (state.winner === null) {
    check(state);
    if (state.pendingAbility) {
      const seat = state.pendingAbility.seat;
      const options = abilityOptionsFor(state, seat);
      const choice = state.pendingAbility.stage === 'offer' && moves % 3 === 0
        ? 'use' : options.find(option => option.value !== 'skip')?.value ?? options[0]?.value;
      if (!choice) throw new Error('Habilidade sem opção.');
      state = reduce(state, { type: 'ability', playerId: ids[seat]!, choice });
    } else if (state.ritualMode && state.ritualPhase !== 'play') {
      const seat = ritualDecisionSeat(state)!;
      if (state.ritualPhase === 'mode') {
        const blind = state.ritualHands[seat]!.some(id => ritualFromId(id).blind) && (moves % 2 === 0 || !state.ritualHands[seat]!.some(id => !ritualFromId(id).blind));
        state = reduce(state, { type: 'ritual-mode', playerId: ids[seat]!, blind });
      } else if (state.ritualPhase === 'blind') {
        const blind = state.ritualHands[seat]!.find(id => ritualFromId(id).blind);
        state = blind && (state.ritualModeLocked || moves % 2 === 0)
          ? reduce(state, { type: 'ritual-play', playerId: ids[seat]!, ritualId: blind, prediction: moves % 4 === 0 ? '2-0' : '2-1', targetSeat: (seat + 1) % 4 })
          : state.ritualHands[seat]!.some(id => !ritualFromId(id).blind)
            ? reduce(state, { type: 'ritual-reveal', playerId: ids[seat]! })
            : reduce(state, { type: 'ritual-play', playerId: ids[seat]!, ritualId: blind!, prediction: '2-0', targetSeat: (seat + 1) % 4 });
      } else if (state.ritualPhase === 'revealed') {
        const ritualId = state.ritualHands[seat]!.find(id => !ritualFromId(id).blind)!;
        state = reduce(state, { type: 'ritual-play', playerId: ids[seat]!, ritualId, creatureKind: CARD_BY_ID[state.hands[seat]![0]!]!.kind, targetSeat: (seat + 1) % 4 });
      } else if (state.ritualPhase === 'ancient-discard') {
        state = reduce(state, { type: 'ritual-ancient-discard', playerId: ids[seat]!, cardId: state.hands[seat]![0]! });
      } else if (state.ritualPhase === 'mirror') {
        const targetSeat = [0, 1, 2, 3].find(target => target % 2 !== seat % 2 && !state.ritualMirrorTargets.includes(target));
        state = reduce(state, { type: 'ritual-mirror', playerId: ids[seat]!, targetSeat: moves % 2 === 0 ? targetSeat : undefined });
      } else if (state.ritualPhase === 'blood-vote') {
        state = reduce(state, { type: 'ritual-blood', playerId: ids[seat]!, play: moves % 3 !== 0 });
      } else if (state.ritualPhase === 'blind-discard' || state.ritualPhase === 'revealed-discard') {
        const choice = state.ritualPhase === 'blind-discard' ? '0' : state.ritualExchange!.newCardIds[0]!;
        state = reduce(state, { type: 'ritual-discard', playerId: ids[seat]!, choice });
      }
    } else {
      const hand = state.hands[state.turn]!;
      const choice = (seed * 131 + moves * 17) % hand.length;
      state = reduce(state, { type: 'play', playerId: ids[state.turn]!, cardId: isBlindToCreatures(state, state.turn) ? String(choice) : hand[choice]! });
    }
    if (++moves > 1000) throw new Error(`Partida ${seed} não terminou.`);
  }
  check(state);
  if (state.scores[state.winner] !== 15) throw new Error(`Placar final inválido na partida ${seed}.`);
}
console.log(`${count} partidas ${ritualMode ? 'com Rituais' : 'de criaturas'} completas, sem violar invariantes.`);

function check(state: GameState) {
  const all = [...state.deck, ...state.hands.flat(), ...state.trick.map(play => play.cardId), ...state.discard];
  if (all.length !== 40 || new Set(all).size !== 40) throw new Error(`Baralho inválido na rodada ${state.round}.`);
  if (state.trick.length > 3 || state.trickWins.some(wins => wins > 2)) throw new Error('Vaza ou rodada inválida.');
  if (state.ritualMode) {
    const ritualIds = [...state.ritualDeck, ...state.ritualHands.flat(), ...state.ritualDiscard, ...(state.ritualActiveId ? [state.ritualActiveId] : [])];
    if (ritualIds.length !== RITUAL_TEST_DECK.length || new Set(ritualIds).size !== RITUAL_TEST_DECK.length) throw new Error(`Baralho de Rituais inválido na rodada ${state.round}: ${JSON.stringify({ deck: state.ritualDeck, hands: state.ritualHands, discard: state.ritualDiscard, active: state.ritualActiveId, phase: state.ritualPhase })}`);
  }
  if (state.winner === null && !state.pendingAbility && (!state.ritualMode || state.ritualPhase === 'play') && state.hands[state.turn]!.length === 0) throw new Error(`Jogador sem carta na vez: ${JSON.stringify({ round: state.round, turn: state.turn, hands: state.hands.map(hand => hand.length), trick: state.trick, ritual: state.ritualActiveId })}`);
}
