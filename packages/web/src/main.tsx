import React from 'react';
import { createRoot } from 'react-dom/client';
import { io } from 'socket.io-client';
import { CREATURES, CREATURE_EFFECTS, MOON_NAMES, RITUALS, trickPoints, type CreatureCard, type CreatureKind, type GameView, type RitualCard, type RitualKind, type Team, type TrickLevel } from '../../engine/src/index.js';
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
const trickNames = { 2: 'Double Trick', 3: 'Hat Trick', 4: 'Poker Trick' } as const;
function MoonTrack({ winners, compact = false }: { winners: Team[]; compact?: boolean }) {
  return <div className={`moon-track ${compact ? 'moon-track-compact' : ''}`} aria-label={`Vazas: ${[0, 1, 2].map(i => winners[i] === undefined ? `${i + 1} pendente` : `${i + 1} Equipe ${winners[i] === 0 ? 'A' : 'B'}`).join(', ')}`}>
    {[0, 1, 2].map(i => <div className={`vaza-moon ${winners[i] === 0 ? 'moon-team-a' : winners[i] === 1 ? 'moon-team-b' : 'moon-empty'}`} key={i} title={`Vaza ${i + 1}: ${winners[i] === undefined ? 'pendente' : `Equipe ${winners[i] === 0 ? 'A' : 'B'}`}`}><span>☾</span><small>{i + 1}</small></div>)}
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
  const [runaCreature, setRunaCreature] = React.useState<CreatureKind>('raven');
  const [scenarioKind, setScenarioKind] = React.useState<CreatureKind>('raven');
  const [scenarioRitual, setScenarioRitual] = React.useState<RitualKind>('veu-da-incerteza');

  React.useEffect(() => {
    if (!inspectedCard && !inspectedRitual && !showRitualHand) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setInspectedCard(null); setInspectedRitual(null); setShowRitualHand(false); } };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [inspectedCard, inspectedRitual, showRitualHand]);

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
    send('room:play', { cardId, seat: room.testMode ? room.game.turn : undefined });
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
  function ritual(type: 'mode' | 'reveal' | 'play' | 'discard' | 'ancient-discard' | 'mirror' | 'blood', extra: object = {}) {
    if (!room?.game) return;
    const seat = room.game.ritualDecisionSeat;
    send('room:ritual', { type, seat: room.testMode ? seat : undefined, ...extra });
  }

  const game = room?.game;
  const ritualPending = !!game?.ritualMode && game.ritualPhase !== 'off' && game.ritualPhase !== 'play';
  const ritualActor = game?.ritualDecisionSeat;
  const controlledSeat = room?.testMode ? game?.pendingAbility?.seat ?? game?.pendingChallenge?.responderSeat ?? (ritualPending ? ritualActor : game?.turn) : game?.seat;
  const handSeat = game?.pendingAbility?.seat ?? game?.pendingChallenge?.responderSeat ?? (ritualPending ? ritualActor : game?.turn);
  const hand: CreatureCard[] = room?.testMode && handSeat != null ? room.allHands?.[handSeat] ?? [] : game?.hand ?? [];
  const ritualHand = room?.testMode && game ? room.allRitualHands?.[game.ritualChooser] ?? [] : game?.ritualHand ?? [];
  const displayedRitualHand = room?.testMode && controlledSeat != null ? room.allRitualHands?.[controlledSeat] ?? [] : game?.ritualHand ?? [];
  const bloodSharedHands = room?.testMode && ritualActor != null
    ? room.seats.flatMap((_, seat) => seat !== ritualActor && seat % 2 === ritualActor % 2
      ? [{ seat, cards: room.allHands?.[seat] ?? [] }] : [])
    : game?.ritualTeammateHands ?? [];
  const blindControlled = controlledSeat != null && !!game?.blindSeats.includes(controlledSeat);
  const blindHandCount = blindControlled && controlledSeat != null ? game?.players[controlledSeat]?.handCount ?? 0 : 0;
  const hiddenPreparationCount = game?.ritualPhase === 'blind-discard' && game.ritualDiscardSeat === (room?.testMode ? handSeat : game.seat)
    ? game.ritualDiscardOptions.length : game && ['mode', 'blind', 'blind-discard'].includes(game.ritualPhase)
      ? Math.max(0, (game.players[room?.testMode ? handSeat ?? game.seat : game.seat]?.handCount ?? 0) - hand.length) : 0;
  const canAncientDiscard = game?.ritualPhase === 'ancient-discard' && game.winner === null && (room?.testMode || game.ancientDiscardSeat === game.seat);
  const canRitual = ritualPending && !!game && game.winner === null && !game.pendingAbility && (room?.testMode || ritualActor === game.seat);
  const myTurn = !!game && game.winner === null && !ritualPending && game.pendingChallenge === null && game.pendingAbility === null && (room?.testMode || game.turn === game.seat);
  const silenceBlocks = game?.ritualActive?.kind === 'silencio-da-bruxa' && game.turn % 2 !== game.ritualChooser % 2;
  const nextTrickLevel = (game?.acceptedTrickLevel ? game.acceptedTrickLevel + 1 : 2) as TrickLevel;
  const pendingTrickPoints = game?.pendingChallenge ? trickPoints(game.roundBaseStake, game.pendingChallenge.level) : null;
  const canRaise = myTurn && !silenceBlocks && game!.acceptedTrickLevel < 4 && game!.lastRaiseTeam !== (game!.turn % 2);
  const canRespond = !!game?.pendingChallenge && game.winner === null && (room?.testMode || game.pendingChallenge.responderSeat === game.seat);
  const canCounter = canRespond && !(game?.ritualActive?.kind === 'silencio-da-bruxa' && game.pendingChallenge!.responderSeat % 2 !== game.ritualChooser % 2);
  const canAbility = !!game?.pendingAbility && game.winner === null && (room?.testMode || game.pendingAbility.seat === game.seat);
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
    : reveal?.reason === 'blind-discard'
      ? `${room?.seats[reveal.seat]?.name} descartou pelo verso com ${reveal.source === 'griffin' ? 'o Grifo' : 'o Titereiro'}`
      : reveal ? `${room?.seats[reveal.seat]?.name} revelou após Trick recusado` : '';
  const revealDescription = reveal?.reason === 'goblin'
    ? reveal.pointAwarded ? `Carta recebida: valor ${reveal.card.value}, menor ou igual a 5. Equipe ${reveal.seat % 2 === 0 ? 'A' : 'B'} ganhou 1 ponto.` : `Carta recebida: valor ${reveal.card.value}. Nenhum ponto extra.`
    : reveal?.reason === 'blind-discard' ? `A carta descartada às cegas foi ${reveal.card.name} · Lua ${MOON_NAMES[reveal.card.moon]}.`
      : reveal?.card.kind === 'arcana' ? 'Arcana não tem habilidade; a carta foi descartada.'
        : reveal ? `Criatura escolhida: ${reveal.card.name}. A carta foi descartada para usar a habilidade.` : '';
  return <div className="app-shell">
    <header className="site-header">
      <div className="brand-mark">☾</div>
      <div className="brand"><span className="eyebrow">UM JOGO DE VAZAS E LUAS</span><strong>Witch's Trick</strong></div>
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
      {room.testMode && game && room.seats.length === 4 && <section className="scenario-panel"><label>TESTAR HABILIDADE <select value={scenarioKind} onChange={event => setScenarioKind(event.target.value as CreatureKind)}>{CREATURES.filter(creature => CREATURE_EFFECTS[creature.kind].available).map(creature => <option value={creature.kind} key={creature.kind}>{creature.name}</option>)}</select></label><button disabled={busy} onClick={() => send('room:testAbility', { kind: scenarioKind, mode: 'trick' })}>Vencer vaza com esta carta</button><button disabled={busy} onClick={() => send('room:testAbility', { kind: scenarioKind, mode: 'declined' })}>Simular Trick recusado</button><label>TESTAR RITUAL <select value={scenarioRitual} onChange={event => setScenarioRitual(event.target.value as RitualKind)}>{RITUALS.slice(0, 12).map(card => <option value={card.kind} key={card.kind}>{card.name}</option>)}</select></label><button disabled={busy} onClick={() => send('room:testRitual', { kind: scenarioRitual })}>Preparar Ritual</button><small>Reinicia a partida de teste com a carta escolhida na mão do Jogador 1.</small></section>}
      {!game ? <section className="waiting-panel"><div className="waiting-symbol">☽</div><span className="eyebrow">O CÍRCULO SE FORMA</span><h1>Aguardando jogadores</h1><p>Compartilhe o código <strong>{room.code}</strong> para reunir {room.seats.length} pessoas. A vitória será em {room.targetScore} pontos.</p><p className="lobby-tip">Em outro dispositivo ou nova aba, abra o jogo, escolha outro nome e entre com este código. No celular, use o IP do computador na mesma rede Wi-Fi.</p><div className="waiting-seats">{room.seats.map((seat, index) => <div key={index} className={`waiting-seat ${seat ? 'occupied' : ''}`}><span>{seat ? '✦' : '○'}</span><div><strong>{seat?.name || `Assento ${index + 1}`}</strong><small>Equipe {index % 2 === 0 ? 'A' : 'B'} · {seat ? 'pronto' : 'aguardando'}</small></div></div>)}</div><button className="secondary-button" onClick={() => send('room:fillBots', undefined)} disabled={busy}>Preencher vagas com bots</button></section> : <>
        <div className="score-row"><section className="scoreboard"><div className="team-score"><span>EQUIPE A · ASSENTOS {room.seats.map((_, index) => index % 2 === 0 ? index + 1 : null).filter(Boolean).join(', ')}</span><strong>{game.scores[0]}</strong><small>✦ Âmbar</small></div><div className="round-medallion"><span>RODADA</span><strong>{game.round}</strong><small>até {game.targetScore} pontos</small></div><div className="team-score team-b"><span>EQUIPE B · ASSENTOS {room.seats.map((_, index) => index % 2 === 1 ? index + 1 : null).filter(Boolean).join(', ')}</span><strong>{game.scores[1]}</strong><small>✦ Verde de poção</small></div></section>
        <section className="vaza-progress" aria-label="Histórico de vazas desta rodada"><div className="vaza-heading"><span className="eyebrow">LUAS DA RODADA</span><strong>Quem venceu cada vaza</strong></div><MoonTrack winners={game.trickWinners} /><div className="team-legend"><span><i className="legend-a" />Equipe A</span><span><i className="legend-b" />Equipe B</span></div></section>
        </div>
        {game.lastRound && <div className={`last-round-note last-round-team-${game.lastRound.winner}`}><div><span className="eyebrow">RODADA ANTERIOR</span><strong>Equipe {game.lastRound.winner === 0 ? 'A' : 'B'} +{game.lastRound.points} {game.lastRound.points === 1 ? 'ponto' : 'pontos'} {game.lastRound.reason === 'declined' ? '· Trick recusado' : game.lastRound.reason === 'blood-withdrawal' ? '· Acordo de Sangue recusado' : '· Duas vazas'} {game.lastRound.loserPenalty !== undefined ? `· rival −${game.lastRound.loserPenalty}` : ''}</strong></div><MoonTrack winners={game.lastRound.trickWinners} compact /></div>}
        {game.wolfTeam !== null && <div className="wolf-notice">🐺 Lobo ativo: a Equipe {game.wolfTeam === 0 ? 'B' : 'A'} não pode usar habilidades nesta rodada.</div>}
        {game.ritualMode && <section className="ritual-panel" aria-label="Rituais da rodada">
          <div className="ritual-panel-heading"><div><span className="eyebrow">BARALHO DE RITUAIS · TESTE 12 DE 48</span><h2>{game.ritualActive ? game.ritualActive.name : `Ritual de ${room.seats[game.ritualChooser]?.name}`}</h2><p>{game.ritualActive ? game.ritualActive.description : game.ritualPhase === 'mode' ? 'Defina se jogará com ou sem olhinho. O poder pendente será resolvido antes de você escolher a carta de Ritual.' : game.ritualPhase === 'blind' ? 'Escolha um Ritual com olhinho antes de revelar as novas criaturas.' : 'Escolha um Ritual para definir esta rodada.'}</p>{game.ritualEmpoweredKind && <p className="ritual-runa-active">✦ {CREATURES.find(creature => creature.kind === game.ritualEmpoweredKind)?.name}: todas as Luas acima das demais cartas nesta rodada.</p>}{game.ritualTargetSeat !== null && <p>🎴 {room.seats[game.ritualTargetSeat]?.name}: {game.ritualActive?.kind === 'mao-cega' ? 'joga sem ver as criaturas' : game.ritualActive?.kind === 'olho-da-verdade' ? 'joga com a mão visível' : 'teve a mão consultada'} nesta rodada.</p>}</div><div className="ritual-header-actions"><button className="ritual-read" onClick={() => setShowRitualHand(true)}>Ver meus Rituais ({displayedRitualHand.length})</button>{game.ritualActive && <div className="ritual-active-actions"><span className="ritual-active-mark">✦ ATIVO</span>{game.ritualActive.image && <button className="ritual-read" onClick={() => setInspectedRitual(game.ritualActive!)}>Ver arte</button>}</div>}</div></div>
          {ritualPending && game.ritualPhase === 'mode' && <div className="ritual-mode-choice"><strong>{canRitual ? 'Como será o próximo Ritual?' : `Aguardando ${room.seats[game.ritualChooser]?.name} definir a modalidade`}</strong><p>A escolha da modalidade vem antes do poder pendente. Depois você escolhe a carta de Ritual.</p>{canRitual && <div className="ritual-mode-actions"><button disabled={busy || !ritualHand.some(card => card.blind)} onClick={() => ritual('mode', { blind: true })}>Com olhinho · criaturas ocultas</button><button disabled={busy || !ritualHand.some(card => !card.blind)} onClick={() => ritual('mode', { blind: false })}>Sem olhinho · ver criaturas</button></div>}</div>}
          {ritualPending && (game.ritualPhase === 'blind' || game.ritualPhase === 'revealed') && <>
            <div className="ritual-choice-heading"><strong>{canRitual ? 'Escolha um Ritual' : `Aguardando ${room.seats[game.ritualChooser]?.name}`}</strong><small>{game.ritualPhase === 'blind' ? 'Criaturas novas ainda ocultas' : 'Criaturas reveladas apenas aos respectivos donos'}</small></div>
            {canRitual && <div className="ritual-choices">{ritualHand.map(card =>
              <article className={`ritual-choice ${card.blind === (game.ritualPhase === 'blind') ? '' : 'ritual-choice-unavailable'}`} key={card.id}>
                {card.image ? <button className="ritual-art-preview" aria-label={`Ampliar ${card.name}`} onClick={() => setInspectedRitual(card)}><img src={card.image} alt="" /></button> : <div className="ritual-symbol">{card.blind ? '◉̸' : '✦'}</div>}
                <div className="ritual-choice-body"><strong>{card.name}</strong><small>{card.blind ? 'Antes de ver as criaturas' : 'Depois de ver as criaturas'}</small><p>{card.description}</p>
                {card.blind !== (game.ritualPhase === 'blind') ? <span className="ritual-choice-lock">{game.ritualPhase === 'blind' ? game.ritualModeLocked ? 'Indisponível após escolher com olhinho' : 'Revele as criaturas para jogar' : 'Indisponível após revelar as criaturas'}</span>
                  : card.kind === 'mapa-do-destino' ? <div className="ritual-choice-actions"><button disabled={busy} onClick={() => ritual('play', { ritualId: card.id, prediction: '2-0' })}>Prever 2–0</button><button disabled={busy} onClick={() => ritual('play', { ritualId: card.id, prediction: '2-1' })}>Prever 2–1</button></div>
                  : card.kind === 'runa-da-vontade' ? <div className="ritual-runa-choice"><label>Fortalecer criatura<select value={runaCreature} onChange={event => setRunaCreature(event.target.value as CreatureKind)}>{CREATURES.map(creature => <option key={creature.kind} value={creature.kind}>{creature.name}</option>)}</select></label><button disabled={busy} onClick={() => ritual('play', { ritualId: card.id, creatureKind: runaCreature })}>Jogar Runa</button></div>
                    : ['mao-cega', 'roubo-arcano', 'olho-da-verdade'].includes(card.kind) ? <div className="ritual-choice-actions">{room.seats.map((seat, index) => index % 2 !== game.ritualChooser % 2 && <button key={index} disabled={busy} onClick={() => ritual('play', { ritualId: card.id, targetSeat: index })}>{card.kind === 'mao-cega' ? 'Cegar' : card.kind === 'roubo-arcano' ? 'Ver mão de' : 'Revelar mão de'} {seat?.name}</button>)}</div>
                      : <button disabled={busy} onClick={() => ritual('play', { ritualId: card.id })}>Jogar Ritual</button>}
                </div>
              </article>
            )}</div>}
            {canRitual && game.ritualPhase === 'blind' && !game.ritualModeLocked && ritualHand.some(card => !card.blind) && <button className="secondary-button ritual-reveal" disabled={busy} onClick={() => ritual('reveal')}>Ver minhas criaturas para escolher outro Ritual</button>}
          </>}
          {ritualPending && (game.ritualPhase === 'blind-discard' || game.ritualPhase === 'revealed-discard') && <div className="ritual-discard"><strong>{game.ritualPhase === 'blind-discard' ? 'Titereiro: descarte uma criatura nova pelo verso, sem ver' : 'Titereiro: escolha uma das três criaturas novas para descartar'}</strong>{canRitual && <div className="ritual-discard-options">{game.ritualDiscardOptions.map((option, index) => <div key={option.value}>{option.card && <button className="ritual-discard-preview" onClick={() => setInspectedCard(option.card!)}><img src={option.card.image} alt="" /></button>}<button disabled={busy} onClick={() => ritual('discard', { choice: option.value })}>{option.card ? `Descartar ${option.card.name} · Lua ${MOON_NAMES[option.card.moon]}` : `Descartar carta oculta ${index + 1}`}</button></div>)}</div>}</div>}
          {game.ritualPhase === 'ancient-discard' && <div className="ritual-discard"><strong>Escolha da Anciã: {room.seats[game.ancientDiscardSeat ?? 0]?.name} descarta 3 criaturas</strong><p>As cartas extras já foram compradas. Cada jogador da equipe escolhe três descartes na própria mão antes da primeira vaza.</p></div>}
          {game.ritualPhase === 'mirror' && <div className="ritual-decision">
            <strong>Espelho Enfeitiçado: {room.seats[ritualActor ?? 0]?.name} decide a troca</strong>
            <p>Cada parceiro pode trocar sua mão inteira. Um adversário já escolhido não pode ser escolhido de novo.</p>
            {canRitual && <div className="ritual-mode-actions"><button disabled={busy} onClick={() => ritual('mirror')}>Manter minha mão</button>{room.seats.map((seat, index) => index % 2 !== game.ritualChooser % 2 && !game.ritualMirrorTargets.includes(index) && <button key={index} disabled={busy} onClick={() => ritual('mirror', { targetSeat: index })}>Trocar com {seat?.name}</button>)}</div>}
          </div>}
          {game.ritualPhase === 'blood-vote' && <div className="ritual-decision">
            <strong>Acordo de Sangue: {room.seats[ritualActor ?? 0]?.name} decide</strong>
            <p>A equipe precisa de {game.ritualVotesNeeded} votos favoráveis para jogar por 3 pontos. Se não conseguir a maioria, o rival ganha 1 ponto. Votos a favor: {game.ritualVotesFor}; votos dados: {game.ritualVotesCast}.</p>
            {bloodSharedHands.map(shared => <div key={shared.seat}><small>Mão de {room.seats[shared.seat]?.name}</small><div className="ritual-info-cards">{shared.cards.map(card => <button className="ritual-info-card" key={card.id} onClick={() => setInspectedCard(card)} aria-label={`Ampliar ${card.name}`}><img src={card.image} alt={card.name} /></button>)}</div></div>)}
            {canRitual && <div className="ritual-mode-actions"><button disabled={busy} onClick={() => ritual('blood', { play: true })}>Votar para jogar por 3 pontos</button><button disabled={busy} onClick={() => ritual('blood', { play: false })}>Votar por desistir</button></div>}
          </div>}
          {game.ritualActive?.kind === 'roubo-arcano' && (room.testMode || game.seat === game.ritualChooser) && <div className="ritual-decision"><strong>Roubo Arcano: mão de {room.seats[game.ritualTargetSeat ?? 0]?.name} no momento do Ritual</strong><div className="ritual-info-cards">{game.ritualPeekCards.map(card => <button className="ritual-info-card" key={card.id} onClick={() => setInspectedCard(card)} aria-label={`Ampliar ${card.name}`}><img src={card.image} alt={card.name} /></button>)}</div></div>}
          {game.ritualActive?.kind === 'olho-da-verdade' && game.ritualTargetSeat !== null && <div className="ritual-decision"><strong>Olho da Verdade: mão visível de {room.seats[game.ritualTargetSeat]?.name}</strong><div className="ritual-info-cards">{game.players[game.ritualTargetSeat]?.visibleHand?.map(card => <button className="ritual-info-card" key={card.id} onClick={() => setInspectedCard(card)} aria-label={`Ampliar ${card.name}`}><img src={card.image} alt={card.name} /></button>)}</div></div>}
        </section>}
        {game.winner !== null && <div className="winner-banner">✦ A Equipe {game.winner === 0 ? 'A' : 'B'} venceu a partida! ✦</div>}
        <div className="turn-banner">{game.winner !== null ? 'Partida encerrada' : game.pendingAbility ? canAbility ? `Habilidade: ${abilityStageText[game.pendingAbility.stage]}` : `Aguardando ${room.seats[game.pendingAbility.seat]?.name} decidir a habilidade` : game.ritualPhase === 'ancient-discard' ? canAncientDiscard ? 'Anciã: escolha uma criatura para descartar' : `Aguardando ${room.seats[game.ancientDiscardSeat ?? 0]?.name} descartar` : ritualPending ? canRitual ? game.ritualPhase.endsWith('discard') ? 'Escolha o descarte do Titereiro' : game.ritualPhase === 'mirror' ? 'Decida a troca do Espelho' : game.ritualPhase === 'blood-vote' ? 'Decida o Acordo de Sangue' : 'Escolha o Ritual da rodada' : `Aguardando ${room.seats[ritualActor ?? game.ritualChooser]?.name} decidir ${game.ritualPhase.endsWith('discard') ? 'o descarte' : game.ritualPhase === 'mirror' ? 'a troca do Espelho' : game.ritualPhase === 'blood-vote' ? 'o Acordo de Sangue' : 'o Ritual'}` : game.pendingChallenge ? canRespond ? `Sua decisão: ${trickNames[game.pendingChallenge.level]}` : `Aguardando ${room.seats[game.pendingChallenge.responderSeat]?.name} responder ao ${trickNames[game.pendingChallenge.level]}` : room.testMode ? `Sua vez de controlar ${room.seats[game.turn]?.name}` : myTurn ? 'Sua vez de jogar' : `Vez de ${room.seats[game.turn]?.name}`}{game.lastTrickWinner !== null && <small>Última vaza: {room.seats[game.lastTrickWinner]?.name}</small>}</div>
        {game.pendingAbility && <section className={`ability-panel ${game.pendingAbility.stage === 'puppet-card' ? 'ability-card-picker' : ''}`}><div><span className="eyebrow">PODER DE CRIATURA</span><strong>{room.seats[game.pendingAbility.seat]?.name}: {abilityStageText[game.pendingAbility.stage]}</strong>{game.pendingAbility.card && <p>{game.pendingAbility.card.name}: {CREATURE_EFFECTS[game.pendingAbility.card.kind].description}</p>}<p className="ability-timing">{game.pendingAbility.stage === 'puppet-exchange' ? 'A carta recuperada já está na sua mão. Descarte outra carta para concluir a troca.' : game.pendingAbility.appliesNextRound ? 'A decisão é agora. O efeito entra no início da próxima rodada.' : ritualPending ? 'Resolva esta habilidade antes da escolha do Ritual.' : 'O efeito entra antes da próxima vaza.'}</p></div>{canAbility && <div className="ability-options">{game.abilityOptions.map(option => <div className="ability-option" key={option.value}>{option.card && <button className="ability-preview" onClick={() => setInspectedCard(option.card!)} aria-label={`Ler ${option.card.name}`}><img src={option.card.image} alt="" /></button>}{option.ritual?.image && <button className="ability-preview" onClick={() => setInspectedRitual(option.ritual!)} aria-label={`Ler Ritual ${option.ritual.name}`}><img src={option.ritual.image} alt="" /></button>}<button className="ability-select" disabled={busy} onClick={() => chooseAbility(option.value)}>{option.seat !== undefined ? room.seats[option.seat]?.name : option.card ? `Escolher ${option.card.name} · ${MOON_NAMES[option.card.moon]}` : option.label}</button></div>)}</div>}</section>}
        {reveal && <section className="creature-reveal" role="status" aria-label="Última criatura revelada"><div className="creature-reveal-copy"><span className="eyebrow">REVELAÇÃO · RODADA {reveal.round}</span><strong>{revealTitle}</strong><p>{revealDescription}</p></div><div className="creature-reveal-cards">{reveal.tradedCard && <div><span>Entregou</span><button onClick={() => setInspectedCard(reveal.tradedCard!)} aria-label={`Ampliar ${reveal.tradedCard.name}`}><img src={reveal.tradedCard.image} alt={reveal.tradedCard.name} /></button></div>}<div><span>{reveal.reason === 'goblin' ? 'Recebeu' : reveal.reason === 'blind-discard' ? 'Descartou' : 'Revelou'}</span><button onClick={() => setInspectedCard(reveal.card)} aria-label={`Ampliar ${reveal.card.name}`}><img src={reveal.card.image} alt={reveal.card.name} /></button></div></div></section>}
        <section className="trick-panel"><div><span className="eyebrow">APOSTA DA RODADA</span><strong>{game.roundStake} {game.roundStake === 1 ? 'ponto' : 'pontos'}</strong>{game.pendingChallenge && <small>{room.seats[game.pendingChallenge.challengerSeat]?.name} pediu {trickNames[game.pendingChallenge.level]} · partida por {pendingTrickPoints} pontos se aceitar</small>}</div>{game.pendingChallenge ? <div className="trick-actions"><button className="trick-accept" disabled={!canRespond || busy} onClick={() => respond(true)}>Aceitar · partida {pendingTrickPoints} pontos</button><button className="trick-decline" disabled={!canRespond || busy} onClick={() => respond(false)}>Recusar · rival ganha {game.roundStake}</button>{game.pendingChallenge.level < 4 && <button className="trick-counter" disabled={!canCounter || busy} onClick={counter}>{trickNames[(game.pendingChallenge.level + 1) as 3 | 4]} · {trickPoints(game.roundBaseStake, (game.pendingChallenge.level + 1) as 3 | 4)} pontos</button>}</div> : game.acceptedTrickLevel < 4 && <button className="trick-raise" disabled={!canRaise || busy} onClick={raise}>{trickNames[nextTrickLevel]} · {trickPoints(game.roundBaseStake, nextTrickLevel)} pontos</button>}</section>
        <section className={`table-area players-${room.seats.length} ${game.pendingChallenge ? 'challenge-open' : ''}`}><div className="table-glow" /><div className="table-center"><div className="table-title">A VAZA</div><div className="played-cards">{game.trick.length ? game.trick.map(play => <div className="played-card" key={play.seat}><Card card={play.card} /><small>{room.seats[play.seat]?.name}</small><button className="card-read" onClick={() => setInspectedCard(play.card)}>Ler carta</button></div>) : <div className="empty-trick">☽<span>A próxima carta inicia a vaza</span></div>}</div></div>
          <div className="table-seats">{room.seats.map((seat, index) => <div className={`table-seat ${(game.pendingAbility?.seat ?? game.pendingChallenge?.responderSeat ?? game.turn) === index && game.winner === null ? 'active-seat' : ''} ${controlledSeat === index ? 'own-seat' : ''} ${game.players[index]?.skipsNextTrick ? 'skipping-seat' : ''}`} key={index}><div className="seat-token">{seat?.name.charAt(0).toUpperCase() || '?'}</div><div><strong>{seat?.name}</strong><small>Equipe {index % 2 === 0 ? 'A' : 'B'} · {game.players[index]?.handCount} cartas {game.players[index]?.skipsNextTrick ? '· passa esta vaza ' : ''}{seat?.online ? '' : '· offline'}</small></div></div>)}</div>
        </section>
        <section className="hand-area"><div className="hand-heading"><div><span className="eyebrow">{room.testMode ? `MÃO DE ${room.seats[handSeat ?? 0]?.name?.toUpperCase()}` : 'SUAS CARTAS'}</span><h2>{game.pendingAbility ? 'Decida a habilidade' : game.ritualPhase === 'ancient-discard' ? 'Escolha três descartes' : ritualPending ? 'Preparando a rodada' : game.pendingChallenge ? 'Decida o Trick' : 'Escolha sua criatura'}</h2></div><span className="hand-hint">{game.ritualPhase === 'ancient-discard' ? 'Cada jogador da equipe descarta três criaturas' : blindControlled && !ritualPending ? 'Escolha uma posição sem ver a criatura' : game.pendingAbility ? canAbility ? 'Escolha uma das opções acima; suas cartas podem ser ampliadas abaixo' : 'Aguarde a decisão' : ritualPending ? ['mode', 'blind', 'blind-discard'].includes(game.ritualPhase) ? 'As criaturas novas continuam ocultas' : 'O Ritual será decidido antes da primeira vaza' : game.pendingChallenge ? room.testMode ? `Agora quem responde é ${room.seats[game.pendingChallenge.responderSeat]?.name}` : canRespond ? 'Escolha aceitar, recusar ou aumentar' : 'Aguarde a resposta ao Trick' : myTurn ? 'Toque em uma carta para jogar' : 'Aguarde sua vez'}</span></div>
          <div className="hand-cards">
            {blindControlled && game.ritualPhase === 'play' ? Array.from({ length: blindHandCount }, (_, index) => <div className="hand-card" key={index}><HiddenCard index={index} action={game.pendingAbility?.stage === 'source' ? 'Revelar' : 'Jogar'} onClick={game.pendingAbility?.stage === 'source' && canAbility ? () => chooseAbility(String(index)) : myTurn ? () => play(String(index)) : undefined} disabled={busy} /></div>) : <>{hand.map(card => <div className="hand-card" key={card.id}><Card card={card} onClick={myTurn ? () => play(card.id) : undefined} disabled={busy} />{canAncientDiscard ? <button className="card-discard" disabled={busy} onClick={() => ritual('ancient-discard', { cardId: card.id })}>Descartar {card.name}</button> : <button className="card-read" onClick={() => setInspectedCard(card)}>Ler carta</button>}</div>)}{Array.from({ length: hiddenPreparationCount }, (_, index) => <div className="hand-card" key={`hidden-${index}`}><HiddenCard index={index} action="Descartar" onClick={game.ritualPhase === 'blind-discard' && canRitual ? () => ritual('discard', { choice: String(index) }) : undefined} disabled={busy} /></div>)}</>}
          </div>
        </section>
      </>}
      {error && <p className="error game-error" role="alert">{error}</p>}
    </main>}
    {inspectedCard && <div className="card-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setInspectedCard(null); }}><section className="card-dialog" role="dialog" aria-modal="true" aria-label={`Detalhes de ${inspectedCard.name}`}><button className="card-dialog-close" aria-label="Fechar detalhes da carta" onClick={() => setInspectedCard(null)}>×</button><img src={inspectedCard.image} alt={`${inspectedCard.name}, Lua ${MOON_NAMES[inspectedCard.moon]}`} /><div className="card-dialog-text"><span className="eyebrow">LUA {MOON_NAMES[inspectedCard.moon].toUpperCase()} · VALOR {inspectedCard.value}</span><h2>{inspectedCard.name}</h2><h3>Habilidade</h3><p>{CREATURE_EFFECTS[inspectedCard.kind].description}</p>{!CREATURE_EFFECTS[inspectedCard.kind].available && inspectedCard.kind !== 'arcana' && <strong>Indisponível nesta versão</strong>}<button className="secondary-button" onClick={() => setInspectedCard(null)}>Voltar ao jogo</button></div></section></div>}
    {inspectedRitual && <div className="card-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setInspectedRitual(null); }}><section className="card-dialog ritual-dialog" role="dialog" aria-modal="true" aria-label={`Detalhes de ${inspectedRitual.name}`}><button className="card-dialog-close" aria-label="Fechar detalhes do Ritual" onClick={() => setInspectedRitual(null)}>×</button>{inspectedRitual.image && <img src={inspectedRitual.image} alt={`Arte do Ritual ${inspectedRitual.name}`} />}<div className="card-dialog-text"><span className="eyebrow">RITUAL · {inspectedRitual.blind ? 'ANTES DE VER AS CRIATURAS' : 'APÓS VER AS CRIATURAS'}</span><h2>{inspectedRitual.name}</h2><h3>Regra</h3><p>{inspectedRitual.description}</p><button className="secondary-button" onClick={() => setInspectedRitual(null)}>Voltar ao jogo</button></div></section></div>}
    {showRitualHand && room?.game && <div className="card-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowRitualHand(false); }}><section className="ritual-hand-dialog" role="dialog" aria-modal="true" aria-label="Meus Rituais"><button className="card-dialog-close" aria-label="Fechar minha mão de Rituais" onClick={() => setShowRitualHand(false)}>×</button><span className="eyebrow">RITUAIS DE {room.seats[controlledSeat ?? room.game.seat]?.name?.toUpperCase()}</span><h2>Minha mão de Rituais</h2><div className="ritual-hand-grid">{displayedRitualHand.map(card => <article key={card.id}>{card.image && <img src={card.image} alt={`Arte de ${card.name}`} />}<strong>{card.name}</strong><small>{card.blind ? 'Com olhinho · antes de ver criaturas' : 'Sem olhinho · após ver criaturas'}</small><p>{card.description}</p></article>)}</div>{!displayedRitualHand.length && <p>Sem Rituais na mão neste momento.</p>}</section></div>}
    <footer>WITCH'S TRICK <span>✦</span> LUA CHEIA &amp; BOAS VAZAS</footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
