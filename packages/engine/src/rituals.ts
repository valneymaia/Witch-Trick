export const RITUALS = [
  { kind: 'runa-da-vontade', name: 'Runa da Vontade', blind: false, image: '/rituals/runa-da-vontade.png', description: 'Escolha uma criatura. As quatro Luas dela ficam acima de todas as demais cartas, inclusive as Arcanas, nesta rodada. Entre elas, vale a ordem normal das Luas.' },
  { kind: 'magia-nula', name: 'Magia Nula', blind: false, image: '/rituals/magia-nula.png', description: 'As habilidades de criaturas ficam desativadas nesta rodada.' },
  { kind: 'trick-explosivo', name: 'Trick Explosivo', blind: false, image: '/rituals/trick-explosivo.png', description: 'A rodada começa valendo 3 pontos. Double, Hat e Poker Trick aceitos elevam o valor a 5, 6 e 7 pontos.' },
  { kind: 'doblete-sombrio', name: 'Doblete Sombrio', blind: false, image: '/rituals/doblete-sombrio.png', description: 'A rodada começa valendo 2 pontos. Double, Hat e Poker Trick aceitos elevam o valor a 4, 5 e 6 pontos.' },
  { kind: 'maldicao-da-derrota', name: 'Maldição da Derrota', blind: false, image: '/rituals/maldicao-da-derrota.png', description: 'A equipe que perder esta rodada perde 3 pontos, até o mínimo de zero.' },
  { kind: 'escolha-da-ancia', name: 'Escolha da Anciã', blind: false, image: '/rituals/escolha-da-ancia.png', description: 'Cada jogador da equipe compra 3 criaturas e descarta 3 da própria mão antes da primeira vaza.' },
  { kind: 'veu-da-incerteza', name: 'Véu da Incerteza', blind: true, image: '/rituals/veu-da-incerteza.png', description: 'Todos jogam criaturas pelo verso, sem consultar a própria mão, durante toda a rodada.' },
  { kind: 'mao-cega', name: 'Mão Cega', blind: true, image: '/rituals/mao-cega.png', description: 'Escolha um adversário. Ele joga criaturas pelo verso, sem consultar a própria mão, durante toda a rodada.' },
  { kind: 'roubo-arcano', name: 'Roubo Arcano', blind: false, image: '/rituals/roubo-arcano.png', description: 'Escolha um adversário e veja todas as criaturas da mão dele.' },
  { kind: 'espelho-enfeiticado', name: 'Espelho Enfeitiçado', blind: false, image: '/rituals/espelho-enfeiticado.png', description: 'Cada membro da equipe pode trocar toda a própria mão com a de um adversário. Cada rival só pode ser escolhido uma vez.' },
  { kind: 'olho-da-verdade', name: 'Olho da Verdade', blind: false, image: '/rituals/olho-da-verdade.png', description: 'Escolha um adversário. As criaturas da mão dele ficam visíveis a todos nesta rodada.' },
  { kind: 'acordo-de-sangue', name: 'Acordo de Sangue', blind: false, image: '/rituals/acordo-de-sangue.png', description: 'A equipe vê as mãos dos parceiros e vota. Com maioria favorável, joga por 3 pontos; sem maioria, o rival ganha 1 ponto.' },
  { kind: 'escudo-arcano', name: 'Escudo Arcano', blind: false, image: '/rituals/escudo-arcano.png', description: 'Se a equipe que jogou este Ritual perder a rodada, a equipe vencedora perde 1 ponto, até o mínimo de zero.' },
  { kind: 'zebra-mistica', name: 'Zebra Mística', blind: false, image: '/rituals/zebra-mistica.png', description: 'A equipe que estava atrás no placar quando este Ritual foi jogado ganha 1 ponto extra se vencer a rodada.' },
  { kind: 'blefe-premiado', name: 'Blefe Premiado', blind: false, image: '/rituals/blefe-premiado.png', description: 'Se a equipe que jogou este Ritual vencer sem jogar nenhuma Arcana nesta rodada, ganha 2 pontos extras.' },
  { kind: 'visao-compartilhada', name: 'Visão Compartilhada', blind: false, image: '/rituals/visao-compartilhada.png', description: 'Cada jogador da equipe que jogou este Ritual pode ver a mão atual dos parceiros durante toda a rodada.' },
  { kind: 'cartada-fantasma', name: 'Cartada Fantasma', blind: false, image: '/rituals/cartada-fantasma.png', description: 'Uma única vaza decide a rodada. A equipe vencedora recebe a aposta da rodada.' },
  { kind: 'tempestade-de-cartas', name: 'Tempestade de Cartas', blind: false, image: '/rituals/tempestade-de-cartas.png', description: 'Embaralhe juntas as criaturas das mãos de todos e redistribua, preservando a quantidade de cartas de cada jogador.' },
  { kind: 'lua-invertida', name: 'Lua Invertida', blind: false, image: '/rituals/lua-invertida.png', description: 'Nesta rodada, a força das criaturas e das Luas é invertida. As Arcanas continuam acima de todas as outras criaturas.' },
  { kind: 'controle-mental', name: 'Controle Mental', blind: false, image: '/rituals/controle-mental.png', description: 'Nesta rodada, cada aliado sorteia no servidor a criatura jogada pelo adversário à sua esquerda quando chegar a vez dele.' },
  { kind: 'revelacao-do-destino', name: 'Revelação do Destino', blind: false, image: '/rituals/revelacao-do-destino.png', description: 'Todos os membros da equipe votam. Só com aprovação unânime cada um descarta toda a mão de criaturas e compra 3 novas. Se alguém recusar, ninguém troca.' },
  { kind: 'feitico-oculto', name: 'Feitiço Oculto', blind: true, image: '/rituals/feitico-oculto.png', description: 'Antes de ver as criaturas, cada jogador escolhe pelo verso uma das três para separar. Jogue as outras nas duas primeiras vazas; na terceira, jogue a separada pelo verso.' },
  { kind: 'trick-premiado', name: 'Trick Premiado', blind: false, image: '/rituals/trick-premiado.png', description: 'A rodada começa valendo 4 pontos. Double, Hat e Poker Trick aceitos elevam o valor a 6, 7 e 8 pontos.' },
  { kind: 'pacto-da-batalha', name: 'Pacto da Batalha', blind: false, image: '/rituals/pacto-da-batalha.png', description: 'Quem jogou escolhe um aliado, podendo escolher a si mesmo, e um adversário. Só os dois disputam as vazas desta rodada.' },
  { kind: 'troca-de-sortes', name: 'Troca de Sortes', blind: false, image: '/rituals/troca-de-sortes.png', description: 'Cada aliado pode escolher uma criatura própria e uma carta virada da mão de um adversário para trocar, sem revelar a troca aos demais.' },
  { kind: 'x1-no-dado', name: 'x1 no Dado', blind: false, image: '/rituals/x1-no-dado.png', description: 'Um integrante de cada equipe lança um dado. O maior resultado vence a rodada; em empate, as equipes lançam novamente.' },
  { kind: 'estrela-guia', name: 'Estrela Guia', blind: false, image: '/rituals/estrela-guia.png', description: 'A equipe que vencer a primeira vaza recebe 1 ponto extra, mesmo que perca a rodada.' },
  { kind: 'divida-arcana', name: 'Dívida Arcana', blind: false, image: '/rituals/divida-arcana.png', description: 'Se a equipe que jogou este Ritual perder a rodada, o adversário ganha 1 ponto extra por cada Arcana que essa equipe jogou.' },
  { kind: 'magia-acelerada', name: 'Magia Acelerada', blind: false, image: '/rituals/magia-acelerada.png', description: 'Quem jogou o Ritual descarta uma criatura da própria mão, exceto Arcana, e aplica sua habilidade. Ele passa a primeira vaza e volta a jogar na segunda.' },
  { kind: 'magia-duplicada', name: 'Magia Duplicada', blind: false, image: '/rituals/magia-duplicada.png', description: 'Cada habilidade de criatura ativada nesta rodada é aplicada duas vezes. Efeitos com escolhas abrem uma nova decisão na segunda aplicação.' },
  { kind: 'ritual-oculto', name: 'Ritual Oculto', blind: false, image: '/rituals/ritual-oculto.png', description: 'Todos escolhem suas criaturas em segredo e podem pedir Trick antes de confirmar. As cartas de cada vaza são reveladas juntas depois que todos jogam.' },
  { kind: 'enfraquecer', name: 'Enfraquecer', blind: false, image: '/rituals/enfraquecer.png', description: 'Uma vez nesta rodada, quem jogou o Ritual pode reduzir em 2 a força de uma criatura adversária já jogada, exceto Arcana, antes do resultado da vaza.' },
  { kind: 'silencio-da-bruxa', name: 'Silêncio da Bruxa', blind: false, image: '/rituals/silencio-da-bruxa.png', description: 'A equipe adversária não pode pedir nem aumentar Trick nesta rodada.' },
  { kind: 'permuta-profana', name: 'Permuta Profana', blind: false, image: '/rituals/permuta-profana.png', description: 'Cada jogador escolhe uma criatura da própria mão para passar ao adversário à direita. Todas as trocas acontecem juntas antes da primeira vaza.' },
  { kind: 'ciclo-da-lua', name: 'Ciclo da Lua', blind: false, image: '/rituals/ciclo-da-lua.png', description: 'Nesta rodada, a ordem das Luas é invertida. A força das criaturas continua normal, inclusive a Arcana acima das demais.' },
  { kind: 'caldeirao-bipolar', name: 'Caldeirão Bipolar', blind: false, image: '/rituals/caldeirao-bipolar.png', description: 'Em cada vaza, todas as Luas da criatura vencedora se tornam as mais fracas da vaza seguinte. A Arcana também pode ser afetada.' },
  { kind: 'campeoes-ocultos', name: 'Campeões Ocultos', blind: true, image: '/rituals/campeoes-ocultos.png', description: 'Antes de todos verem as mãos, escolha uma criatura pelo verso de cada jogador. As demais são descartadas e a rodada será decidida em uma vaza.' },
  { kind: 'forca-oculta', name: 'Força Oculta', blind: false, image: '/rituals/forca-oculta.png', description: 'Escolha uma criatura de valor 1 a 6 e lance um D6. Some o resultado à força dela nesta rodada.' },
  { kind: 'turbilhao-do-destino', name: 'Turbilhão do Destino', blind: true, image: '/rituals/turbilhao-do-destino.png', description: 'Cada aliado descarta uma criatura aleatória pelo verso. As cartas são reveladas e sua equipe já vence a primeira vaza; as demais são jogadas com duas cartas.' },
  { kind: 'profecia-maia', name: 'Profecia Maia', blind: true, image: '/rituals/profecia-maia.png', description: 'Antes de ver as mãos, anuncie um número de 1 a 9. As cartas desse valor na mão de toda a sua equipe recebem +2 nesta rodada.' },
  { kind: 'nevoa-de-sussurros', name: 'Névoa de Sussurros', blind: false, image: '/rituals/nevoa-de-sussurros.png', description: 'Uma vez nesta rodada, antes de uma vaza, escolha uma Lua para vencer desempates entre criaturas do mesmo valor apenas nessa vaza.' },
  { kind: 'todos-por-um', name: 'Todos por Um', blind: false, image: '/rituals/todos-por-um.png', description: 'Escolha uma vaza para ser decidida pela soma das forças das cartas de cada equipe. Arcana vale zero nessa soma.' },
  { kind: 'vinculo-as-cegas', name: 'Vínculo às Cegas', blind: true, image: '/rituals/vinculo-as-cegas.png', description: 'Veja sua mão e compre duas criaturas ocultas. Troque 0, 1 ou 2 cartas suas; cada extra que você não pegar passa ao próximo adversário, que troca o mesmo número pelo verso.' },
  { kind: 'genjutso', name: 'Genjutso', blind: false, image: '/rituals/genjutso.png', description: 'Depois do resultado de uma vaza, mesmo se perder, você pode recuperar qualquer criatura que jogou nesta rodada e que ainda esteja no descarte, trocando-a por uma da mão. O resultado não muda.' },
  { kind: 'vaza-premiada', name: 'Vaza Premiada', blind: false, image: '/rituals/vaza-premiada.png', description: 'Escolha a primeira, segunda ou terceira vaza. Se sua equipe vencer a vaza escolhida, ganha 1 ponto extra.' },
  { kind: 'eco-temporal', name: 'Eco Temporal', blind: false, image: '/rituals/eco-temporal.png', description: 'Se sua equipe perder a primeira vaza, recebe +2 de força nas criaturas jogadas na segunda e terceira vazas, exceto Arcanas.' },
  { kind: 'mapa-do-destino', name: 'Mapa do Destino', blind: true, image: '/rituals/mapa-do-destino.png', description: 'Antes de ver as três criaturas novas, anuncie 2–0 ou 2–1. Se sua equipe vencer a rodada com esse placar de vazas, ganha 1 ponto extra.' },
  { kind: 'bencao-das-runas', name: 'Bênção das Runas', blind: false, image: '/rituals/bencao-das-runas.png', description: 'Lance um D6. Se sair par, escolha uma criatura da sua mão para receber +2 de força nesta rodada; se sair ímpar, nada acontece.' },
] as const;

export type RitualKind = typeof RITUALS[number]['kind'];
export interface RitualCard { id: string; kind: RitualKind; name: string; blind: boolean; image?: string; description: string }
export const RITUAL_BY_KIND: Record<RitualKind, typeof RITUALS[number]> = Object.fromEntries(RITUALS.map(card => [card.kind, card])) as Record<RitualKind, typeof RITUALS[number]>;

// Baralho oficial: uma carta de cada uma das 48 artes.
export const RITUAL_TEST_DECK = RITUALS.map(card => `${card.kind}#1`);

export function ritualFromId(id: string): RitualCard {
  const kind = id.split('#')[0] as RitualKind;
  const card = RITUAL_BY_KIND[kind];
  if (!card || !/^[1-4]$/.test(id.split('#')[1] ?? '') || id !== `${kind}#${id.split('#')[1]}`) throw new Error('Ritual desconhecido.');
  return { ...card, id };
}
