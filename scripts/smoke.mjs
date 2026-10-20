import assert from 'node:assert/strict';
import { io } from 'socket.io-client';

const players = Array.from({ length: 4 }, (_, i) => `smoke-player-${i}`);
const clients = [];
const states = new Map();
function connect(player) {
  const socket = io(process.env.SMOKE_URL || 'http://localhost:3001', { transports: ['websocket'] });
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

  const initial = states.get(players[0]).game;
  assert.equal(initial.ritualPhase, 'blind');
  const chooser = initial.ritualChooser;
  for (const player of players) {
    const state = states.get(player);
    assert.equal(state.code, code);
    assert.equal(state.game.hand.length, 0);
    assert.equal(state.game.ritualHand.length, 3);
    assert.equal(state.game.players.length, 4);
    assert.equal(state.allHands, undefined);
    assert.equal(state.allRitualHands, undefined);
  }
  const chooserRituals = states.get(players[chooser]).game.ritualHand;
  for (const card of chooserRituals) {
    for (const other of players.filter((_, seat) => seat !== chooser)) {
      assert.ok(!states.get(other).game.ritualHand.some(hidden => hidden.id === card.id));
    }
  }
  await assert.rejects(emit(sockets[chooser], 'room:play', { cardId: 'arcana-full' }));
  const regular = chooserRituals.find(card => !card.blind);
  if (regular) {
    await emit(sockets[chooser], 'room:ritual', { type: 'reveal' });
    await pause();
    assert.equal(states.get(players[chooser]).game.hand.length, 3);
    await emit(sockets[chooser], 'room:ritual', { type: 'play', ritualId: regular.id, ...(regular.kind === 'runa-da-vontade' ? { creatureKind: 'raven' } : {}) });
  } else {
    const blind = chooserRituals[0];
    await emit(sockets[chooser], 'room:ritual', { type: 'play', ritualId: blind.id, prediction: '2-0', targetSeat: (chooser + 1) % 4 });
  }
  await pause();
  while (states.get(players[0]).game.ritualPhase === 'ancient-discard') {
    const actor = states.get(players[0]).game.ancientDiscardSeat;
    const cardId = states.get(players[actor]).game.hand[0].id;
    await emit(sockets[actor], 'room:ritual', { type: 'ancient-discard', cardId });
    await pause();
  }
  assert.equal(states.get(players[0]).game.ritualPhase, 'play');
  for (const player of players) {
    const view = states.get(player).game;
    assert.equal(view.hand.length, view.blindSeats.includes(view.seat) ? 0 : 3);
    for (const other of players.filter(other => other !== player)) {
      assert.ok(!view.hand.some(card => states.get(other).game.hand.some(hidden => hidden.id === card.id)));
    }
  }

  const turn = states.get(players[0]).game.turn;
  const responder = (turn + 1) % 4;
  await assert.rejects(emit(sockets[responder], 'room:raise', {}));
  await emit(sockets[turn], 'room:raise', {});
  await pause();
  assert.equal(states.get(players[0]).game.pendingChallenge.responderSeat, responder);
  assert.equal(states.get(players[0]).game.pendingChallenge.level, 2);
  await assert.rejects(emit(sockets[(turn + 2) % 4], 'room:respond', { accept: true }));
  await emit(sockets[responder], 'room:respond', { accept: true });
  await pause();
  const accepted = states.get(players[0]).game;
  assert.equal(accepted.roundStake, accepted.roundBaseStake === 1 ? 2 : accepted.roundBaseStake + 2);
  assert.equal(accepted.acceptedTrickLevel, 2);
  const turnView = states.get(players[turn]).game;
  const cardId = turnView.blindSeats.includes(turn) ? '0' : turnView.hand[0].id;
  await emit(sockets[turn], 'room:play', { cardId });
  await pause();
  assert.equal(states.get(players[0]).game.trick.length, 1);

  sockets[1].disconnect();
  const returned = await connect(players[1]);
  await emit(returned, 'room:join', { code, playerId: players[1], name: 'Teste 2' });
  await pause();
  assert.equal(states.get(players[1]).game.seat, 1);

  const soloId = 'smoke-solo';
  const solo = await connect(soloId);
  await emit(solo, 'room:create', { playerId: soloId, name: 'Teste solo', testMode: true });
  await emit(solo, 'room:testRitual', { kind: 'veu-da-incerteza' });
  await pause();
  const soloState = states.get(soloId);
  assert.equal(soloState.game.ritualChooser, 0);
  assert.ok(soloState.allRitualHands[0].some(card => card.kind === 'veu-da-incerteza'));
  await assert.rejects(emit(solo, 'room:testRitual', { kind: 'ritual-inexistente' }));
  console.log('Quatro jogadores, mãos privadas, Trick, reconexão e seletor de Ritual no teste solo: OK.');
} finally {
  for (const socket of clients) socket.disconnect();
}
