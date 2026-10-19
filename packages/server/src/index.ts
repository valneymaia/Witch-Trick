import { createServer } from 'node:http';
import { randomBytes, randomInt } from 'node:crypto';
import { Server, type Socket } from 'socket.io';
import { CARD_BY_ID, createGame, reduce, viewFor, type GameState } from '../../engine/src/index.js';

type Reply = (result: { ok: true; code: string } | { ok: false; error: string }) => void;
interface Seat { playerId: string; name: string; bot: boolean }
interface Room {
  code: string;
  seats: (Seat | null)[];
  ownerId: string;
  testMode: boolean;
  game: GameState | null;
  botTimer: ReturnType<typeof setTimeout> | null;
}
const rooms = new Map<string, Room>();
const httpServer = createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ service: 'Witch Trick', rooms: rooms.size }));
});
const io = new Server(httpServer, { cors: { origin: true } });
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function roomCode(): string {
  let code = '';
  do {
    code = Array.from(randomBytes(5), byte => alphabet[byte % alphabet.length]).join('');
  } while (rooms.has(code));
  return code;
}
function fail(reply: Reply, error: string) { reply({ ok: false, error }); }
function nameOf(value: unknown): string {
  return String(value || 'Jogador').trim().slice(0, 24) || 'Jogador';
}
function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(value);
}
function connected(room: Room, playerId: string): boolean {
  return [...io.sockets.sockets.values()].some(socket => socket.data.code === room.code && socket.data.playerId === playerId && socket.connected);
}
function emitRoom(room: Room) {
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.code !== room.code) continue;
    const playerId = socket.data.playerId as string;
    const seat = room.seats.findIndex(item => item?.playerId === playerId);
    if (seat < 0) continue;
    const seats = room.seats.map((item, index) => item && ({
      seat: index, name: item.name, bot: item.bot, online: room.testMode || item.bot || connected(room, item.playerId),
    }));
    const game = room.game ? viewFor(room.game, playerId) : null;
    const allHands = room.testMode && room.ownerId === playerId && room.game
      ? room.game.hands.map(hand => hand.map(id => CARD_BY_ID[id]!))
      : undefined;
    socket.emit('room:state', { code: room.code, seats, testMode: room.testMode, game, allHands });
  }
}
function startIfReady(room: Room) {
  if (room.game || room.seats.some(seat => !seat)) return;
  room.game = createGame(room.seats.map(seat => seat!.playerId) as [string, string, string, string], randomInt(1, 0x7fffffff));
}
function assign(socket: Socket, room: Room, playerId: string) {
  if (socket.data.code) socket.leave(socket.data.code);
  socket.data.code = room.code;
  socket.data.playerId = playerId;
  socket.join(room.code);
}
function botTurn(room: Room) {
  if (!room.game || room.game.winner !== null || room.botTimer) return;
  const seat = room.game.pendingChallenge?.responderSeat ?? room.game.turn;
  if (!room.seats[seat]?.bot) return;
  room.botTimer = setTimeout(() => {
    room.botTimer = null;
    if (!room.game || room.game.winner !== null) return;
    const actingSeat = room.game.pendingChallenge?.responderSeat ?? room.game.turn;
    if (actingSeat !== seat || !room.seats[seat]?.bot) { botTurn(room); return; }
    if (room.game.pendingChallenge) {
      room.game = reduce(room.game, { type: 'respond', playerId: room.seats[seat]!.playerId, accept: true });
    } else {
      const cardId = room.game.hands[seat]![randomInt(room.game.hands[seat]!.length)]!;
      room.game = reduce(room.game, { type: 'play', playerId: room.seats[seat]!.playerId, cardId });
    }
    emitRoom(room);
    botTurn(room);
  }, 550);
}

io.on('connection', socket => {
  socket.on('room:create', (request: { playerId?: unknown; name?: unknown; testMode?: boolean }, reply: Reply) => {
    if (!validId(request?.playerId)) return fail(reply, 'Identidade do jogador inválida.');
    const code = roomCode();
    const room: Room = { code, seats: [null, null, null, null], ownerId: request.playerId, testMode: !!request.testMode, game: null, botTimer: null };
    if (room.testMode) {
      room.seats = Array.from({ length: 4 }, (_, seat) => ({
        playerId: seat === 0 ? request.playerId as string : `${request.playerId}-seat-${seat}`,
        name: seat === 0 ? nameOf(request.name) : `Jogador ${seat + 1}`,
        bot: false,
      }));
      startIfReady(room);
    } else room.seats[0] = { playerId: request.playerId, name: nameOf(request.name), bot: false };
    rooms.set(code, room);
    assign(socket, room, request.playerId);
    reply({ ok: true, code });
    emitRoom(room);
  });
  socket.on('room:join', (request: { code?: unknown; playerId?: unknown; name?: unknown }, reply: Reply) => {
    if (!validId(request?.playerId)) return fail(reply, 'Identidade do jogador inválida.');
    const code = String(request?.code ?? '').toUpperCase().trim();
    const room = rooms.get(code);
    if (!room) return fail(reply, 'Sala não encontrada. Confira o código.');
    let seat = room.seats.findIndex(item => item?.playerId === request.playerId);
    if (seat < 0) {
      if (room.game) return fail(reply, 'A partida já começou.');
      seat = room.seats.findIndex(item => !item);
      if (seat < 0) return fail(reply, 'A sala está cheia.');
      room.seats[seat] = { playerId: request.playerId, name: nameOf(request.name), bot: false };
    }
    assign(socket, room, request.playerId);
    startIfReady(room);
    reply({ ok: true, code });
    emitRoom(room);
    botTurn(room);
  });
  socket.on('room:fillBots', (reply: Reply) => {
    const room = rooms.get(socket.data.code);
    if (!room || socket.data.playerId !== room.ownerId || room.game) return fail(reply, 'Apenas o criador pode completar uma sala antes do início.');
    room.seats = room.seats.map((seat, index) => seat ?? {
      playerId: `bot-${room.code}-${index}`, name: `Bot ${index + 1}`, bot: true,
    });
    startIfReady(room);
    reply({ ok: true, code: room.code });
    emitRoom(room);
    botTurn(room);
  });
  socket.on('room:play', (request: { cardId?: unknown; seat?: unknown }, reply: Reply) => {
    const room = rooms.get(socket.data.code);
    if (!room?.game) return fail(reply, 'A partida ainda não começou.');
    const ownerControls = room.testMode && socket.data.playerId === room.ownerId;
    const seat = ownerControls ? Number(request?.seat) : room.seats.findIndex(item => item?.playerId === socket.data.playerId);
    if (!Number.isInteger(seat) || seat < 0 || seat > 3 || typeof request?.cardId !== 'string') return fail(reply, 'Jogada inválida.');
    try {
      room.game = reduce(room.game, { type: 'play', playerId: room.seats[seat]!.playerId, cardId: request.cardId });
      reply({ ok: true, code: room.code });
      emitRoom(room);
      botTurn(room);
    } catch (error) { fail(reply, error instanceof Error ? error.message : 'Jogada inválida.'); }
  });
  socket.on('room:raise', (request: { seat?: unknown }, reply: Reply) => {
    const room = rooms.get(socket.data.code);
    if (!room?.game) return fail(reply, 'A partida ainda não começou.');
    const ownerControls = room.testMode && socket.data.playerId === room.ownerId;
    const seat = ownerControls ? Number(request?.seat) : room.seats.findIndex(item => item?.playerId === socket.data.playerId);
    if (!Number.isInteger(seat) || seat < 0 || seat > 3) return fail(reply, 'Pedido inválido.');
    try {
      room.game = reduce(room.game, { type: 'raise', playerId: room.seats[seat]!.playerId });
      reply({ ok: true, code: room.code });
      emitRoom(room);
      botTurn(room);
    } catch (error) { fail(reply, error instanceof Error ? error.message : 'Pedido inválido.'); }
  });
  socket.on('room:respond', (request: { accept?: unknown; seat?: unknown }, reply: Reply) => {
    const room = rooms.get(socket.data.code);
    if (!room?.game) return fail(reply, 'A partida ainda não começou.');
    const ownerControls = room.testMode && socket.data.playerId === room.ownerId;
    const seat = ownerControls ? Number(request?.seat) : room.seats.findIndex(item => item?.playerId === socket.data.playerId);
    if (!Number.isInteger(seat) || seat < 0 || seat > 3 || typeof request?.accept !== 'boolean') return fail(reply, 'Resposta inválida.');
    try {
      room.game = reduce(room.game, { type: 'respond', playerId: room.seats[seat]!.playerId, accept: request.accept });
      reply({ ok: true, code: room.code });
      emitRoom(room);
      botTurn(room);
    } catch (error) { fail(reply, error instanceof Error ? error.message : 'Resposta inválida.'); }
  });
  socket.on('room:counter', (request: { seat?: unknown }, reply: Reply) => {
    const room = rooms.get(socket.data.code);
    if (!room?.game) return fail(reply, 'A partida ainda não começou.');
    const ownerControls = room.testMode && socket.data.playerId === room.ownerId;
    const seat = ownerControls ? Number(request?.seat) : room.seats.findIndex(item => item?.playerId === socket.data.playerId);
    if (!Number.isInteger(seat) || seat < 0 || seat > 3) return fail(reply, 'Pedido inválido.');
    try {
      room.game = reduce(room.game, { type: 'counter', playerId: room.seats[seat]!.playerId });
      reply({ ok: true, code: room.code });
      emitRoom(room);
      botTurn(room);
    } catch (error) { fail(reply, error instanceof Error ? error.message : 'Pedido inválido.'); }
  });
  socket.on('room:leave', () => {
    const room = rooms.get(socket.data.code);
    const playerId = socket.data.playerId;
    socket.leave(socket.data.code);
    socket.data.code = undefined;
    socket.data.playerId = undefined;
    if (room && !room.game) {
      const seat = room.seats.findIndex(item => item?.playerId === playerId);
      if (seat >= 0) room.seats[seat] = null;
      if (room.ownerId === playerId) room.ownerId = room.seats.find(item => item && !item.bot)?.playerId ?? '';
      if (room.seats.every(item => !item)) rooms.delete(room.code);
      else emitRoom(room);
    }
  });
  socket.on('disconnect', () => {
    const room = rooms.get(socket.data.code);
    if (room) emitRoom(room);
  });
});

const port = Number(process.env.PORT || 3001);
httpServer.listen(port, '0.0.0.0', () => console.log(`Witch Trick: servidor na porta ${port}`));
