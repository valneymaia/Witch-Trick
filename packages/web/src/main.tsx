import React from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { io } from 'socket.io-client';
import { CREATURES, CREATURE_EFFECTS, MOONS, MOON_NAMES, RITUALS, trickPoints, type AbilityStage, type CreatureCard, type CreatureKind, type GameView, type RitualCard, type RitualKind, type Team, type TrickLevel } from '../../engine/src/index.js';
import './style.css';

interface SeatInfo { seat: number; name: string; bot: boolean; online: boolean }
interface RoomState {
  code: string;
  seats: (SeatInfo | null)[];
  targetScore: 15 | 25;
  testMode: boolean;
  game: GameView | null;
  allHands?: CreatureCard[][];
  allRitualHands?: RitualCard[][];
}
type Ack = { ok: true; code: string } | { ok: false; error: string };

const socket = io({ autoConnect: false });
function identity(): string {
  let id = sessionStorage.getItem('witch-trick-player-id');
  if (!id) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem('witch-trick-player-id', id);
  }
  return id;
}
const playerId = identity();

function Card({ card, onClick, disabled = false }: { card: CreatureCard; onClick?: () => void; disabled?: boolean }) {
  return <button className={`card ${onClick ? 'card-playable' : ''}`} type="button" onClick={onClick} disabled={disabled || !onClick} title={`${card.name} · Lua ${MOON_NAMES[card.moon]}`}>
    <img src={card.image} alt={`${card.name}, Lua ${MOON_NAMES[card.moon]}`} onError={event => { event.currentTarget.style.display = 'none'; event.currentTarget.parentElement?.classList.add('card-fallback'); }} />
    <span className="fallback-label">{card.name}<small>{card.value === 10 ? 'Arcana' : card.value} · {MOON_NAMES[card.moon]}</small></span>
  </button>;
}
function HiddenCard({ index, onClick, disabled = false, action = 'Jogar' }: { index: number; onClick?: () => void; disabled?: boolean; action?: string }) {
  return <button className={`card hidden-creature-card ${onClick ? 'card-playable' : ''}`} type="button" disabled={disabled || !onClick} onClick={onClick} aria-label={onClick ? `${action} carta oculta ${index + 1}` : `Carta oculta ${index + 1}`}>
    <img src="/cards/verso.png" alt="" /><small>Carta {index + 1}</small>
  </button>;
}
const diePips: Record<number, number[]> = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
function DieFace({ team, value, round, label }: { team: Team; value: number | null; round: number; label?: string }) {
  return <div className={`dice-team team-${team === 0 ? 'a' : 'b'}`}>
    <strong>{label ?? `Equipe ${team === 0 ? 'A' : 'B'}`}</strong>
    <div key={`${round}-${team}-${value ?? 'waiting'}`} className={`die-face ${value !== null ? 'die-rolled' : 'die-waiting'}`} role="img" aria-label={value === null ? `${label ?? `Equipe ${team === 0 ? 'A' : 'B'}`} ainda não lançou` : `${label ?? `Equipe ${team === 0 ? 'A' : 'B'}`} tirou ${value}`}>
      {value === null ? <span className="die-question">?</span> : diePips[value]?.map(position => <span className="die-pip" style={{ gridArea: `${Math.ceil(position / 3)} / ${((position - 1) % 3) + 1}` }} key={position} />)}
    </div>
    <span className="dice-number">{value === null ? 'A lançar' : `${value} no dado`}</span>
  </div>;
}
const trickNames = { 2: 'Double Trick', 3: 'Hat Trick', 4: 'Poker Trick' } as const;
const creatureStrength = [...CREATURES].sort((left, right) => right.value - left.value);
const abilityCardActions: Partial<Record<AbilityStage, string>> = {
  source: 'Ativar e descartar',
  'puppet-card': 'Recuperar esta criatura',
  'puppet-exchange': 'Descartar esta criatura',
  'fairy-card': 'Descartar esta criatura',
  'goblin-own': 'Entregar esta criatura',
  'griffin-discard': 'Descartar esta criatura',
  'wizard-decision': 'Trocar por este Ritual',
  'wizard-own': 'Entregar este Ritual',
  'witch-discard': 'Descartar este Ritual',
};
function MoonTrack({ winners, compact = false, total = 3 }: { winners: Team[]; compact?: boolean; total?: number }) {
  const slots = Array.from({ length: total }, (_, index) => index);
  return <div className={`moon-track ${compact ? 'moon-track-compact' : ''}`} aria-label={`Vazas: ${slots.map(i => winners[i] === undefined ? `${i + 1} pendente` : `${i + 1} Equipe ${winners[i] === 0 ? 'A' : 'B'}`).join(', ')}`}>
    {slots.map(i => <div className={`vaza-moon ${winners[i] === 0 ? 'moon-team-a' : winners[i] === 1 ? 'moon-team-b' : 'moon-empty'}`} key={i} title={`Vaza ${i + 1}: ${winners[i] === undefined ? 'pendente' : `Equipe ${winners[i] === 0 ? 'A' : 'B'}`}`}><span>☾</span><small>{i + 1}</small></div>)}
  </div>;
}
function App() {
  const [connected, setConnected] = React.useState(false);
  const [room, setRoom] = React.useState<RoomState | null>(null);
  const [name, setName] = React.useState(sessionStorage.getItem('witch-trick-name') || '');
  const [playerCount, setPlayerCount] = React.useState<4 | 6 | 8>(4);
  const [targetScore, setTargetScore] = React.useState<15 | 25>(15);
  const [code, setCode] = React.useState(new URLSearchParams(window.location.search).get('join')?.toUpperCase() || '');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [inspectedCard, setInspectedCard] = React.useState<CreatureCard | null>(null);
  const [inspectedRitual, setInspectedRitual] = React.useState<RitualCard | null>(null);
  const [showRitualHand, setShowRitualHand] = React.useState(false);
  const [showGuide, setShowGuide] = React.useState(false);
  const abilityDialogRef = React.useRef<HTMLElement>(null);
  const [runaCreature, setRunaCreature] = React.useState<CreatureKind>('raven');
  const [forceCreature, setForceCreature] = React.useState<CreatureKind>('raven');
  const [pactAllySeat, setPactAllySeat] = React.useState(0);
  const [pactOpponentSeat, setPactOpponentSeat] = React.useState(1);
  const [fortuneOwnCardId, setFortuneOwnCardId] = React.useState<string | null>(null);
  const [bondOwnIds, setBondOwnIds] = React.useState<string[]>([]);
  const [bondRivalIndices, setBondRivalIndices] = React.useState<number[]>([]);
  const [genjutsuRecoverId, setGenjutsuRecoverId] = React.useState<string | null>(null);
  const [genjutsuDiscardId, setGenjutsuDiscardId] = React.useState<string | null>(null);
  const [scenarioKind, setScenarioKind] = React.useState<CreatureKind>('raven');
  const [scenarioRitual, setScenarioRitual] = React.useState<RitualKind>('veu-da-incerteza');

  React.useEffect(() => {
    if (!inspectedCard && !inspectedRitual && !showRitualHand && !showGuide) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setInspectedCard(null); setInspectedRitual(null); setShowRitualHand(false); setShowGuide(false); } };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [inspectedCard, inspectedRitual, showRitualHand, showGuide]);

  React.useEffect(() => {
    function onConnect() {
      setConnected(true);
      const savedCode = sessionStorage.getItem('witch-trick-room');
      if (savedCode) socket.emit('room:join', { code: savedCode, playerId, name: sessionStorage.getItem('witch-trick-name') }, (ack: Ack) => {
        if (!ack.ok) { sessionStorage.removeItem('witch-trick-room'); setError(ack.error); }
      });
    }
    function onDisconnect() { setConnected(false); }
    function onState(state: RoomState) { setRoom(state); setError(''); }
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:state', onState);
    socket.connect();
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); socket.off('room:state', onState); socket.disconnect(); };
  }, []);

  function send(event: string, payload: object | undefined, success?: (ack: { ok: true; code: string }) => void) {
    setBusy(true); setError('');
    const onReply = (ack: Ack) => {
      setBusy(false);
      if (!ack.ok) { setError(ack.error); return; }
      success?.(ack);
    };
    if (payload) socket.emit(event, payload, onReply);
    else socket.emit(event, onReply);
  }
  function create(testMode: boolean) {
    const playerName = name.trim() || 'Jogador';
    sessionStorage.setItem('witch-trick-name', playerName);
    send('room:create', { playerId, name: playerName, testMode, playerCount, targetScore }, ack => sessionStorage.setItem('witch-trick-room', ack.code));
  }
  function join() {
    const playerName = name.trim() || 'Jogador';
    sessionStorage.setItem('witch-trick-name', playerName);
    send('room:join', { code: code.trim().toUpperCase(), playerId, name: playerName }, ack => sessionStorage.setItem('witch-trick-room', ack.code));
  }
  function leave() {
    socket.emit('room:leave');
    sessionStorage.removeItem('witch-trick-room');
    setRoom(null); setError('');
  }
  async function copyCode() {
    if (!room) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(room.code);
      else {
        const field = document.createElement('textarea');
        field.value = room.code;
        field.style.position = 'fixed'; field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand('copy');
        field.remove();
        if (!copied) throw new Error('Cópia indisponível.');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { setError('Não foi possível copiar. Use o código exibido na sala.'); }
  }
  function play(cardId: string) {
    if (!room?.game) return;
    const seat = cardId === 'random'
      ? (room.game.turn - 1 + room.seats.length) % room.seats.length : room.game.turn;
    send('room:play', { cardId, seat: room.testMode ? seat : undefined });
  }
  function mindReady() {
    if (!room?.game) return;
    send('room:mindReady', { seat: room.testMode ? room.game.turn : undefined });
  }
  function raise() {
    if (!room?.game) return;
    send('room:raise', { seat: room.testMode ? room.game.turn : undefined });
  }
  function respond(accept: boolean) {
    if (!room?.game?.pendingChallenge) return;
    send('room:respond', { accept, seat: room.testMode ? room.game.pendingChallenge.responderSeat : undefined });
  }
  function counter() {
    if (!room?.game?.pendingChallenge) return;
    send('room:counter', { seat: room.testMode ? room.game.pendingChallenge.responderSeat : undefined });
  }
  function chooseAbility(choice: string) {
    if (!room?.game?.pendingAbility) return;
    send('room:ability', { choice, seat: room.testMode ? room.game.pendingAbility.seat : undefined });
  }
  function ritual(type: 'mode' | 'reveal' | 'play' | 'seal' | 'champion' | 'force-roll' | 'discard' | 'ancient-discard' | 'mirror' | 'fortune' | 'permutation' | 'roll' | 'accelerate' | 'weaken' | 'blood' | 'destiny' | 'rune-roll' | 'rune-card' | 'bond-keep' | 'bond-rival' | 'mist' | 'sum' | 'genjutso', extra: object = {}) {
    if (!room?.game) return;
    const seat = ['weaken', 'mist', 'sum', 'genjutso'].includes(type) ? room.game.ritualChooser : room.game.ritualDecisionSeat;
    send('room:ritual', { type, seat: room.testMode ? seat : undefined, ...extra });
  }

  const game = room?.game;
  const ritualPending = !!game?.ritualMode && game.ritualPhase !== 'off' && game.ritualPhase !== 'play';
  const ritualActor = game?.ritualDecisionSeat;
  const controlledSeat = room?.testMode ? game?.pendingAbility?.seat ?? game?.pendingChallenge?.responderSeat ?? (game?.ritualSumDecision || game?.ritualGenjutsuDecision ? game.ritualChooser : ritualPending ? ritualActor : game?.turn) : game?.seat;
  const handSeat = game?.pendingAbility?.seat ?? game?.pendingChallenge?.responderSeat ?? (game?.ritualSumDecision || game?.ritualGenjutsuDecision ? game.ritualChooser : ritualPending ? ritualActor : game?.turn);
  const hand: CreatureCard[] = room?.testMode && handSeat != null ? room.allHands?.[handSeat] ?? [] : game?.hand ?? [];
  const ritualHand = room?.testMode && game ? room.allRitualHands?.[game.ritualChooser] ?? [] : game?.ritualHand ?? [];
  const displayedRitualHand = room?.testMode && controlledSeat != null ? room.allRitualHands?.[controlledSeat] ?? [] : game?.ritualHand ?? [];
  const bloodSharedHands = room?.testMode && ritualActor != null
    ? room.seats.flatMap((_, seat) => seat !== ritualActor && seat % 2 === ritualActor % 2
      ? [{ seat, cards: room.allHands?.[seat] ?? [] }] : [])
    : game?.ritualTeammateHands ?? [];
  const visionSharedHands = game?.ritualActive?.kind === 'visao-compartilhada'
    && controlledSeat != null && controlledSeat % 2 === game.ritualChooser % 2
    ? room?.testMode
      ? room.seats.flatMap((_, seat) => seat !== controlledSeat && seat % 2 === controlledSeat % 2
        ? [{ seat, cards: room.allHands?.[seat] ?? [] }] : [])
      : game.ritualTeammateHands
    : [];
  const blindControlled = controlledSeat != null && !!game?.blindSeats.includes(controlledSeat);
  const pactAlly = game && pactAllySeat < room!.seats.length && pactAllySeat % 2 === game.ritualChooser % 2 ? pactAllySeat : game?.ritualChooser ?? 0;
  const pactOpponent = game && pactOpponentSeat < room!.seats.length && pactOpponentSeat % 2 !== game.ritualChooser % 2 ? pactOpponentSeat : game ? (game.ritualChooser + 1) % room!.seats.length : 1;
  const fortuneHand: CreatureCard[] = game?.ritualPhase === 'fortune' && ritualActor != null
    ? room?.testMode ? room.allHands?.[ritualActor] ?? [] : game.seat === ritualActor ? game.hand : [] : [];
  const accelerateHand: CreatureCard[] = game?.ritualPhase === 'accelerate' && ritualActor != null
    ? room?.testMode ? room.allHands?.[ritualActor] ?? [] : game.seat === ritualActor ? game.hand : [] : [];
  const permutationHand: CreatureCard[] = game?.ritualPhase === 'permutation' && ritualActor != null
    ? room?.testMode ? room.allHands?.[ritualActor] ?? [] : game.seat === ritualActor ? game.hand : [] : [];
  const selectedFortuneCard = fortuneHand.find(card => card.id === fortuneOwnCardId);
  React.useEffect(() => { setFortuneOwnCardId(null); }, [game?.ritualPhase, ritualActor]);
  React.useEffect(() => { setBondOwnIds([]); setBondRivalIndices([]); }, [game?.round, game?.ritualPhase]);
  React.useEffect(() => { setGenjutsuRecoverId(null); setGenjutsuDiscardId(null); }, [game?.round, game?.ritualGenjutsuDecision]);
  const rollTeam = game ? (room?.testMode ? (ritualActor ?? game.ritualChooser) % 2 : game.seat % 2) : 0;
  const canRoll = !!game && game.ritualPhase === 'dice' && game.winner === null && game.ritualDiceRolls[rollTeam] === null;
  const showX1Stage = !!game && (game.ritualPhase === 'dice' || (game.lastRound?.reason === 'dice' && !!game.lastDiceResult && game.trickHistory.length === 0 && game.trick.length === 0));
  const showForceStage = !!game && game.ritualActive?.kind === 'forca-oculta'
    && (game.ritualPhase === 'force-roll' || (game.ritualPhase === 'play' && game.trick.length === 0 && game.trickHistory.length === 0));
  const showRuneStage = !!game && game.ritualActive?.kind === 'bencao-das-runas'
    && (game.ritualPhase === 'rune-roll' || game.ritualPhase === 'rune-card' || (game.ritualPhase === 'play' && game.trick.length === 0 && game.trickHistory.length === 0));
  const showDiceStage = showX1Stage || showForceStage || showRuneStage;
  const displayedDiceRolls = game?.ritualPhase === 'dice'
    ? game.ritualDiceRolls.some(roll => roll !== null) ? game.ritualDiceRolls : game.lastDiceResult?.round === game.round && game.lastDiceResult.winner === null ? game.lastDiceResult.rolls : [null, null]
    : game?.lastDiceResult?.rolls ?? [null, null];
  const sealedSeat = room?.testMode ? handSeat : game?.seat;
  const sealedCount = sealedSeat == null ? 0 : game?.players[sealedSeat]?.sealedCount ?? 0;
  const sealedFinal = game?.ritualActive?.kind === 'feitico-oculto' && game.trickHistory.length >= 2;
  const mindControlled = controlledSeat != null && !!game?.mindControlledSeats.includes(controlledSeat);
  const mindControlledTurn = !!game?.mindControlledSeats.includes(game.turn);
  const mindController = game ? (game.turn - 1 + room!.seats.length) % room!.seats.length : null;
  const blindHandCount = blindControlled && controlledSeat != null ? game?.players[controlledSeat]?.handCount ?? 0 : 0;
  const hiddenPreparationCount = game?.ritualPhase === 'blind-discard' && game.ritualDiscardSeat === (room?.testMode ? handSeat : game.seat)
    ? game.ritualDiscardOptions.length : game && ['mode', 'blind', 'blind-discard', 'champions'].includes(game.ritualPhase)
      ? Math.max(0, (game.players[room?.testMode ? handSeat ?? game.seat : game.seat]?.handCount ?? 0) - hand.length) : 0;
  const canAncientDiscard = game?.ritualPhase === 'ancient-discard' && game.winner === null && (room?.testMode || game.ancientDiscardSeat === game.seat);
  const canRitual = ritualPending && !!game && game.winner === null && !game.pendingAbility && (room?.testMode || ritualActor === game.seat);
  const secretTrick = game?.ritualActive?.kind === 'ritual-oculto';
  const actingSeat = room?.testMode ? game?.turn : game?.seat;
  const alreadyCommitted = actingSeat != null && !!game?.trick.some(play => play.seat === actingSeat);
  const myTurn = !!game && game.winner === null && !ritualPending && !game.ritualWeakeningDecision && !game.ritualSumDecision && !game.ritualGenjutsuDecision && game.pendingChallenge === null && game.pendingAbility === null
    && !alreadyCommitted && (room?.testMode || (secretTrick ? (game.players[game.seat]?.handCount ?? 0) > 0 : game.turn === game.seat));
  const canMindChoose = mindControlledTurn && !!game && game.winner === null && !ritualPending
    && game.pendingChallenge === null && game.pendingAbility === null
    && game.mindControlReady && (room?.testMode || game.seat === mindController);
  const silenceBlocks = game?.ritualActive?.kind === 'silencio-da-bruxa' && game.turn % 2 !== game.ritualChooser % 2;
  const nextTrickLevel = (game?.acceptedTrickLevel ? game.acceptedTrickLevel + 1 : 2) as TrickLevel;
  const pendingTrickPoints = game?.pendingChallenge ? trickPoints(game.roundBaseStake, game.pendingChallenge.level) : null;
  const canRaise = myTurn && !game!.mindControlReady && !silenceBlocks && game!.acceptedTrickLevel < 4 && game!.lastRaiseTeam !== (actingSeat! % 2);
  const canWeaken = !!game && game.ritualActive?.kind === 'enfraquecer' && !game.ritualWeakeningUsed
    && game.winner === null && game.pendingChallenge === null && (room?.testMode || game.seat === game.ritualChooser);
  const historyFromPreviousRound = !!game && game.round > 1 && game.trick.length === 0 && game.trickHistory.length === 0 && game.lastRoundTricks.length > 0;
  const visibleTricks = game?.trickHistory.length ? game.trickHistory : historyFromPreviousRound ? game!.lastRoundTricks : [];
  const canRespond = !!game?.pendingChallenge && game.winner === null && (room?.testMode || game.pendingChallenge.responderSeat === game.seat);
  const canCounter = canRespond && !(game?.ritualActive?.kind === 'silencio-da-bruxa' && game.pendingChallenge!.responderSeat % 2 !== game.ritualChooser % 2);
  const canAbility = !!game?.pendingAbility && game.winner === null && (room?.testMode || game.pendingAbility.seat === game.seat);
  React.useEffect(() => {
    if (!canAbility) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const dialog = abilityDialogRef.current;
    (dialog?.querySelector<HTMLButtonElement>('button:not(:disabled)') ?? dialog)?.focus();
    const keepFocusInDialog = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || document.querySelector('.card-dialog-backdrop')) return;
      const buttons = [...(dialog?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
      if (!buttons.length) { event.preventDefault(); dialog?.focus(); return; }
      const first = buttons[0]!;
      const last = buttons[buttons.length - 1]!;
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keepFocusInDialog);
    return () => {
      document.removeEventListener('keydown', keepFocusInDialog);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [canAbility, game?.pendingAbility?.stage]);
  const abilityStageText: Record<string, string> = {
    source: 'Escolha uma carta da sua mão para ativar e descartar', offer: 'Quer usar a habilidade da carta vencedora?',
    'puppet-card': 'Escolha uma carta já jogada para recuperar', 'puppet-exchange': 'Escolha outra carta da sua mão para descartar',
    'fairy-target': 'Escolha um adversário', 'fairy-card': 'Escolha uma das cartas reveladas para descartar',
    'goblin-own': 'Escolha uma carta sua para trocar', 'goblin-target': 'Escolha um adversário para a troca aleatória',
    'griffin-discard': 'Você comprou uma carta. Escolha uma para descartar',
    'wizard-target': 'Escolha um adversário; um Ritual dele será revelado',
    'wizard-decision': 'Veja o Ritual sorteado e decida se quer trocar',
    'wizard-own': 'Escolha qual Ritual seu entregar na troca',
    'witch-discard': 'Você comprou um Ritual. Escolha um Ritual da sua mão para descartar',
  };
  const reveal = game?.lastCreatureReveal;
  const revealTitle = reveal?.reason === 'goblin'
    ? `${room?.seats[reveal.seat]?.name} trocou com ${room?.seats[reveal.targetSeat ?? 0]?.name}`
    : reveal?.reason === 'accelerated'
      ? `${room?.seats[reveal.seat]?.name} descartou uma criatura pela Magia Acelerada`
    : reveal?.reason === 'fairy'
      ? `${room?.seats[reveal.seat]?.name} descartou uma criatura de ${room?.seats[reveal.targetSeat ?? 0]?.name} com a Fada`
    : reveal?.reason === 'blind-discard'
      ? `${room?.seats[reveal.seat]?.name} descartou pelo verso com ${reveal.source === 'griffin' ? 'o Grifo' : 'o Titereiro'}`
      : reveal ? `${room?.seats[reveal.seat]?.name} revelou após Trick recusado` : '';
  const revealDescription = reveal?.reason === 'goblin'
    ? reveal.pointAwarded ? `Carta recebida: valor ${reveal.card.value}, menor ou igual a 5. Equipe ${reveal.seat % 2 === 0 ? 'A' : 'B'} ganhou 1 ponto.` : `Carta recebida: valor ${reveal.card.value}. Nenhum ponto extra.`
    : reveal?.reason === 'fairy' ? `${reveal.card.name} · Lua ${MOON_NAMES[reveal.card.moon]} saiu da mão de ${room?.seats[reveal.targetSeat ?? 0]?.name} e foi para o descarte.`
    : reveal?.reason === 'blind-discard' ? `A carta descartada às cegas foi ${reveal.card.name} · Lua ${MOON_NAMES[reveal.card.moon]}.`
      : reveal?.reason === 'accelerated' ? `${reveal.card.name} · Lua ${MOON_NAMES[reveal.card.moon]} foi descartada para ativar sua habilidade antes da vaza.`
      : reveal?.card.kind === 'arcana' ? 'Arcana não tem habilidade; a carta foi descartada.'
        : reveal ? `Criatura escolhida: ${reveal.card.name}. A carta foi descartada para usar a habilidade.` : '';
  return <div className="app-shell">
    <header className="site-header">
      <div className="brand-mark">☾</div>
      <div className="brand"><span className="eyebrow">UM JOGO DE VAZAS E LUAS</span><strong>Witch's Trick</strong></div>
      <button className="guide-trigger" type="button" onClick={() => setShowGuide(true)}>☾ Guia rápido</button>
      <div className={`connection ${connected ? 'connected' : ''}`}><span />{connected ? 'Conectado' : 'Reconectando'}</div>
    </header>

    {!room ? <main className="landing">
      <section className="hero">
        <div className="hero-kicker">✦ A NOITE ESCOLHE SEUS ALIADOS ✦</div>
        <h1>Vários destinos.<br /><em>Duas equipes.</em><br />Uma lua.</h1>
        <p>Reúna seus amigos, escolha suas criaturas e dispute cada vaza. Escolha uma partida até 15 ou 25 pontos.</p>
        <p className="creator-credit">Criado por <strong>Valney Maia Neto</strong></p>
        <div className="moon-orbit"><div className="moon-disc">☾</div><span className="orbit-star star-one">✦</span><span className="orbit-star star-two">✧</span></div>
      </section>
      <section className="entry-panel">
        <div className="panel-icon">✧</div><h2>Entre no círculo</h2>
        <p className="muted">Uma partida para 4, 6 ou 8 pessoas, em 2 equipes. Cada dispositivo ou aba representa um jogador.</p>
        <label>SEU NOME<input value={name} onChange={e => setName(e.target.value)} maxLength={24} placeholder="Como devemos chamar você?" /></label>
        <div className="room-options"><label>JOGADORES<select value={playerCount} onChange={event => setPlayerCount(Number(event.target.value) as 4 | 6 | 8)}><option value={4}>4 jogadores</option><option value={6}>6 jogadores</option><option value={8}>8 jogadores</option></select></label><label>VITÓRIA EM<select value={targetScore} onChange={event => setTargetScore(Number(event.target.value) as 15 | 25)}><option value={15}>15 pontos</option><option value={25}>25 pontos</option></select></label></div>
        <button className="primary-button" disabled={!connected || busy} onClick={() => create(false)}>Criar sala <span>→</span></button>
        <div className="divider"><span>ou entre com um código</span></div>
        <div className="join-row"><input aria-label="Código da sala" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={5} placeholder="CÓDIGO" /><button disabled={!connected || busy || code.trim().length !== 5} onClick={join}>Entrar</button></div>
        <button className="text-button" disabled={!connected || busy} onClick={() => create(true)}>Testar sozinho: controlar os {playerCount} assentos</button>
        {error && <p className="error" role="alert">{error}</p>}
      </section>
    </main> : <main className="game-layout">
      <div className="game-topbar"><div><span className="eyebrow">SALA <strong>{room.code}</strong></span><button className="copy-button" onClick={copyCode}>{copied ? 'Copiado ✓' : 'Copiar código'}</button></div><button className="text-button" onClick={leave}>Sair da sala</button></div>
      {room.testMode && game && room.seats.length === 4 && <section className="scenario-panel"><label>TESTAR HABILIDADE <select value={scenarioKind} onChange={event => setScenarioKind(event.target.value as CreatureKind)}>{CREATURES.filter(creature => CREATURE_EFFECTS[creature.kind].available).map(creature => <option value={creature.kind} key={creature.kind}>{creature.name}</option>)}</select></label><button disabled={busy} onClick={() => send('room:testAbility', { kind: scenarioKind, mode: 'trick' })}>Vencer vaza com esta carta</button><button disabled={busy} onClick={() => send('room:testAbility', { kind: scenarioKind, mode: 'declined' })}>Simular Trick recusado</button><label>TESTAR RITUAL <select value={scenarioRitual} onChange={event => setScenarioRitual(event.target.value as RitualKind)}>{RITUALS.map(card => <option value={card.kind} key={card.kind}>{card.name}</option>)}</select></label><button disabled={busy} onClick={() => send('room:testRitual', { kind: scenarioRitual })}>Preparar Ritual</button><small>Reinicia a partida de teste com a carta escolhida na mão do Jogador 1.</small></section>}
      {!game ? <section className="waiting-panel"><div className="waiting-symbol">☽</div><span className="eyebrow">O CÍRCULO SE FORMA</span><h1>Aguardando jogadores</h1><p>Compartilhe o código <strong>{room.code}</strong> para reunir {room.seats.length} pessoas. A vitória será em {room.targetScore} pontos.</p><p className="lobby-tip">Em outro dispositivo ou nova aba, abra o jogo, escolha outro nome e entre com este código. No celular, use o IP do computador na mesma rede Wi-Fi.</p><div className="waiting-seats">{room.seats.map((seat, index) => <div key={index} className={`waiting-seat team-${index % 2 === 0 ? 'a' : 'b'} ${seat ? 'occupied' : ''}`}><span>{seat ? '✦' : '○'}</span><div><strong>{seat?.name || `Assento ${index + 1}`}</strong><small>Equipe {index % 2 === 0 ? 'A' : 'B'} · {seat ? 'pronto' : 'aguardando'}</small></div></div>)}</div><button className="secondary-button" onClick={() => send('room:fillBots', undefined)} disabled={busy}>Preencher vagas com bots</button></section> : <>
        <div className="score-row" aria-label="Placar e vazas da rodada"><section className="scoreboard"><div className="team-score"><span>EQUIPE A · ASSENTOS {room.seats.map((_, index) => index % 2 === 0 ? index + 1 : null).filter(Boolean).join(', ')}</span><strong>{game.scores[0]}</strong><small>✦ Âmbar</small></div><div className="round-medallion"><span>RODADA</span><strong>{game.round}</strong><small>até {game.targetScore} pontos</small></div><div className="team-score team-b"><span>EQUIPE B · ASSENTOS {room.seats.map((_, index) => index % 2 === 1 ? index + 1 : null).filter(Boolean).join(', ')}</span><strong>{game.scores[1]}</strong><small>✦ Verde de poção</small></div></section>
        <section className="vaza-progress" aria-label="Histórico de vazas desta rodada"><div className="vaza-heading"><span className="eyebrow">LUAS DA RODADA</span><strong>Quem venceu cada vaza</strong></div><MoonTrack winners={game.trickWinners} total={game.ritualActive?.kind === 'cartada-fantasma' ? 1 : 3} /><div className="team-legend"><span><i className="legend-a" />Equipe A</span><span><i className="legend-b" />Equipe B</span></div></section>
        </div>
        {game.lastRound && <div className={`last-round-note last-round-team-${game.lastRound.winner}`}><div><span className="eyebrow">RODADA ANTERIOR</span><strong>Equipe {game.lastRound.winner === 0 ? 'A' : 'B'} +{game.lastRound.points} {game.lastRound.points === 1 ? 'ponto' : 'pontos'} {game.lastRound.reason === 'declined' ? '· Trick recusado' : game.lastRound.reason === 'blood-withdrawal' ? '· Acordo de Sangue recusado' : game.lastRound.reason === 'dice' ? '· Vitória no dado' : game.lastRound.reason === 'star' ? '· Estrela Guia' : game.lastRound.trickWinners.length === 1 ? '· Uma vaza' : '· Duas vazas'} {game.lastRound.loserPenalty !== undefined ? `· rival −${game.lastRound.loserPenalty}` : ''} {game.lastRound.winnerPenalty ? `· Escudo −${game.lastRound.winnerPenalty}` : ''}{game.lastRound.bonusPoints ? ` · bônus +${game.lastRound.bonusPoints}` : ''}</strong></div><MoonTrack winners={game.lastRound.trickWinners} compact total={game.lastRound.reason === 'tricks' && game.lastRound.trickWinners.length === 1 ? 1 : 3} /></div>}
        {game.lastRound?.reason === 'dice' && game.lastDiceResult && <div className="ritual-decision"><strong>Resultado do x1 no Dado: Equipe A {game.lastDiceResult.rolls[0]} × {game.lastDiceResult.rolls[1]} Equipe B.</strong></div>}
        {game.lastRound?.starBonusTeam !== undefined && <div className="ritual-decision"><strong>Estrela Guia: Equipe {game.lastRound.starBonusTeam === 0 ? 'A' : 'B'} recebeu 1 ponto pela primeira vaza.</strong></div>}
        {game.wolfTeam !== null && <div className="wolf-notice">🐺 Lobo ativo: a Equipe {game.wolfTeam === 0 ? 'B' : 'A'} não pode usar habilidades nesta rodada.</div>}
        {game.ritualMode && <section className="ritual-panel" aria-label="Rituais da rodada">
          <div className="ritual-panel-heading"><div><span className="eyebrow">BARALHO DE RITUAIS · TESTE 48 DE 48</span><h2>{game.ritualActive ? game.ritualActive.name : `Ritual de ${room.seats[game.ritualChooser]?.name}`}</h2><p>{game.ritualActive ? game.ritualActive.description : game.ritualPhase === 'mode' ? 'Defina se jogará com ou sem olhinho. O poder pendente será resolvido antes de você escolher a carta de Ritual.' : game.ritualPhase === 'blind' ? 'Escolha um Ritual com olhinho antes de revelar as novas criaturas.' : 'Escolha um Ritual para definir esta rodada.'}</p>{game.ritualEmpoweredKind && <p className="ritual-runa-active">✦ {CREATURES.find(creature => creature.kind === game.ritualEmpoweredKind)?.name}: todas as Luas acima das demais cartas nesta rodada.</p>}{game.ritualTargetSeat !== null && <p>🎴 {room.seats[game.ritualTargetSeat]?.name}: {game.ritualActive?.kind === 'mao-cega' ? 'joga sem ver as criaturas' : game.ritualActive?.kind === 'olho-da-verdade' ? 'joga com a mão visível' : 'teve a mão consultada'} nesta rodada.</p>}</div><div className="ritual-header-actions"><button className="ritual-read" onClick={() => setShowRitualHand(true)}>Ver meus Rituais ({displayedRitualHand.length})</button>{game.ritualActive && <div className="ritual-active-actions"><span className="ritual-active-mark">✦ ATIVO</span>{game.ritualActive.image && <button className="ritual-read" onClick={() => setInspectedRitual(game.ritualActive!)}>Ver arte</button>}</div>}</div></div>
          {game.ritualActive?.kind === 'caldeirao-bipolar' && game.ritualBipolarWeakKind && <div className="ritual-decision"><strong>Caldeirão: {CREATURES.find(creature => creature.kind === game.ritualBipolarWeakKind)?.name} é a criatura mais fraca desta vaza em todas as Luas.</strong></div>}
          {game.ritualActive?.kind === 'turbilhao-do-destino' && game.ritualTurbulentDiscards.length > 0 && <div className="ritual-decision"><strong>Turbilhão · criaturas descartadas às cegas</strong><div className="ritual-info-cards">{game.ritualTurbulentDiscards.map(item => <button className="ritual-info-card" key={item.seat} onClick={() => setInspectedCard(item.card)} aria-label={`Ampliar ${item.card.name} descartada por ${room.seats[item.seat]?.name}`}><img src={item.card.image} alt={item.card.name} /><small>{room.seats[item.seat]?.name}</small></button>)}</div><p>A equipe do Ritual já venceu a primeira vaza com essas cartas descartadas.</p></div>}
          {game.ritualActive?.kind === 'forca-oculta' && game.ritualForceRoll !== null && <div className="ritual-decision"><strong>Força Oculta · D6 = {game.ritualForceRoll}</strong><p>Todas as Luas de {CREATURES.find(creature => creature.kind === game.ritualForceKind)?.name} recebem +{game.ritualForceRoll} de força nesta rodada.</p></div>}
          {game.ritualActive?.kind === 'profecia-maia' && game.ritualProphecyNumber !== null && <div className="ritual-decision"><strong>Profecia Maia · número {game.ritualProphecyNumber}</strong><p>As cartas desse valor que estavam na mão da Equipe {game.ritualChooser % 2 === 0 ? 'A' : 'B'} recebem +2 de força.</p></div>}
          {game.ritualDuelSeats && <div className="ritual-decision"><strong>Pacto da Batalha · X1</strong><p>{room.seats[game.ritualDuelSeats[0]]?.name} × {room.seats[game.ritualDuelSeats[1]]?.name}. Os demais jogadores acompanham esta rodada.</p></div>}
          {game.ritualActive?.kind === 'vaza-premiada' && <div className="ritual-decision"><strong>Vaza Premiada · {Number(game.ritualWagerTrickIndex) + 1}ª vaza</strong><p>{game.ritualWagerAwarded ? 'Bônus de 1 ponto recebido.' : 'Se a equipe do Ritual vencer essa vaza, ganha 1 ponto.'}</p></div>}
          {game.ritualActive?.kind === 'eco-temporal' && game.trickWinners.length > 0 && <div className="ritual-decision"><strong>Eco Temporal</strong><p>{game.trickWinners[0] !== game.ritualChooser % 2 ? 'Equipe do Ritual: +2 em todas as criaturas não Arcanas nas vazas 2 e 3.' : 'A equipe venceu a primeira vaza; bônus não ativado.'}</p></div>}
          {game.ritualActive?.kind === 'bencao-das-runas' && game.ritualRuneRoll !== null && <div className="ritual-decision"><strong>Bênção das Runas · D6 = {game.ritualRuneRoll}</strong><p>{game.ritualRuneKind ? `${CREATURES.find(creature => creature.kind === game.ritualRuneKind)?.name} recebe +2, mesmo que mude de mão.` : game.ritualRuneRoll % 2 ? 'Resultado ímpar: sem bônus.' : 'Escolha a criatura que receberá +2.'}</p></div>}
          {game.ritualBondDiscards.length > 0 && <div className="ritual-decision"><strong>Vínculo às Cegas · descartes revelados</strong><div className="ritual-seal-options">{game.ritualBondDiscards.map((item, index) => <button key={`${item.card.id}-${index}`} className="ritual-art-preview" onClick={() => setInspectedCard(item.card)}><img src={item.card.image} alt={`${room.seats[item.seat]?.name} descartou ${item.card.name}`} /></button>)}</div></div>}
          {game.ritualPhase === 'rune-roll' && <div className="ritual-decision"><strong>Bênção das Runas · lance o D6</strong><p>Resultado par: escolha uma criatura física para ganhar +2. O bônus acompanha a carta se ela for trocada.</p>{canRitual && <div className="ritual-panel-actions"><button className="trick-accept" disabled={busy} onClick={() => ritual('rune-roll')}>Lançar D6</button></div>}</div>}
          {game.ritualPhase === 'rune-card' && <div className="ritual-decision"><strong>Escolha uma criatura para a Bênção</strong>{canRitual && <div className="ritual-seal-options">{hand.map(card => <button key={card.id} disabled={busy} onClick={() => ritual('rune-card', { cardId: card.id })}><img src={card.image} alt={card.name} />{card.name} · {MOON_NAMES[card.moon]}</button>)}</div>}</div>}
          {game.ritualPhase === 'bond-choice' && <div className="ritual-decision"><strong>Vínculo às Cegas · escolha 0, 1 ou 2 cartas suas para trocar</strong><p>Você vê sua mão, mas as duas criaturas extras continuam ocultas. Cada carta extra que você não pegar será passada ao próximo adversário, que terá de trocar pelo verso.</p>{canRitual && <div className="bond-choice-row"><div className="ritual-seal-options">{hand.map(card => <button key={card.id} className={bondOwnIds.includes(card.id) ? 'selected' : ''} disabled={busy} onClick={() => setBondOwnIds(ids => ids.includes(card.id) ? ids.filter(id => id !== card.id) : ids.length < 2 ? [...ids, card.id] : ids)}><img src={card.image} alt={card.name} />{bondOwnIds.includes(card.id) ? 'Selecionada para troca' : `${card.name} · ${MOON_NAMES[card.moon]}`}</button>)}</div><div className="ritual-panel-actions"><button className="trick-accept" disabled={busy} onClick={() => ritual('bond-keep', { discardIds: bondOwnIds })}>Confirmar: trocar {bondOwnIds.length} e passar {2 - bondOwnIds.length}</button></div></div>}</div>}
          {game.ritualPhase === 'bond-rival' && <div className="ritual-decision"><strong>Vínculo às Cegas · {room.seats[game.ritualBondTargetSeat ?? 0]?.name} troca {game.ritualBondDrawCount} carta(s) pelo verso</strong><p>Escolha posições sem consultar suas próprias criaturas. As cartas descartadas serão reveladas.</p>{canRitual && <div className="bond-choice-row"><div className="ritual-seal-options">{Array.from({ length: game.players[game.ritualBondTargetSeat ?? 0]?.handCount ?? 0 }, (_, index) => <button key={index} className={bondRivalIndices.includes(index) ? 'selected' : ''} disabled={busy} onClick={() => setBondRivalIndices(indices => indices.includes(index) ? indices.filter(i => i !== index) : indices.length < game.ritualBondDrawCount ? [...indices, index] : indices)}><img src="/cards/verso.png" alt="" />{bondRivalIndices.includes(index) ? 'Selecionada' : `Carta ${index + 1}`}</button>)}</div><div className="ritual-panel-actions"><button className="trick-accept" disabled={busy || bondRivalIndices.length !== game.ritualBondDrawCount} onClick={() => ritual('bond-rival', { indices: bondRivalIndices })}>Confirmar troca oculta</button></div></div>}</div>}
          {game.ritualActive?.kind === 'nevoa-de-sussurros' && !game.ritualMist && game.trick.length === 0 && game.trickHistory.length < 3 && <div className="ritual-decision"><strong>Névoa de Sussurros · escolha uma Lua antes desta vaza</strong><p>Afeta somente desempates entre criaturas de mesmo valor. Pode esperar uma vaza futura.</p>{(room.testMode || game.seat === game.ritualChooser) && <div className="moon-choice-actions">{MOONS.map(moon => <button className="moon-choice" key={moon} disabled={busy} onClick={() => ritual('mist', { moon })}><img src={`/moons/${moon}.png`} alt="" /><span>Lua {MOON_NAMES[moon]}</span></button>)}</div>}</div>}
          {game.ritualActive?.kind === 'todos-por-um' && game.ritualSumTrickIndex === null && <div className="ritual-decision todos-por-um-panel"><div className="todos-copy"><strong>Todos por Um · soma de valores impressos</strong><p>Arcana vale 0. Em empate, vence a equipe do Ritual. Ative nesta vaza, até depois da última jogada.</p></div>{(room.testMode || game.seat === game.ritualChooser) && <div className="todos-actions"><button className="trick-accept" disabled={busy} onClick={() => ritual('sum', { activate: true })}>Usar nesta vaza</button>{game.ritualSumDecision && <button className="todos-save" disabled={busy} onClick={() => ritual('sum', { activate: false })}>Guardar para outra vaza</button>}</div>}</div>}
          {game.ritualGenjutsuDecision && <div className="ritual-decision genjutsu-panel"><strong>Genjutso · a vaza já foi decidida</strong><p>Você pode recuperar qualquer criatura que jogou nesta rodada e que ainda esteja no descarte. Escolha também uma carta da sua mão para descartar. O resultado da vaza continua igual.</p>{(room.testMode || game.seat === game.ritualChooser) && <><div className="genjutsu-steps"><div><strong>1. Recuperar uma carta que você jogou</strong><div className="ritual-seal-options">{game.ritualGenjutsuChoices.map(card => <button className={genjutsuRecoverId === card.id ? 'selected' : ''} key={card.id} disabled={busy} onClick={() => setGenjutsuRecoverId(card.id)}><img src={card.image} alt={card.name} />{card.name} · {MOON_NAMES[card.moon]}</button>)}</div></div><div><strong>2. Descartar uma carta da sua mão</strong><div className="ritual-seal-options">{hand.map(card => <button className={genjutsuDiscardId === card.id ? 'selected' : ''} key={card.id} disabled={busy} onClick={() => setGenjutsuDiscardId(card.id)}><img src={card.image} alt={card.name} />{card.name} · {MOON_NAMES[card.moon]}</button>)}</div></div></div><div className="genjutsu-actions"><button className="trick-accept" disabled={busy || !genjutsuRecoverId || !genjutsuDiscardId} onClick={() => ritual('genjutso', { recoverCardId: genjutsuRecoverId, discardCardId: genjutsuDiscardId })}>Confirmar troca</button><button className="genjutsu-skip" disabled={busy} onClick={() => ritual('genjutso')}>Não usar agora</button></div></>}</div>}
          {ritualPending && game.ritualPhase === 'mode' && <div className="ritual-mode-choice"><strong>{canRitual ? 'Como será o próximo Ritual?' : `Aguardando ${room.seats[game.ritualChooser]?.name} definir a modalidade`}</strong><p>A escolha da modalidade vem antes do poder pendente. Depois você escolhe a carta de Ritual.</p>{canRitual && <div className="ritual-mode-actions"><button disabled={busy || !ritualHand.some(card => card.blind)} onClick={() => ritual('mode', { blind: true })}>Com olhinho · criaturas ocultas</button><button disabled={busy || !ritualHand.some(card => !card.blind)} onClick={() => ritual('mode', { blind: false })}>Sem olhinho · ver criaturas</button></div>}</div>}
          {ritualPending && (game.ritualPhase === 'blind' || game.ritualPhase === 'revealed') && <>
            <div className="ritual-choice-heading"><strong>{canRitual ? 'Escolha um Ritual' : `Aguardando ${room.seats[game.ritualChooser]?.name}`}</strong><small>{game.ritualPhase === 'blind' ? 'Criaturas novas ainda ocultas' : 'Criaturas reveladas apenas aos respectivos donos'}</small></div>
            {canRitual && <div className="ritual-choices">{ritualHand.map(card =>
              <article className={`ritual-choice ${card.blind === (game.ritualPhase === 'blind') ? '' : 'ritual-choice-unavailable'}`} key={card.id}>
                {card.image ? <button className="ritual-art-preview" aria-label={`Ampliar ${card.name}`} onClick={() => setInspectedRitual(card)}><img src={card.image} alt="" /></button> : <div className="ritual-symbol">{card.blind ? '◉̸' : '✦'}</div>}
                <div className="ritual-choice-body"><strong>{card.name}</strong><small>{card.blind ? 'Antes de ver as criaturas' : 'Depois de ver as criaturas'}</small><p>{card.description}</p>
                {card.blind !== (game.ritualPhase === 'blind') ? <span className="ritual-choice-lock">{game.ritualPhase === 'blind' ? game.ritualModeLocked ? 'Indisponível após escolher com olhinho' : 'Revele as criaturas para jogar' : 'Indisponível após revelar as criaturas'}</span>
                  : card.kind === 'mapa-do-destino' ? <div className="ritual-choice-actions"><button disabled={busy} onClick={() => ritual('play', { ritualId: card.id, prediction: '2-0' })}>Prever 2–0</button><button disabled={busy} onClick={() => ritual('play', { ritualId: card.id, prediction: '2-1' })}>Prever 2–1</button></div>
                  : card.kind === 'vaza-premiada' ? <div className="ritual-choice-actions">{[1, 2, 3].map(number => <button key={number} disabled={busy} onClick={() => ritual('play', { ritualId: card.id, trickNumber: number })}>Escolher {number}ª vaza</button>)}</div>
                  : card.kind === 'runa-da-vontade' ? <div className="ritual-runa-choice"><label>Fortalecer criatura<select value={runaCreature} onChange={event => setRunaCreature(event.target.value as CreatureKind)}>{CREATURES.map(creature => <option key={creature.kind} value={creature.kind}>{creature.name}</option>)}</select></label><button disabled={busy} onClick={() => ritual('play', { ritualId: card.id, creatureKind: runaCreature })}>Jogar Runa</button></div>
                  : card.kind === 'forca-oculta' ? <div className="ritual-runa-choice"><label>Criatura de valor 1 a 6<select value={forceCreature} onChange={event => setForceCreature(event.target.value as CreatureKind)}>{CREATURES.filter(creature => creature.value >= 1 && creature.value <= 6).map(creature => <option key={creature.kind} value={creature.kind}>{creature.name} · {creature.value}</option>)}</select></label><button disabled={busy} onClick={() => ritual('play', { ritualId: card.id, creatureKind: forceCreature })}>Escolher e lançar depois</button></div>
                  : card.kind === 'profecia-maia' ? <div className="ritual-choice-actions" aria-label="Anuncie um número de 1 a 9">{Array.from({ length: 9 }, (_, index) => <button key={index} disabled={busy} onClick={() => ritual('play', { ritualId: card.id, numberValue: index + 1 })}>{index + 1}</button>)}</div>
                    : ['mao-cega', 'roubo-arcano', 'olho-da-verdade'].includes(card.kind) ? <div className="ritual-choice-actions">{room.seats.map((seat, index) => index % 2 !== game.ritualChooser % 2 && <button key={index} disabled={busy} onClick={() => ritual('play', { ritualId: card.id, targetSeat: index })}>{card.kind === 'mao-cega' ? 'Cegar' : card.kind === 'roubo-arcano' ? 'Ver mão de' : 'Revelar mão de'} {seat?.name}</button>)}</div>
                      : card.kind === 'pacto-da-batalha' ? <div className="ritual-pact-choice"><label>Nosso duelista<select value={pactAlly} onChange={event => setPactAllySeat(Number(event.target.value))}>{room.seats.map((seat, index) => index % 2 === game.ritualChooser % 2 && <option key={index} value={index}>{seat?.name}</option>)}</select></label><label>Duelista rival<select value={pactOpponent} onChange={event => setPactOpponentSeat(Number(event.target.value))}>{room.seats.map((seat, index) => index % 2 !== game.ritualChooser % 2 && <option key={index} value={index}>{seat?.name}</option>)}</select></label><button disabled={busy} onClick={() => ritual('play', { ritualId: card.id, allySeat: pactAlly, targetSeat: pactOpponent })}>Confirmar X1</button></div>
                      : <button disabled={busy || (card.kind === 'magia-acelerada' && !hand.some(creature => creature.kind !== 'arcana'))} onClick={() => ritual('play', { ritualId: card.id })}>Jogar Ritual</button>}
                </div>
              </article>
            )}</div>}
            {canRitual && game.ritualPhase === 'blind' && !game.ritualModeLocked && ritualHand.some(card => !card.blind) && <button className="secondary-button ritual-reveal" disabled={busy} onClick={() => ritual('reveal')}>Ver minhas criaturas para escolher outro Ritual</button>}
          </>}
          {ritualPending && (game.ritualPhase === 'blind-discard' || game.ritualPhase === 'revealed-discard') && <div className="ritual-discard"><strong>{game.ritualPhase === 'blind-discard' ? 'Titereiro: descarte uma criatura nova pelo verso, sem ver' : 'Titereiro: escolha uma das três criaturas novas para descartar'}</strong>{canRitual && <div className="ritual-discard-options">{game.ritualDiscardOptions.map((option, index) => <div key={option.value}>{option.card && <button className="ritual-discard-preview" onClick={() => setInspectedCard(option.card!)}><img src={option.card.image} alt="" /></button>}<button disabled={busy} onClick={() => ritual('discard', { choice: option.value })}>{option.card ? `Descartar ${option.card.name} · Lua ${MOON_NAMES[option.card.moon]}` : `Descartar carta oculta ${index + 1}`}</button></div>)}</div>}</div>}
          {game.ritualPhase === 'seal' && <div className="ritual-decision"><strong>Feitiço Oculto · {room.seats[ritualActor ?? 0]?.name} escolhe a carta reservada</strong><p>Escolha a posição 1, 2 ou 3 sem ver a criatura. Ela ficará escondida até a terceira vaza. As outras duas serão reveladas depois que todos escolherem.</p>{canRitual && <div className="ritual-seal-options">{Array.from({ length: (game.players[ritualActor ?? 0]?.handCount ?? 0) - (game.players[ritualActor ?? 0]?.sealedCount ?? 0) }, (_, index) => <HiddenCard key={index} index={index} action="Separar" onClick={() => ritual('seal', { index })} disabled={busy} />)}</div>}</div>}
          {game.ritualPhase === 'champions' && <div className="ritual-decision">
            <strong>Campeões Ocultos · escolha uma carta de {room.seats[game.ritualChampionTargetSeat ?? 0]?.name}</strong>
            <p>As mãos continuam ocultas. Escolha uma posição pelo verso para cada jogador; as demais criaturas serão descartadas e uma única vaza decidirá a rodada.</p>
            <small>{game.ritualChampionChosenSeats.length} de {room.seats.length} campeões escolhidos</small>
            {canRitual && game.ritualChampionTargetSeat !== null && <div className="ritual-seal-options">{Array.from({ length: game.players[game.ritualChampionTargetSeat]?.handCount ?? 0 }, (_, index) => <HiddenCard key={index} index={index} action={`Escolher para ${room.seats[game.ritualChampionTargetSeat!]?.name}`} onClick={() => ritual('champion', { index })} disabled={busy} />)}</div>}
          </div>}
          {game.ritualPhase === 'force-roll' && <div className="ritual-decision"><strong>Força Oculta · {CREATURES.find(creature => creature.kind === game.ritualForceKind)?.name}</strong><p>{room.seats[game.ritualChooser]?.name} lança o D6 na mesa. O resultado aumenta a força de todas as Luas dessa criatura nesta rodada.</p></div>}
          {game.ritualPhase === 'ancient-discard' && <div className="ritual-discard"><strong>Escolha da Anciã: {room.seats[game.ancientDiscardSeat ?? 0]?.name} descarta 3 criaturas</strong><p>As cartas extras já foram compradas. Cada jogador da equipe escolhe três descartes na própria mão antes da primeira vaza.</p></div>}
          {game.ritualPhase === 'mirror' && <div className="ritual-decision">
            <strong>Espelho Enfeitiçado: {room.seats[ritualActor ?? 0]?.name} decide a troca</strong>
            <p>Cada parceiro pode trocar sua mão inteira. Um adversário já escolhido não pode ser escolhido de novo.</p>
            {canRitual && <div className="ritual-mode-actions"><button disabled={busy} onClick={() => ritual('mirror')}>Manter minha mão</button>{room.seats.map((seat, index) => index % 2 !== game.ritualChooser % 2 && !game.ritualMirrorTargets.includes(index) && <button key={index} disabled={busy} onClick={() => ritual('mirror', { targetSeat: index })}>Trocar com {seat?.name}</button>)}</div>}
          </div>}
          {game.ritualPhase === 'fortune' && <div className="ritual-decision">
            <strong>Troca de Sortes: {room.seats[ritualActor ?? 0]?.name} decide</strong>
            <p>Escolha uma criatura sua; depois toque em uma carta virada da mão adversária. Você não verá qual é até recebê-la. A troca não será anunciada na mesa.</p>
            {canRitual && <><div className="ritual-mode-actions"><button disabled={busy} onClick={() => ritual('fortune')}>Não trocar</button></div><strong>1. Escolha a criatura que vai entregar</strong><div className="ritual-fortune-cards">{fortuneHand.map(card => <button className={`ritual-fortune-own ${selectedFortuneCard?.id === card.id ? 'selected' : ''}`} key={card.id} aria-pressed={selectedFortuneCard?.id === card.id} onClick={() => setFortuneOwnCardId(card.id)}><img src={card.image} alt="" /><span>{card.name} · {MOON_NAMES[card.moon]}</span></button>)}</div><strong>2. Escolha um adversário e uma carta virada da mão dele</strong><div className="ritual-fortune-opponents">{room.seats.map((player, seat) => seat % 2 !== (ritualActor ?? 0) % 2 && (game.players[seat]?.handCount ?? 0) > 0 && <section className="ritual-fortune-opponent" key={seat} aria-label={`Mão virada de ${player?.name}`}><strong>{player?.name}</strong><div className="ritual-fortune-opponent-cards">{Array.from({ length: game.players[seat]?.handCount ?? 0 }, (_, index) => <HiddenCard key={index} index={index} action={`Receber de ${player?.name}`} onClick={selectedFortuneCard ? () => ritual('fortune', { cardId: selectedFortuneCard.id, targetSeat: seat, targetIndex: index }) : undefined} disabled={busy} />)}</div></section>)}</div>{!selectedFortuneCard && <small>Selecione primeiro uma criatura sua para liberar as cartas viradas.</small>}</>}
          </div>}
          {game.ritualPhase === 'permutation' && <div className="ritual-decision">
            <strong>Permuta Profana · {room.seats[ritualActor ?? 0]?.name} escolhe</strong>
            <p>Cada pessoa passa uma criatura ao adversário do assento seguinte. As cartas só mudam de mão quando todos terminarem de escolher.</p>
            <div className="ritual-mode-actions">{room.seats.map((player, seat) => <span key={seat}>{player?.name}: {game.ritualPermutationChosenSeats.includes(seat) ? 'escolheu' : 'aguardando'}</span>)}</div>
            {canRitual && <div className="ritual-fortune-cards">{permutationHand.map(card => <button className="ritual-fortune-own" key={card.id} disabled={busy} onClick={() => ritual('permutation', { cardId: card.id })}><img src={card.image} alt="" /><span>Passar {card.name} · {MOON_NAMES[card.moon]}</span></button>)}</div>}
          </div>}
          {game.ritualPhase === 'accelerate' && <div className="ritual-decision">
            <strong>Magia Acelerada · {room.seats[game.ritualChooser]?.name} escolhe a criatura</strong>
            <p>Descarte uma criatura da sua mão, exceto Arcana. A habilidade entra agora; você passa a primeira vaza e volta a jogar na segunda.</p>
            {canRitual && <div className="ritual-fortune-cards">{accelerateHand.filter(card => card.kind !== 'arcana').map(card => <button className="ritual-fortune-own" key={card.id} disabled={busy} onClick={() => ritual('accelerate', { cardId: card.id })}><img src={card.image} alt="" /><span>Usar {card.name} · {MOON_NAMES[card.moon]}</span></button>)}</div>}
          </div>}
          {game.ritualPhase === 'dice' && <div className="ritual-decision">
            <strong>x1 no Dado · a maior face vence a rodada</strong>
            <p>Equipe A: {game.ritualDiceRolls[0] ?? 'aguardando'} · Equipe B: {game.ritualDiceRolls[1] ?? 'aguardando'}. Qualquer integrante pode lançar uma vez pela própria equipe.</p>
            {game.lastDiceResult?.round === game.round && game.lastDiceResult.winner === null && <p>Empate em {game.lastDiceResult.rolls[0]} a {game.lastDiceResult.rolls[1]}. Lancem novamente.</p>}
            {canRoll && <div className="ritual-mode-actions"><button disabled={busy} onClick={() => ritual('roll')}>Lançar dado pela Equipe {rollTeam === 0 ? 'A' : 'B'}</button></div>}
          </div>}
          {game.ritualActive?.kind === 'estrela-guia' && game.ritualStarAwardedTeam !== null && <div className="ritual-decision"><strong>Estrela Guia: Equipe {game.ritualStarAwardedTeam === 0 ? 'A' : 'B'} ganhou 1 ponto pela primeira vaza.</strong></div>}
          {game.ritualPhase === 'blood-vote' && <div className="ritual-decision">
            <strong>Acordo de Sangue: {room.seats[ritualActor ?? 0]?.name} decide</strong>
            <p>A equipe precisa de {game.ritualVotesNeeded} votos favoráveis para jogar por 3 pontos. Se não conseguir a maioria, o rival ganha 1 ponto. Votos a favor: {game.ritualVotesFor}; votos dados: {game.ritualVotesCast}.</p>
            {bloodSharedHands.map(shared => <div key={shared.seat}><small>Mão de {room.seats[shared.seat]?.name}</small><div className="ritual-info-cards">{shared.cards.map(card => <button className="ritual-info-card" key={card.id} onClick={() => setInspectedCard(card)} aria-label={`Ampliar ${card.name}`}><img src={card.image} alt={card.name} /></button>)}</div></div>)}
            {canRitual && <div className="ritual-mode-actions"><button disabled={busy} onClick={() => ritual('blood', { play: true })}>Votar para jogar por 3 pontos</button><button disabled={busy} onClick={() => ritual('blood', { play: false })}>Votar por desistir</button></div>}
          </div>}
          {game.ritualPhase === 'destiny-vote' && <div className="ritual-decision">
            <strong>Revelação do Destino: {room.seats[ritualActor ?? 0]?.name} decide</strong>
            <p>Todos os {game.ritualVotesNeeded} aliados precisam concordar. Se alguém recusar, ninguém descarta. Aprovações: {game.ritualVotesFor}; decisões: {game.ritualVotesCast}.</p>
            {canRitual && <div className="ritual-mode-actions"><button disabled={busy} onClick={() => ritual('destiny', { approve: true })}>Concordar em trocar a mão</button><button disabled={busy} onClick={() => ritual('destiny', { approve: false })}>Manter todas as mãos</button></div>}
          </div>}
          {game.ritualActive?.kind === 'roubo-arcano' && (room.testMode || game.seat === game.ritualChooser) && <div className="ritual-decision"><strong>Roubo Arcano: mão de {room.seats[game.ritualTargetSeat ?? 0]?.name} no momento do Ritual</strong><div className="ritual-info-cards">{game.ritualPeekCards.map(card => <button className="ritual-info-card" key={card.id} onClick={() => setInspectedCard(card)} aria-label={`Ampliar ${card.name}`}><img src={card.image} alt={card.name} /></button>)}</div></div>}
          {game.ritualActive?.kind === 'olho-da-verdade' && game.ritualTargetSeat !== null && <div className="ritual-decision"><strong>Olho da Verdade: mão visível de {room.seats[game.ritualTargetSeat]?.name}</strong><div className="ritual-info-cards">{game.players[game.ritualTargetSeat]?.visibleHand?.map(card => <button className="ritual-info-card" key={card.id} onClick={() => setInspectedCard(card)} aria-label={`Ampliar ${card.name}`}><img src={card.image} alt={card.name} /></button>)}</div></div>}
          {visionSharedHands.length > 0 && <div className="ritual-decision"><strong>Visão Compartilhada · mãos dos parceiros</strong>{visionSharedHands.map(shared => <div key={shared.seat}><small>{room.seats[shared.seat]?.name} · {shared.cards.length} {shared.cards.length === 1 ? 'criatura' : 'criaturas'}</small><div className="ritual-info-cards">{shared.cards.map(card => <button className="ritual-info-card" key={card.id} onClick={() => setInspectedCard(card)} aria-label={`Ampliar ${card.name} de ${room.seats[shared.seat]?.name}`}><img src={card.image} alt={card.name} /></button>)}</div></div>)}</div>}
        </section>}
        {game.winner !== null && <div className="winner-banner">✦ A Equipe {game.winner === 0 ? 'A' : 'B'} venceu a partida! ✦</div>}
        <div className="turn-banner">{game.winner !== null ? 'Partida encerrada' : game.pendingAbility ? canAbility ? `Habilidade: ${abilityStageText[game.pendingAbility.stage]}` : `Aguardando ${room.seats[game.pendingAbility.seat]?.name} decidir a habilidade` : game.ritualPhase === 'dice' ? canRoll ? 'Sua equipe pode lançar o dado' : 'Aguardando o lançamento da outra equipe' : game.ritualPhase === 'ancient-discard' ? canAncientDiscard ? 'Anciã: escolha uma criatura para descartar' : `Aguardando ${room.seats[game.ancientDiscardSeat ?? 0]?.name} descartar` : ritualPending ? canRitual ? game.ritualPhase.endsWith('discard') ? 'Escolha o descarte do Titereiro' : game.ritualPhase === 'seal' ? 'Escolha uma carta pelo verso para a terceira vaza' : game.ritualPhase === 'mirror' ? 'Decida a troca do Espelho' : game.ritualPhase === 'fortune' ? 'Escolha uma criatura para trocar ou passe' : game.ritualPhase === 'permutation' ? 'Escolha uma criatura para passar à direita' : game.ritualPhase === 'blood-vote' ? 'Decida o Acordo de Sangue' : game.ritualPhase === 'destiny-vote' ? 'Vote na Revelação do Destino' : 'Escolha o Ritual da rodada' : `Aguardando ${room.seats[ritualActor ?? game.ritualChooser]?.name} decidir ${game.ritualPhase.endsWith('discard') ? 'o descarte' : game.ritualPhase === 'seal' ? 'a carta oculta' : game.ritualPhase === 'mirror' ? 'a troca do Espelho' : game.ritualPhase === 'fortune' ? 'a Troca de Sortes' : game.ritualPhase === 'permutation' ? 'a Permuta Profana' : game.ritualPhase === 'blood-vote' ? 'o Acordo de Sangue' : game.ritualPhase === 'destiny-vote' ? 'a Revelação do Destino' : 'o Ritual'}` : game.pendingChallenge ? canRespond ? `Sua decisão: ${trickNames[game.pendingChallenge.level]}` : `Aguardando ${room.seats[game.pendingChallenge.responderSeat]?.name} responder ao ${trickNames[game.pendingChallenge.level]}` : game.ritualWeakeningDecision ? `Aguardando ${room.seats[game.ritualChooser]?.name} decidir Enfraquecer` : secretTrick ? myTurn ? 'Escolha sua criatura em segredo; peça Trick antes de confirmar' : alreadyCommitted ? 'Carta confirmada; aguardando os demais' : 'Aguardando as escolhas secretas' : room.testMode ? `Sua vez de controlar ${room.seats[game.turn]?.name}` : myTurn ? 'Sua vez de jogar' : `Vez de ${room.seats[game.turn]?.name}`}{game.lastTrickWinner !== null && <small>Última vaza: {room.seats[game.lastTrickWinner]?.name}</small>}</div>
        {game.pendingAbility && canAbility && createPortal(<div className="ability-dialog-backdrop"><section className="ability-panel ability-choice-panel ability-dialog" ref={abilityDialogRef} role="dialog" aria-modal="true" aria-labelledby="ability-dialog-title" tabIndex={-1}>
          <div className="ability-intro">
            <div className="ability-dialog-header"><span className="eyebrow">PODER DE CRIATURA</span>{displayedRitualHand.length > 0 && <button className="ability-ritual-link" type="button" onClick={() => setShowRitualHand(true)}>Ver meus Rituais</button>}</div>
            <strong id="ability-dialog-title">{room.seats[game.pendingAbility.seat]?.name}: {abilityStageText[game.pendingAbility.stage]}</strong>
            {game.pendingAbility.card && <p>{game.pendingAbility.card.name}: {CREATURE_EFFECTS[game.pendingAbility.card.kind].description}</p>}
            <p className="ability-timing">{game.pendingAbility.stage === 'puppet-exchange' ? 'A carta recuperada já está na sua mão. Descarte outra carta para concluir a troca.' : game.pendingAbility.appliesNextRound ? 'A decisão é agora. O efeito entra no início da próxima rodada.' : game.pendingAbility.source === 'ritual' ? 'Magia Acelerada: resolva agora, antes da primeira vaza.' : ritualPending ? 'Resolva esta habilidade antes da escolha do Ritual.' : 'O efeito entra antes da próxima vaza.'}{game.pendingAbility.repeatsLeft > 1 ? ' Magia Duplicada: depois haverá uma segunda aplicação.' : ''}</p>
            {canAbility && game.abilityOptions.some(option => option.card || option.ritual) && <p className="ability-choice-help">Toque na arte para ler a carta ampliada. Depois escolha a ação.</p>}
            {error && <p className="error" role="alert">{error}</p>}
          </div>
          {canAbility && <div className="ability-options">{game.abilityOptions.map(option => {
            const hidden = !option.card && !option.ritual && /carta oculta/i.test(option.label);
            if (!option.card && !option.ritual && !hidden) {
              return <button className="ability-plain-choice" type="button" key={option.value} disabled={busy} onClick={() => chooseAbility(option.value)}>{option.seat !== undefined ? room.seats[option.seat]?.name : option.label}</button>;
            }
            const title = option.card ? option.card.name + ' · Lua ' + MOON_NAMES[option.card.moon] : option.ritual ? option.ritual.name : 'Carta oculta ' + (Number(option.value) + 1);
            const description = option.card ? CREATURE_EFFECTS[option.card.kind].description : option.ritual ? option.ritual.description : 'Escolha pelo verso, sem consultar a criatura.';
            return <article className="ability-choice-card" key={option.value}>
              {hidden ? <div className="ability-choice-art ability-choice-hidden" aria-hidden="true"><img src="/cards/verso.png" alt="" /></div> : <button className="ability-choice-art" type="button" onClick={() => option.card ? setInspectedCard(option.card!) : setInspectedRitual(option.ritual!)} aria-label={'Ler ' + title + ' ampliado'}>{(option.card?.image || option.ritual?.image) ? <img src={option.card?.image || option.ritual?.image} alt="" /> : <span>{title}</span>}</button>}
              <div className="ability-choice-details">
                <strong>{title}</strong>
                <p>{description}</p>
                <button className="ability-select" type="button" disabled={busy} onClick={() => chooseAbility(option.value)}>{hidden ? option.label : abilityCardActions[game.pendingAbility!.stage] || option.label}</button>
              </div>
            </article>;
          })}{game.pendingAbility?.stage === 'source' && sealedFinal && sealedCount > 0 && <div className="ability-sealed-option"><HiddenCard index={0} action="Revelar para usar poder" onClick={() => chooseAbility('sealed')} disabled={busy} /><strong>Carta reservada para a 3ª vaza</strong></div>}</div>}
        </section></div>, document.body)}
        {reveal && <section className="creature-reveal" role="status" aria-label="Última criatura revelada"><div className="creature-reveal-copy"><span className="eyebrow">REVELAÇÃO · RODADA {reveal.round}</span><strong>{revealTitle}</strong><p>{revealDescription}</p></div><div className="creature-reveal-cards">{reveal.tradedCard && <div><span>Entregou</span><button onClick={() => setInspectedCard(reveal.tradedCard!)} aria-label={`Ampliar ${reveal.tradedCard.name}`}><img src={reveal.tradedCard.image} alt={reveal.tradedCard.name} /></button></div>}<div><span>{reveal.reason === 'goblin' ? 'Recebeu' : reveal.reason === 'blind-discard' || reveal.reason === 'fairy' ? 'Descartou' : 'Revelou'}</span><button onClick={() => setInspectedCard(reveal.card)} aria-label={`Ampliar ${reveal.card.name}`}><img src={reveal.card.image} alt={reveal.card.name} /></button></div></div></section>}
        <section className="trick-panel"><div><span className="eyebrow">APOSTA DA RODADA</span><strong>{game.roundStake} {game.roundStake === 1 ? 'ponto' : 'pontos'}</strong>{game.pendingChallenge && <small>{room.seats[game.pendingChallenge.challengerSeat]?.name} pediu {trickNames[game.pendingChallenge.level]} · partida por {pendingTrickPoints} pontos se aceitar</small>}</div>{game.pendingChallenge ? <div className="trick-actions"><button className="trick-accept" disabled={!canRespond || busy} onClick={() => respond(true)}>Aceitar · partida {pendingTrickPoints} pontos</button><button className="trick-decline" disabled={!canRespond || busy} onClick={() => respond(false)}>Recusar · rival ganha {game.roundStake}</button>{game.pendingChallenge.level < 4 && <button className="trick-counter" disabled={!canCounter || busy} onClick={counter}>{trickNames[(game.pendingChallenge.level + 1) as 3 | 4]} · {trickPoints(game.roundBaseStake, (game.pendingChallenge.level + 1) as 3 | 4)} pontos</button>}</div> : game.acceptedTrickLevel < 4 && <button className="trick-raise" disabled={!canRaise || busy} onClick={raise}>{trickNames[nextTrickLevel]} · {trickPoints(game.roundBaseStake, nextTrickLevel)} pontos</button>}</section>
        {game.ritualActive?.kind === 'enfraquecer' && !game.ritualWeakeningUsed && game.trick.some(play => play.seat % 2 !== game.ritualChooser % 2 && play.card?.kind !== 'arcana') && <section className="weakening-panel"><div><strong>Enfraquecer · uma vez nesta rodada</strong><p>{game.ritualWeakeningDecision ? 'Todos jogaram. Escolha uma criatura rival para reduzir em 2 antes de decidir a vaza, ou guarde o poder para outra vaza.' : 'Você pode reduzir uma criatura rival já jogada em 2 pontos de força.'}</p></div><div className="weakening-options">{canWeaken && game.trick.filter(play => play.seat % 2 !== game.ritualChooser % 2 && play.card && play.card.kind !== 'arcana').map(play => <button key={play.seat} disabled={busy} onClick={() => ritual('weaken', { targetSeat: play.seat })}>−2 em {room.seats[play.seat]?.name}: {play.card?.name}</button>)}{canWeaken && game.ritualWeakeningDecision && <button disabled={busy} onClick={() => ritual('weaken')}>Guardar para outra vaza</button>}</div></section>}
        <section className={`table-area players-${room.seats.length} ${game.trick.length ? '' : 'table-empty'} ${showDiceStage ? 'dice-active' : ''} ${game.pendingChallenge ? 'challenge-open' : ''}`}>
          <div className="table-glow" />
          <div className="table-center">
            <div className="table-title">{showForceStage ? 'FORÇA OCULTA' : showX1Stage ? 'X1 NO DADO' : showRuneStage ? 'BÊNÇÃO DAS RUNAS' : 'A VAZA'}</div>
            {showX1Stage && <div className="dice-stage" role="status" aria-live="polite"><div className="dice-matchup"><DieFace team={0} value={displayedDiceRolls[0] ?? null} round={game.round} /><span className="dice-versus">×</span><DieFace team={1} value={displayedDiceRolls[1] ?? null} round={game.round} /></div><strong className="dice-stage-result">{game.ritualPhase === 'dice' ? game.lastDiceResult?.round === game.round && game.lastDiceResult.winner === null && game.ritualDiceRolls.every(roll => roll === null) ? 'Empate! Lancem novamente.' : game.ritualDiceRolls.every(roll => roll !== null) ? 'Comparando resultados…' : 'Cada equipe lança seu dado.' : game.lastDiceResult?.winner === null ? 'Empate! Lancem novamente.' : `Equipe ${game.lastDiceResult?.winner === 0 ? 'A' : 'B'} venceu o x1 no Dado!`}</strong>{canRoll && <button className="dice-roll-button" disabled={busy} onClick={() => ritual('roll')}>Lançar dado pela Equipe {rollTeam === 0 ? 'A' : 'B'}</button>}</div>}
            {showForceStage && <div className="dice-stage force-dice-stage" role="status" aria-live="polite">
              <DieFace team={game.ritualChooser % 2 as Team} value={game.ritualForceRoll} round={game.round} label={CREATURES.find(creature => creature.kind === game.ritualForceKind)?.name ?? 'Criatura escolhida'} />
              <strong className="dice-stage-result">{game.ritualForceRoll === null ? `${room.seats[game.ritualChooser]?.name} vai lançar o D6` : `+${game.ritualForceRoll} de força em todas as Luas desta criatura`}</strong>
              {game.ritualPhase === 'force-roll' && canRitual && <button className="dice-roll-button" disabled={busy} onClick={() => ritual('force-roll')}>Lançar D6</button>}
            </div>}
            {showRuneStage && <div className="dice-stage force-dice-stage" role="status" aria-live="polite"><DieFace team={game.ritualChooser % 2 as Team} value={game.ritualRuneRoll} round={game.round} label="Bênção das Runas" /><strong className="dice-stage-result">{game.ritualRuneRoll === null ? 'Lance o D6' : game.ritualRuneRoll % 2 === 0 ? 'Par: escolha uma criatura para +2' : 'Ímpar: sem bônus'}</strong>{game.ritualPhase === 'rune-roll' && canRitual && <button className="dice-roll-button" disabled={busy} onClick={() => ritual('rune-roll')}>Lançar D6</button>}</div>}
            <div className="played-cards">{game.trick.length ? game.trick.map(play => <div className={`played-card team-${play.seat % 2 === 0 ? 'a' : 'b'}`} key={play.seat}>{play.card ? <Card card={play.card} /> : <HiddenCard index={0} />}<small>{room.seats[play.seat]?.name}{game.ritualWeakenedSeat === play.seat ? ' · −2' : ''}</small>{play.card && <button className="card-read" onClick={() => setInspectedCard(play.card!)}>Ler carta</button>}</div>) : !showDiceStage && <div className="empty-trick">☽<span>A próxima carta inicia a vaza</span></div>}</div>
          {visibleTricks.length > 0 && <section className="trick-history" aria-label={historyFromPreviousRound ? 'Cartas das vazas da rodada anterior' : 'Cartas das vazas desta rodada'}>
            <span className="trick-history-label">{historyFromPreviousRound ? 'VAZAS DA RODADA ANTERIOR' : 'VAZAS CONCLUÍDAS'}</span>
            <div className="trick-history-list">{visibleTricks.map((trick, index) => <div className={`history-trick team-${trick.winnerTeam === 0 ? 'a' : 'b'}`} key={index}>
              <strong>Vaza {index + 1} · {trick.synthetic ? 'Turbilhão: vitória concedida' : room.seats[trick.winnerSeat]?.name} · Equipe {trick.winnerTeam === 0 ? 'A' : 'B'}</strong>
              <div className="history-cards">{trick.plays.map(play => <button className={`history-card team-${play.seat % 2 === 0 ? 'a' : 'b'} ${!trick.synthetic && play.seat === trick.winnerSeat ? 'winning-card' : ''}`} key={play.seat} onClick={() => setInspectedCard(play.card)} title={`${room.seats[play.seat]?.name}: ${play.card.name}${trick.weakenedSeat === play.seat ? ' (−2)' : ''}`} aria-label={`Vaza ${index + 1}: ${room.seats[play.seat]?.name} ${trick.synthetic ? 'descartou' : 'jogou'} ${play.card.name}${trick.weakenedSeat === play.seat ? ' com força reduzida em 2' : ''}${!trick.synthetic && play.seat === trick.winnerSeat ? ' e venceu' : ''}. Ampliar carta`}>
                <img src={play.card.image} alt="" /><span>{room.seats[play.seat]?.name}{trick.weakenedSeat === play.seat ? ' −2' : ''}</span>
              </button>)}</div>
            </div>)}</div>
          </section>}</div>
          <div className="table-seats">{room.seats.map((seat, index) => <div className={`table-seat team-${index % 2 === 0 ? 'a' : 'b'} ${(game.pendingAbility?.seat ?? game.pendingChallenge?.responderSeat ?? game.turn) === index && game.winner === null ? 'active-seat' : ''} ${controlledSeat === index ? 'own-seat' : ''} ${game.players[index]?.skipsNextTrick ? 'skipping-seat' : ''}`} key={index}><div className="seat-token">{seat?.name.charAt(0).toUpperCase() || '?'}</div><div><strong>{seat?.name}</strong><small>Equipe {index % 2 === 0 ? 'A' : 'B'} · {game.players[index]?.handCount} cartas {game.players[index]?.skipsNextTrick ? '· passa esta vaza ' : ''}{seat?.online ? '' : '· offline'}</small></div></div>)}</div>
        </section>
        <section className="hand-area"><div className="hand-heading"><div><span className="eyebrow">{room.testMode ? `MÃO DE ${room.seats[handSeat ?? 0]?.name?.toUpperCase()}` : 'SUAS CARTAS'}</span><h2>{game.pendingAbility ? canAbility ? 'Decida a habilidade' : 'Aguarde a habilidade' : game.ritualPhase === 'ancient-discard' ? 'Escolha três descartes' : ritualPending ? 'Preparando a rodada' : game.pendingChallenge ? 'Decida o Trick' : 'Escolha sua criatura'}</h2></div><span className="hand-hint">{game.ritualPhase === 'ancient-discard' ? 'Cada jogador da equipe descarta três criaturas' : blindControlled && !ritualPending ? 'Escolha uma posição sem ver a criatura' : game.pendingAbility ? canAbility ? 'Escolha uma opção na janela de habilidade' : 'Aguarde a decisão' : ritualPending ? ['mode', 'blind', 'blind-discard'].includes(game.ritualPhase) ? 'As criaturas novas continuam ocultas' : 'O Ritual será decidido antes da primeira vaza' : game.pendingChallenge ? room.testMode ? `Agora quem responde é ${room.seats[game.pendingChallenge.responderSeat]?.name}` : canRespond ? 'Escolha aceitar, recusar ou aumentar' : 'Aguarde a resposta ao Trick' : myTurn ? sealedFinal ? 'Terceira vaza: jogue a criatura separada pelo verso' : mindControlled ? 'Controle Mental: aguarde o adversário à esquerda sortear sua carta' : 'Toque em uma carta para jogar' : 'Aguarde sua vez'}</span></div>
          <div className="hand-cards">
            {blindControlled && game.ritualPhase === 'play' ? Array.from({ length: blindHandCount }, (_, index) => <div className="hand-card" key={index}><HiddenCard index={index} action={game.pendingAbility?.stage === 'source' ? 'Revelar' : 'Jogar'} onClick={game.pendingAbility?.stage === 'source' && canAbility ? () => chooseAbility(String(index)) : myTurn && !mindControlled ? () => play(String(index)) : undefined} disabled={busy} /></div>) : <>{hand.map(card => <div className="hand-card" key={card.id}><Card card={card} onClick={myTurn && !mindControlled && !sealedFinal ? () => play(card.id) : undefined} disabled={busy} />{canAncientDiscard ? <button className="card-discard" disabled={busy} onClick={() => ritual('ancient-discard', { cardId: card.id })}>Descartar {card.name}</button> : <button className="card-read" onClick={() => setInspectedCard(card)}>Ler carta</button>}</div>)}{Array.from({ length: hiddenPreparationCount }, (_, index) => <div className="hand-card" key={`hidden-${index}`}><HiddenCard index={index} action="Descartar" onClick={game.ritualPhase === 'blind-discard' && canRitual ? () => ritual('discard', { choice: String(index) }) : undefined} disabled={busy} /></div>)}</>}
            {sealedCount > 0 && game.ritualActive?.kind === 'feitico-oculto' && <div className="hand-card"><HiddenCard index={0} action={game.pendingAbility?.stage === 'source' ? 'Revelar para usar poder' : 'Jogar carta separada'} onClick={sealedFinal && game.pendingAbility?.stage === 'source' && canAbility ? () => chooseAbility('sealed') : sealedFinal && myTurn ? () => play('sealed') : undefined} disabled={busy} /><small className="sealed-card-label">Separada para a 3ª vaza</small></div>}
          </div>
          {mindControlledTurn && game.ritualPhase === 'play' && <div className="mind-control-action"><p>Controle Mental: {room.seats[game.turn]?.name} decide se pede Trick e entrega a jogada. Depois, {room.seats[mindController ?? 0]?.name} sorteia uma criatura da mão dele.</p>{(room.testMode || game.seat === game.turn) && !game.mindControlReady && <button className="secondary-button" disabled={!myTurn || busy} onClick={mindReady}>Não pedir Trick · entregar jogada</button>}{(room.testMode || game.seat === mindController) && <button className="secondary-button" disabled={!canMindChoose || busy} onClick={() => play('random')}>Sortear criatura de {room.seats[game.turn]?.name}</button>}{game.mindControlReady && <small>Jogada entregue. Aguardando sorteio.</small>}</div>}
        </section>
      </>}
      {error && <p className="error game-error" role="alert">{error}</p>}
    </main>}
    {showGuide && <div className="card-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowGuide(false); }}><section className="quick-guide" role="dialog" aria-modal="true" aria-labelledby="quick-guide-title"><button className="card-dialog-close" type="button" aria-label="Fechar guia rápido" onClick={() => setShowGuide(false)}>×</button><span className="eyebrow">PRIMEIROS PASSOS</span><h2 id="quick-guide-title">Guia rápido</h2><p>Jogue uma criatura na sua vez. A mais forte vence a vaza e inicia a próxima. A primeira equipe a vencer duas vazas ganha a rodada.</p><div className="guide-section"><h3>Força das criaturas</h3><p>Da mais forte para a mais fraca:</p><ol className="guide-creatures">{creatureStrength.map(creature => <li key={creature.kind}><strong>{creature.name}</strong><span>{creature.value}</span></li>)}</ol></div><div className="guide-section"><h3>Se a criatura for igual, vence a Lua mais forte</h3><ol className="guide-moons">{[...MOONS].reverse().map(moon => <li key={moon}><span className={`guide-moon guide-moon-${moon}`}>☾</span>{MOON_NAMES[moon]}</li>)}</ol></div><p className="guide-footnote">O Ritual muda a regra da rodada. Antes de jogar, você pode pedir um Trick para aumentar os pontos se o rival aceitar.</p></section></div>}
    {inspectedCard && <div className="card-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setInspectedCard(null); }}><section className="card-dialog" role="dialog" aria-modal="true" aria-label={`Detalhes de ${inspectedCard.name}`}><button className="card-dialog-close" aria-label="Fechar detalhes da carta" onClick={() => setInspectedCard(null)}>×</button><img src={inspectedCard.image} alt={`${inspectedCard.name}, Lua ${MOON_NAMES[inspectedCard.moon]}`} /><div className="card-dialog-text"><span className="eyebrow">LUA {MOON_NAMES[inspectedCard.moon].toUpperCase()} · VALOR {inspectedCard.value}</span><h2>{inspectedCard.name}</h2><h3>Habilidade</h3><p>{CREATURE_EFFECTS[inspectedCard.kind].description}</p>{!CREATURE_EFFECTS[inspectedCard.kind].available && inspectedCard.kind !== 'arcana' && <strong>Indisponível nesta versão</strong>}<button className="secondary-button" onClick={() => setInspectedCard(null)}>Voltar ao jogo</button></div></section></div>}
    {inspectedRitual && <div className="card-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setInspectedRitual(null); }}><section className="card-dialog ritual-dialog" role="dialog" aria-modal="true" aria-label={`Detalhes de ${inspectedRitual.name}`}><button className="card-dialog-close" aria-label="Fechar detalhes do Ritual" onClick={() => setInspectedRitual(null)}>×</button>{inspectedRitual.image && <img src={inspectedRitual.image} alt={`Arte do Ritual ${inspectedRitual.name}`} />}<div className="card-dialog-text"><span className="eyebrow">RITUAL · {inspectedRitual.blind ? 'ANTES DE VER AS CRIATURAS' : 'APÓS VER AS CRIATURAS'}</span><h2>{inspectedRitual.name}</h2><h3>Regra</h3><p>{inspectedRitual.description}</p><button className="secondary-button" onClick={() => setInspectedRitual(null)}>Voltar ao jogo</button></div></section></div>}
    {showRitualHand && room?.game && <div className="card-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowRitualHand(false); }}><section className="ritual-hand-dialog" role="dialog" aria-modal="true" aria-label="Meus Rituais"><button className="card-dialog-close" aria-label="Fechar minha mão de Rituais" onClick={() => setShowRitualHand(false)}>×</button><span className="eyebrow">RITUAIS DE {room.seats[controlledSeat ?? room.game.seat]?.name?.toUpperCase()}</span><h2>Minha mão de Rituais</h2><div className="ritual-hand-grid">{displayedRitualHand.map(card => <article key={card.id}>{card.image && <img src={card.image} alt={`Arte de ${card.name}`} />}<strong>{card.name}</strong><small>{card.blind ? 'Com olhinho · antes de ver criaturas' : 'Sem olhinho · após ver criaturas'}</small><p>{card.description}</p></article>)}</div>{!displayedRitualHand.length && <p>Sem Rituais na mão neste momento.</p>}</section></div>}
    <footer>WITCH'S TRICK <span>✦</span> LUA CHEIA &amp; BOAS VAZAS</footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
