import { abilityOptionsFor, createGame, reduce, type GameState } from '../src/index.js';

const ids: [string, string, string, string] = ['bot-0', 'bot-1', 'bot-2', 'bot-3'];
const count = Number(process.argv[2] ?? 2000);
if (!Number.isInteger(count) || count < 1) throw new Error('Informe uma quantidade positiva de partidas.');
for (let seed = 1; seed <= count; seed++) {
  let state = createGame(ids, seed);
  let moves = 0;
  while (state.winner === null) {
    check(state);
    if (state.pendingAbility) {
      const seat = state.pendingAbility.seat;
      const options = abilityOptionsFor(state, seat);
      const choice = options.find(option => option.value === 'skip')?.value ?? options[0]?.value;
      if (!choice) throw new Error('Habilidade sem opção.');
      state = reduce(state, { type: 'ability', playerId: ids[seat]!, choice });
    } else {
      const hand = state.hands[state.turn]!;
      const choice = (seed * 131 + moves * 17) % hand.length;
      state = reduce(state, { type: 'play', playerId: ids[state.turn]!, cardId: hand[choice]! });
    }
    if (++moves > 1000) throw new Error(`Partida ${seed} não terminou.`);
  }
  check(state);
  if (state.scores[state.winner] !== 15) throw new Error(`Placar final inválido na partida ${seed}.`);
}
console.log(`${count} partidas completas, sem violar invariantes.`);

function check(state: GameState) {
  const all = [...state.deck, ...state.hands.flat(), ...state.trick.map(play => play.cardId), ...state.discard];
  if (all.length !== 40 || new Set(all).size !== 40) throw new Error(`Baralho inválido na rodada ${state.round}.`);
  if (state.trick.length > 3 || state.trickWins.some(wins => wins > 2)) throw new Error('Vaza ou rodada inválida.');
  if (state.winner === null && !state.pendingAbility && state.hands[state.turn]!.length === 0) throw new Error('Jogador sem carta na vez.');
}
