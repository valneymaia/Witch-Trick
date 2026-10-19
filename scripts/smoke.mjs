import assert from 'node:assert/strict';
import { io } from 'socket.io-client';

const players = Array.from({ length: 4 }, (_, i) => `smoke-player-${i}`);
const clients = [];
const states = new Map();
function connect(player) {
  const socket = io('http://localhost:3001', { transports: ['websocket'] });
  clients.push(socket);
  socket.on('room:state', state => states.set(player, state));
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}
function emit(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.emit(event, payload, reply => reply.ok ? resolve(reply) : reject(new Error(reply.error)));
  });
}
function pause() { return new Promise(resolve => setTimeout(resolve, 80)); }
try {
  const sockets = [];
  for (let i = 0; i < 4; i++) sockets.push(await connect(players[i]));
  const { code } = await emit(sockets[0], 'room:create', { playerId: players[0], name: 'Teste 1' });
  for (let i = 1; i < 4; i++) await emit(sockets[i], 'room:join', { code, playerId: players[i], name: `Teste ${i + 1}` });
  await pause();
  for (const player of players) {
    const state = states.get(player);
    assert.equal(state.code, code);
    assert.equal(state.game.hand.length, 3);
    assert.equal(state.game.players.length, 4);
    assert.equal(state.allHands, undefined);
  }
  const firstView = states.get(players[0]).game;
  for (const card of firstView.hand) {
    for (const other of players.slice(1)) assert.ok(!states.get(other).game.hand.some(hidden => hidden.id === card.id));
  }
  const turn = firstView.turn;
  const cardId = states.get(players[turn]).game.hand[0].id;
  await emit(sockets[turn], 'room:play', { cardId });
  await pause();
  assert.equal(states.get(players[0]).game.trick.length, 1);
  sockets[1].disconnect();
  const returned = await connect(players[1]);
  await emit(returned, 'room:join', { code, playerId: players[1], name: 'Teste 2' });
  await pause();
  assert.equal(states.get(players[1]).game.seat, 1);
  console.log('Sala, mãos privadas, jogada e reconexão: OK.');
} finally {
  for (const socket of clients) socket.disconnect();
}
