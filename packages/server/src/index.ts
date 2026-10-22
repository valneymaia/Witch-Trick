import { createServer } from 'node:http';
import { randomBytes, randomInt } from 'node:crypto';
import { Server, type Socket } from 'socket.io';
import { CARD_BY_ID, CREATURE_EFFECTS, abilityOptionsFor, createAbilityScenario, createGame, createRitualScenario, isBlindToCreatures, isMindControlled, mindControllerSeat, reduce, ritualDecisionSeat, ritualFromId, viewFor, type CreatureKind, type GameState, type Moon, type RitualKind } from '../../engine/src/index.js';

type Reply = (result: { ok: true; code: string } | { ok: false; error: string }) => void;
interface Seat { playerId: string; name: string; bot: boolean }
interface Room {
  code: string;
  seats: (Seat | null)[];
  targetScore: 15 | 25;
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
    if (game && room.testMode && room.ownerId === playerId && room.game?.pendingAbility) {
      game.abilityOptions = abilityOptionsFor(room.game, room.game.pendingAbility.seat);
    }
    if (game && room.testMode && room.ownerId === playerId && room.game?.ritualPeek) {
      game.ritualPeekCards = room.game.ritualPeek.cardIds.map(id => CARD_BY_ID[id]!);
    }
    const creaturesVisible = !room.game?.ritualMode || !['mode', 'blind', 'blind-discard', 'seal', 'champions'].includes(room.game.ritualPhase);
    const allHands = room.testMode && room.ownerId === playerId && room.game && creaturesVisible
      ? room.game.hands.map((hand, handSeat) => isBlindToCreatures(room.game!, handSeat) || (room.game!.ritualPhase === 'bond-rival' && handSeat === room.game!.ritualBondTargetSeat) ? [] : hand.map(id => CARD_BY_ID[id]!))
      : undefined;
    const allRitualHands = room.testMode && room.ownerId === playerId && room.game?.ritualMode
      ? room.game.ritualHands.map(hand => hand.map(ritualFromId)) : undefined;
    if (game && room.testMode && room.ownerId === playerId && room.game?.ritualExchange && ['blind-discard', 'revealed-discard'].includes(room.game.ritualPhase)) {
      const exchange = room.game.ritualExchange;
      game.ritualDiscardOptions = exchange.newCardIds.map((id, index) => room.game!.ritualPhase === 'blind-discard'
        ? { value: String(index) } : { value: id, card: CARD_BY_ID[id]! });
    }
    socket.emit('room:state', { code: room.code, seats, targetScore: room.targetScore, testMode: room.testMode, game, allHands, allRitualHands });
  }
}
function startIfReady(room: Room) {
  if (room.game || room.seats.some(seat => !seat)) return;
  room.game = createGame(room.seats.map(seat => seat!.playerId), randomInt(1, 0x7fffffff), true, room.targetScore);
}
function assign(socket: Socket, room: Room, playerId: string) {
  if (socket.data.code) socket.leave(socket.data.code);
  socket.data.code = room.code;
  socket.data.playerId = playerId;
  socket.join(room.code);
}
function botTurn(room: Room) {
  if (!room.game || room.game.winner !== null || room.botTimer) return;
  const hiddenBot = room.game.ritualActiveId && ritualFromId(room.game.ritualActiveId).kind === 'ritual-oculto'
    ? room.seats.findIndex((player, index) => player?.bot && !room.game!.trick.some(play => play.seat === index) && !room.game!.skipNextTrickSeats.includes(index) && room.game!.hands[index]!.length > 0)
    : -1;
  const seat = room.game.pendingAbility?.seat ?? room.game.pendingChallenge?.responderSeat ?? (room.game.ritualWeakeningDecision || room.game.ritualSumDecision || room.game.ritualGenjutsuDecision ? room.game.ritualChooser : null)
    ?? (room.game.ritualMode && !['off', 'play'].includes(room.game.ritualPhase) ? ritualDecisionSeat(room.game)!
      : isMindControlled(room.game, room.game.turn) && room.game.mindControlReady
        ? mindControllerSeat(room.game, room.game.turn) : hiddenBot >= 0 ? hiddenBot : room.game.turn);
  if (!room.seats[seat]?.bot) return;
  room.botTimer = setTimeout(() => {
    room.botTimer = null;
    if (!room.game || room.game.winner !== null) return;
    const hiddenActingBot = room.game.ritualActiveId && ritualFromId(room.game.ritualActiveId).kind === 'ritual-oculto'
      ? room.seats.findIndex((player, index) => player?.bot && !room.game!.trick.some(play => play.seat === index) && !room.game!.skipNextTrickSeats.includes(index) && room.game!.hands[index]!.length > 0)
      : -1;
    const actingSeat = room.game.pendingAbility?.seat ?? room.game.pendingChallenge?.responderSeat ?? (room.game.ritualWeakeningDecision || room.game.ritualSumDecision || room.game.ritualGenjutsuDecision ? room.game.ritualChooser : null)
      ?? (room.game.ritualMode && !['off', 'play'].includes(room.game.ritualPhase) ? ritualDecisionSeat(room.game)!
        : isMindControlled(room.game, room.game.turn) && room.game.mindControlReady
          ? mindControllerSeat(room.game, room.game.turn) : hiddenActingBot >= 0 ? hiddenActingBot : room.game.turn);
    if (actingSeat !== seat || !room.seats[seat]?.bot) { botTurn(room); return; }
    if (room.game.ritualGenjutsuDecision) {
      room.game = reduce(room.game, { type: 'ritual-genjutso', playerId: room.seats[seat]!.playerId });
    } else if (room.game.ritualSumDecision) {
      room.game = reduce(room.game, { type: 'ritual-sum', playerId: room.seats[seat]!.playerId, activate: true });
    } else if (room.game.ritualWeakeningDecision) {
      room.game = reduce(room.game, { type: 'ritual-weaken', playerId: room.seats[seat]!.playerId });
    } else if (room.game.pendingAbility) {
      const choices = abilityOptionsFor(room.game, seat);
      const choice = choices.find(option => option.value === 'skip')?.value ?? choices[0]?.value;
      if (!choice) return;
      room.game = reduce(room.game, { type: 'ability', playerId: room.seats[seat]!.playerId, choice });
    } else if (room.game.pendingChallenge) {
      room.game = reduce(room.game, { type: 'respond', playerId: room.seats[seat]!.playerId, accept: true });
    } else if (room.game.ritualMode && !['off', 'play'].includes(room.game.ritualPhase)) {
      const playerId = room.seats[seat]!.playerId;
      if (room.game.ritualPhase === 'mode') {
        const blind = room.game.ritualHands[seat]!.some(id => ritualFromId(id).blind);
        room.game = reduce(room.game, { type: 'ritual-mode', playerId, blind });
      } else if (room.game.ritualPhase === 'blind') {
        const blind = room.game.ritualHands[seat]!.find(id => ritualFromId(id).blind);
        room.game = blind
          ? reduce(room.game, { type: 'ritual-play', playerId, ritualId: blind, prediction: '2-0', numberValue: randomInt(1, 10), targetSeat: (seat + 1) % room.seats.length, allySeat: seat })
          : reduce(room.game, { type: 'ritual-reveal', playerId });
      } else if (room.game.ritualPhase === 'revealed') {
        const ritualId = room.game.ritualHands[seat]!.find(id => !ritualFromId(id).blind)!;
        room.game = reduce(room.game, { type: 'ritual-play', playerId, ritualId,
          creatureKind: ritualFromId(ritualId).kind === 'forca-oculta' ? 'raven' : CARD_BY_ID[room.game.hands[seat]![0]!]!.kind,
          trickNumber: 1,
          targetSeat: (seat + 1) % room.seats.length, allySeat: seat });
      } else if (room.game.ritualPhase === 'ancient-discard') {
        room.game = reduce(room.game, { type: 'ritual-ancient-discard', playerId, cardId: room.game.hands[seat]![0]! });
      } else if (room.game.ritualPhase === 'mirror') {
        room.game = reduce(room.game, { type: 'ritual-mirror', playerId });
      } else if (room.game.ritualPhase === 'fortune') {
        const targetSeat = room.game.hands.findIndex((hand, index) => index % 2 !== seat % 2 && hand.length > 0);
        room.game = reduce(room.game, { type: 'ritual-fortune', playerId,
          ...(room.game.hands[seat]!.length && targetSeat >= 0 ? { cardId: room.game.hands[seat]![0]!, targetSeat, targetIndex: randomInt(room.game.hands[targetSeat]!.length) } : {}),
        });
      } else if (room.game.ritualPhase === 'permutation') {
        room.game = reduce(room.game, { type: 'ritual-permutation', playerId, cardId: room.game.hands[seat]![0]! });
      } else if (room.game.ritualPhase === 'dice') {
        room.game = reduce(room.game, { type: 'ritual-roll', playerId });
      } else if (room.game.ritualPhase === 'accelerate') {
        const cardId = room.game.hands[seat]!.find(id => CARD_BY_ID[id]!.kind !== 'arcana')!;
        room.game = reduce(room.game, { type: 'ritual-accelerate', playerId, cardId });
      } else if (room.game.ritualPhase === 'blood-vote') {
        room.game = reduce(room.game, { type: 'ritual-blood', playerId, play: true });
      } else if (room.game.ritualPhase === 'destiny-vote') {
        room.game = reduce(room.game, { type: 'ritual-destiny', playerId, approve: true });
      } else if (room.game.ritualPhase === 'seal') {
        room.game = reduce(room.game, { type: 'ritual-seal', playerId, index: randomInt(room.game.hands[seat]!.length) });
      } else if (room.game.ritualPhase === 'champions') {
        const targetSeat = room.game.playerIds.map((_, offset) => (room.game!.ritualChooser + offset) % room.game!.playerIds.length)
          .find(target => room.game!.ritualChampionCards[target] === null)!;
        room.game = reduce(room.game, { type: 'ritual-champion', playerId, index: randomInt(room.game.hands[targetSeat]!.length) });
      } else if (room.game.ritualPhase === 'force-roll') {
        room.game = reduce(room.game, { type: 'ritual-force-roll', playerId });
      } else if (room.game.ritualPhase === 'rune-roll') {
        room.game = reduce(room.game, { type: 'ritual-rune-roll', playerId });
      } else if (room.game.ritualPhase === 'rune-card') {
        room.game = reduce(room.game, { type: 'ritual-rune-card', playerId, cardId: room.game.hands[seat]![0]! });
      } else if (room.game.ritualPhase === 'bond-choice') {
        room.game = reduce(room.game, { type: 'ritual-bond-keep', playerId, discardIds: [] });
      } else if (room.game.ritualPhase === 'bond-rival') {
        room.game = reduce(room.game, { type: 'ritual-bond-rival', playerId, indices: room.game.ritualBondDrawn.map((_, index) => index) });
      } else if (room.game.ritualPhase === 'blind-discard' || room.game.ritualPhase === 'revealed-discard') {
        const choice = room.game.ritualPhase === 'blind-discard' ? '0' : room.game.ritualExchange!.newCardIds[0]!;
        room.game = reduce(room.game, { type: 'ritual-discard', playerId, choice });
      }
    } else {
      if (isMindControlled(room.game, room.game.turn) && !room.game.mindControlReady) {
        room.game = reduce(room.game, { type: 'mind-ready', playerId: room.seats[seat]!.playerId });
        emitRoom(room);
        botTurn(room);
        return;
      }
      const target = room.game.ritualActiveId && ritualFromId(room.game.ritualActiveId).kind === 'ritual-oculto' ? seat : room.game.turn;
      const sealed = room.game.ritualActiveId && ritualFromId(room.game.ritualActiveId).kind === 'feitico-oculto'
        && room.game.trickHistory.length >= 2;
      const index = sealed ? 0 : randomInt(room.game.hands[target]!.length);
      const cardId = sealed ? 'sealed' : isMindControlled(room.game, target) ? 'random'
        : isBlindToCreatures(room.game, target) ? String(index) : room.game.hands[target]![index]!;
      room.game = reduce(room.game, { type: 'play', playerId: room.seats[seat]!.playerId, cardId });
    }
    emitRoom(room);
    botTurn(room);
  }, 550);
}

io.on('connection', socket => {
  socket.on('room:create', (request: { playerId?: unknown; name?: unknown; testMode?: boolean; playerCount?: unknown; targetScore?: unknown }, reply: Reply) => {
    if (!validId(request?.playerId)) return fail(reply, 'Identidade do jogador inválida.');
    const playerCount = request?.playerCount === undefined ? 4 : Number(request.playerCount);
    const targetScore = request?.targetScore === undefined ? 15 : Number(request.targetScore);
    if (![4, 6, 8].includes(playerCount) || ![15, 25].includes(targetScore)) return fail(reply, 'Escolha 4, 6 ou 8 jogadores e 15 ou 25 pontos.');
    const code = roomCode();
    const room: Room = { code, seats: Array.from({ length: playerCount }, () => null), targetScore: targetScore as 15 | 25, ownerId: request.playerId, testMode: !!request.testMode, game: null, botTimer: null };
    if (room.testMode) {
      room.seats = Array.from({ length: playerCount }, (_, seat) => ({
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
    if (!Number.isInteger(seat) || seat < 0 || seat >= room.seats.length || typeof request?.cardId !== 'string') return fail(reply, 'Jogada inválida.');
    try {
      room.game = reduce(room.game, { type: 'play', playerId: room.seats[seat]!.playerId, cardId: request.cardId });
      reply({ ok: true, code: room.code });
      emitRoom(room);
      botTurn(room);
    } catch (error) { fail(reply, error instanceof Error ? error.message : 'Jogada inválida.'); }
  });
  socket.on('room:mindReady', (request: { seat?: unknown }, reply: Reply) => {
    const room = rooms.get(socket.data.code);
    if (!room?.game) return fail(reply, 'A partida ainda não começou.');
    const ownerControls = room.testMode && socket.data.playerId === room.ownerId;
    const seat = ownerControls ? Number(request?.seat) : room.seats.findIndex(item => item?.playerId === socket.data.playerId);
    if (!Number.isInteger(seat) || seat < 0 || seat >= room.seats.length) return fail(reply, 'Jogada inválida.');
    try {
      room.game = reduce(room.game, { type: 'mind-ready', playerId: room.seats[seat]!.playerId });
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
    if (!Number.isInteger(seat) || seat < 0 || seat >= room.seats.length) return fail(reply, 'Pedido inválido.');
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
    if (!Number.isInteger(seat) || seat < 0 || seat >= room.seats.length || typeof request?.accept !== 'boolean') return fail(reply, 'Resposta inválida.');
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
    if (!Number.isInteger(seat) || seat < 0 || seat >= room.seats.length) return fail(reply, 'Pedido inválido.');
    try {
      room.game = reduce(room.game, { type: 'counter', playerId: room.seats[seat]!.playerId });
      reply({ ok: true, code: room.code });
      emitRoom(room);
      botTurn(room);
    } catch (error) { fail(reply, error instanceof Error ? error.message : 'Pedido inválido.'); }
  });
  socket.on('room:ability', (request: { choice?: unknown; seat?: unknown }, reply: Reply) => {
    const room = rooms.get(socket.data.code);
    if (!room?.game) return fail(reply, 'A partida ainda não começou.');
    const ownerControls = room.testMode && socket.data.playerId === room.ownerId;
    const seat = ownerControls ? Number(request?.seat) : room.seats.findIndex(item => item?.playerId === socket.data.playerId);
    if (!Number.isInteger(seat) || seat < 0 || seat >= room.seats.length || typeof request?.choice !== 'string') return fail(reply, 'Escolha inválida.');
    try {
      room.game = reduce(room.game, { type: 'ability', playerId: room.seats[seat]!.playerId, choice: request.choice });
      reply({ ok: true, code: room.code });
      emitRoom(room);
      botTurn(room);
    } catch (error) { fail(reply, error instanceof Error ? error.message : 'Escolha inválida.'); }
  });
  socket.on('room:ritual', (request: { type?: unknown; blind?: unknown; ritualId?: unknown; prediction?: unknown; creatureKind?: unknown; numberValue?: unknown; trickNumber?: unknown; targetSeat?: unknown; targetIndex?: unknown; allySeat?: unknown; cardId?: unknown; recoverCardId?: unknown; discardCardId?: unknown; choice?: unknown; index?: unknown; indices?: unknown; discardIds?: unknown; moon?: unknown; activate?: unknown; play?: unknown; approve?: unknown; seat?: unknown }, reply: Reply) => {
    const room = rooms.get(socket.data.code);
    if (!room?.game) return fail(reply, 'A partida ainda não começou.');
    const ownerControls = room.testMode && socket.data.playerId === room.ownerId;
    const seat = ownerControls ? Number(request?.seat) : room.seats.findIndex(item => item?.playerId === socket.data.playerId);
    if (!Number.isInteger(seat) || seat < 0 || seat >= room.seats.length) return fail(reply, 'Escolha de Ritual inválida.');
    const playerId = room.seats[seat]!.playerId;
    try {
      if (request.type === 'mode' && typeof request.blind === 'boolean') room.game = reduce(room.game, { type: 'ritual-mode', playerId, blind: request.blind });
      else if (request.type === 'reveal') room.game = reduce(room.game, { type: 'ritual-reveal', playerId });
      else if (request.type === 'play' && typeof request.ritualId === 'string') room.game = reduce(room.game, {
        type: 'ritual-play', playerId, ritualId: request.ritualId,
        prediction: request.prediction === '2-0' || request.prediction === '2-1' ? request.prediction : undefined,
        creatureKind: typeof request.creatureKind === 'string' ? request.creatureKind as CreatureKind : undefined,
        numberValue: Number.isInteger(request.numberValue) ? request.numberValue as number : undefined,
        trickNumber: Number.isInteger(request.trickNumber) ? request.trickNumber as number : undefined,
        targetSeat: Number.isInteger(request.targetSeat) ? request.targetSeat as number : undefined,
        allySeat: Number.isInteger(request.allySeat) ? request.allySeat as number : undefined,
      });
      else if (request.type === 'ancient-discard' && typeof request.cardId === 'string') room.game = reduce(room.game, { type: 'ritual-ancient-discard', playerId, cardId: request.cardId });
      else if (request.type === 'mirror') room.game = reduce(room.game, { type: 'ritual-mirror', playerId, targetSeat: Number.isInteger(request.targetSeat) ? request.targetSeat as number : undefined });
      else if (request.type === 'fortune') room.game = reduce(room.game, { type: 'ritual-fortune', playerId,
        cardId: typeof request.cardId === 'string' ? request.cardId : undefined,
        targetSeat: Number.isInteger(request.targetSeat) ? request.targetSeat as number : undefined,
        targetIndex: Number.isInteger(request.targetIndex) ? request.targetIndex as number : undefined,
      });
      else if (request.type === 'permutation' && typeof request.cardId === 'string') room.game = reduce(room.game, { type: 'ritual-permutation', playerId, cardId: request.cardId });
      else if (request.type === 'roll') room.game = reduce(room.game, { type: 'ritual-roll', playerId });
      else if (request.type === 'accelerate' && typeof request.cardId === 'string') room.game = reduce(room.game, { type: 'ritual-accelerate', playerId, cardId: request.cardId });
      else if (request.type === 'weaken') room.game = reduce(room.game, { type: 'ritual-weaken', playerId, targetSeat: Number.isInteger(request.targetSeat) ? request.targetSeat as number : undefined });
      else if (request.type === 'blood' && typeof request.play === 'boolean') room.game = reduce(room.game, { type: 'ritual-blood', playerId, play: request.play });
      else if (request.type === 'destiny' && typeof request.approve === 'boolean') room.game = reduce(room.game, { type: 'ritual-destiny', playerId, approve: request.approve });
      else if (request.type === 'seal' && Number.isInteger(request.index)) room.game = reduce(room.game, { type: 'ritual-seal', playerId, index: request.index as number });
      else if (request.type === 'champion' && Number.isInteger(request.index)) room.game = reduce(room.game, { type: 'ritual-champion', playerId, index: request.index as number });
      else if (request.type === 'force-roll') room.game = reduce(room.game, { type: 'ritual-force-roll', playerId });
      else if (request.type === 'rune-roll') room.game = reduce(room.game, { type: 'ritual-rune-roll', playerId });
      else if (request.type === 'rune-card' && typeof request.cardId === 'string') room.game = reduce(room.game, { type: 'ritual-rune-card', playerId, cardId: request.cardId });
      else if (request.type === 'bond-keep' && Array.isArray(request.discardIds) && request.discardIds.every(id => typeof id === 'string')) room.game = reduce(room.game, { type: 'ritual-bond-keep', playerId, discardIds: request.discardIds as string[] });
      else if (request.type === 'bond-rival' && Array.isArray(request.indices) && request.indices.every(index => Number.isInteger(index))) room.game = reduce(room.game, { type: 'ritual-bond-rival', playerId, indices: request.indices as number[] });
      else if (request.type === 'mist' && typeof request.moon === 'string') room.game = reduce(room.game, { type: 'ritual-mist', playerId, moon: request.moon as Moon });
      else if (request.type === 'sum' && typeof request.activate === 'boolean') room.game = reduce(room.game, { type: 'ritual-sum', playerId, activate: request.activate });
      else if (request.type === 'genjutso') room.game = reduce(room.game, { type: 'ritual-genjutso', playerId,
        recoverCardId: typeof request.recoverCardId === 'string' ? request.recoverCardId : undefined,
        discardCardId: typeof request.discardCardId === 'string' ? request.discardCardId : undefined });
      else if (request.type === 'discard' && typeof request.choice === 'string') room.game = reduce(room.game, { type: 'ritual-discard', playerId, choice: request.choice });
      else return fail(reply, 'Escolha de Ritual inválida.');
      reply({ ok: true, code: room.code }); emitRoom(room); botTurn(room);
    } catch (error) { fail(reply, error instanceof Error ? error.message : 'Escolha de Ritual inválida.'); }
  });
  socket.on('room:testAbility', (request: { kind?: unknown; mode?: unknown }, reply: Reply) => {
    const room = rooms.get(socket.data.code);
    if (!room?.game || !room.testMode || socket.data.playerId !== room.ownerId || room.seats.length !== 4) return fail(reply, 'Cenários de habilidade disponíveis apenas no teste solo com 4 jogadores.');
    if (typeof request?.kind !== 'string' || !(request.kind in CREATURE_EFFECTS) || (request.mode !== 'trick' && request.mode !== 'declined')) return fail(reply, 'Cenário inválido.');
    try {
      room.game = createAbilityScenario(room.seats.map(seat => seat!.playerId), request.kind as CreatureKind, request.mode, room.targetScore);
      reply({ ok: true, code: room.code });
      emitRoom(room);
    } catch (error) { fail(reply, error instanceof Error ? error.message : 'Cenário inválido.'); }
  });
  socket.on('room:testRitual', (request: { kind?: unknown }, reply: Reply) => {
    const room = rooms.get(socket.data.code);
    if (!room?.game || !room.testMode || socket.data.playerId !== room.ownerId) return fail(reply, 'Cenários disponíveis apenas no teste solo.');
    if (typeof request?.kind !== 'string') return fail(reply, 'Escolha um Ritual do baralho de teste.');
    try {
      room.game = createRitualScenario(room.seats.map(seat => seat!.playerId), request.kind as RitualKind, room.targetScore);
      reply({ ok: true, code: room.code });
      emitRoom(room);
    } catch (error) { fail(reply, error instanceof Error ? error.message : 'Ritual inválido.'); }
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
