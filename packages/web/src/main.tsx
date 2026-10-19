import React from 'react';
import { createRoot } from 'react-dom/client';
import { io } from 'socket.io-client';
import { MOON_NAMES, type CreatureCard, type GameView } from '@witch-trick/engine';
import './style.css';

interface SeatInfo { seat: number; name: string; bot: boolean; online: boolean }
interface RoomState {
  code: string;
  seats: (SeatInfo | null)[];
  testMode: boolean;
  game: GameView | null;
  allHands?: CreatureCard[][];
}
type Ack = { ok: true; code: string } | { ok: false; error: string };

const socket = io({ autoConnect: false });
function identity(): string {
  let id = localStorage.getItem('witch-trick-player-id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('witch-trick-player-id', id);
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
function App() {
  const [connected, setConnected] = React.useState(false);
  const [room, setRoom] = React.useState<RoomState | null>(null);
  const [name, setName] = React.useState(localStorage.getItem('witch-trick-name') || '');
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    function onConnect() {
      setConnected(true);
      const savedCode = localStorage.getItem('witch-trick-room');
      if (savedCode) socket.emit('room:join', { code: savedCode, playerId, name: localStorage.getItem('witch-trick-name') }, (ack: Ack) => {
        if (!ack.ok) { localStorage.removeItem('witch-trick-room'); setError(ack.error); }
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
    localStorage.setItem('witch-trick-name', playerName);
    send('room:create', { playerId, name: playerName, testMode }, ack => localStorage.setItem('witch-trick-room', ack.code));
  }
  function join() {
    const playerName = name.trim() || 'Jogador';
    localStorage.setItem('witch-trick-name', playerName);
    send('room:join', { code: code.trim().toUpperCase(), playerId, name: playerName }, ack => localStorage.setItem('witch-trick-room', ack.code));
  }
  function leave() {
    socket.emit('room:leave');
    localStorage.removeItem('witch-trick-room');
    setRoom(null); setError('');
  }
  async function copyCode() {
    if (!room) return;
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  function play(cardId: string) {
    if (!room?.game) return;
    send('room:play', { cardId, seat: room.testMode ? room.game.turn : undefined });
  }

  const game = room?.game;
  const controlledSeat = room?.testMode ? game?.turn : game?.seat;
  const hand = room?.testMode && game ? room.allHands?.[game.turn] ?? [] : game?.hand ?? [];
  const myTurn = !!game && game.winner === null && (room?.testMode || game.turn === game.seat);
  return <div className="app-shell">
    <header className="site-header">
      <div className="brand-mark">☾</div>
      <div className="brand"><span className="eyebrow">UM JOGO DE VAZAS E LUAS</span><strong>Witch's Trick</strong></div>
      <div className={`connection ${connected ? 'connected' : ''}`}><span />{connected ? 'Conectado' : 'Reconectando'}</div>
    </header>

    {!room ? <main className="landing">
      <section className="hero">
        <div className="hero-kicker">✦ A NOITE ESCOLHE SEUS ALIADOS ✦</div>
        <h1>Quatro destinos.<br /><em>Duas equipes.</em><br />Uma lua.</h1>
        <p>Reúna seus amigos, escolha suas criaturas e dispute cada vaza. A primeira equipe a alcançar 15 pontos domina a noite.</p>
        <div className="moon-orbit"><div className="moon-disc">☾</div><span className="orbit-star star-one">✦</span><span className="orbit-star star-two">✧</span></div>
      </section>
      <section className="entry-panel">
        <div className="panel-icon">✧</div><h2>Entre no círculo</h2>
        <p className="muted">Uma partida para 4 pessoas, em 2 equipes. Cada um joga no próprio dispositivo.</p>
        <label>SEU NOME<input value={name} onChange={e => setName(e.target.value)} maxLength={24} placeholder="Como devemos chamar você?" /></label>
        <button className="primary-button" disabled={!connected || busy} onClick={() => create(false)}>Criar sala <span>→</span></button>
        <div className="divider"><span>ou entre com um código</span></div>
        <div className="join-row"><input aria-label="Código da sala" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={5} placeholder="CÓDIGO" /><button disabled={!connected || busy || code.trim().length !== 5} onClick={join}>Entrar</button></div>
        <button className="text-button" disabled={!connected || busy} onClick={() => create(true)}>Testar sozinho: controlar os 4 assentos</button>
        {error && <p className="error" role="alert">{error}</p>}
      </section>
    </main> : <main className="game-layout">
      <div className="game-topbar"><div><span className="eyebrow">SALA <strong>{room.code}</strong></span><button className="copy-button" onClick={copyCode}>{copied ? 'Copiado ✓' : 'Copiar código'}</button></div><button className="text-button" onClick={leave}>Sair da sala</button></div>
      {!game ? <section className="waiting-panel"><div className="waiting-symbol">☽</div><span className="eyebrow">O CÍRCULO SE FORMA</span><h1>Aguardando jogadores</h1><p>Compartilhe o código <strong>{room.code}</strong> para reunir quatro pessoas.</p><div className="waiting-seats">{room.seats.map((seat, index) => <div key={index} className={`waiting-seat ${seat ? 'occupied' : ''}`}><span>{seat ? '✦' : '○'}</span><div><strong>{seat?.name || `Assento ${index + 1}`}</strong><small>Equipe {index % 2 === 0 ? 'A' : 'B'} · {seat ? 'pronto' : 'aguardando'}</small></div></div>)}</div><button className="secondary-button" onClick={() => send('room:fillBots', undefined)} disabled={busy}>Preencher vagas com bots</button></section> : <>
        <section className="scoreboard"><div className="team-score"><span>EQUIPE A · ASSENTOS 1 E 3</span><strong>{game.scores[0]}</strong><small>{'✦ '.repeat(game.trickWins[0]) || 'Aguardando vaza'}</small></div><div className="round-medallion"><span>RODADA</span><strong>{game.round}</strong><small>até 15 pontos</small></div><div className="team-score team-b"><span>EQUIPE B · ASSENTOS 2 E 4</span><strong>{game.scores[1]}</strong><small>{'✦ '.repeat(game.trickWins[1]) || 'Aguardando vaza'}</small></div></section>
        {game.winner !== null && <div className="winner-banner">✦ A Equipe {game.winner === 0 ? 'A' : 'B'} venceu a partida! ✦</div>}
        <div className="turn-banner">{game.winner !== null ? 'Partida encerrada' : room.testMode ? `Sua vez de controlar ${room.seats[game.turn]?.name}` : myTurn ? 'Sua vez de jogar' : `Vez de ${room.seats[game.turn]?.name}`}{game.lastTrickWinner !== null && <small>Última vaza: {room.seats[game.lastTrickWinner]?.name}</small>}</div>
        <section className="table-area"><div className="table-glow" /><div className="table-center"><div className="table-title">A VAZA</div><div className="played-cards">{game.trick.length ? game.trick.map(play => <div className="played-card" key={play.seat}><Card card={play.card} /><small>{room.seats[play.seat]?.name}</small></div>) : <div className="empty-trick">☽<span>A próxima carta inicia a vaza</span></div>}</div></div>
          <div className="table-seats">{room.seats.map((seat, index) => <div className={`table-seat ${game.turn === index && game.winner === null ? 'active-seat' : ''} ${controlledSeat === index ? 'own-seat' : ''}`} key={index}><div className="seat-token">{seat?.name.charAt(0).toUpperCase() || '?'}</div><div><strong>{seat?.name}</strong><small>Equipe {index % 2 === 0 ? 'A' : 'B'} · {game.players[index]?.handCount} cartas {seat?.online ? '' : '· offline'}</small></div></div>)}</div>
        </section>
        <section className="hand-area"><div className="hand-heading"><div><span className="eyebrow">{room.testMode ? `MÃO DE ${room.seats[game.turn]?.name?.toUpperCase()}` : 'SUAS CARTAS'}</span><h2>Escolha sua criatura</h2></div><span className="hand-hint">{myTurn ? 'Toque em uma carta para jogar' : 'Aguarde sua vez'}</span></div><div className="hand-cards">{hand.map(card => <Card key={card.id} card={card} onClick={myTurn ? () => play(card.id) : undefined} disabled={busy} />)}</div></section>
      </>}
      {error && <p className="error game-error" role="alert">{error}</p>}
    </main>}
    <footer>WITCH'S TRICK <span>✦</span> LUA CHEIA &amp; BOAS VAZAS</footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
