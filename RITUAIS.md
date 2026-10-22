# Rituais: 48 cartas jogáveis

Esta especificação registra as decisões do Valney para o baralho separado de Rituais. As 48 cartas têm artes individuais e texto jogável disponível na interface.

## Baralho e mãos

- O baralho oficial usa 48 Rituais distintos, uma cópia de cada arte. O descarte é embaralhado novamente quando o monte acaba.
- Cada jogador recebe três Rituais em uma mão privada.
- Em cada rodada, exatamente um jogador joga um Ritual. O responsável segue a ordem dos assentos: 1 (Equipe A), 2 (Equipe B), 3 (Equipe A), 4 (Equipe B), repetindo. O primeiro responsável acompanha o assento inicial sorteado da partida.
- O Ritual usado sai da mão e vai ao descarte de Rituais. Quando a mão de Rituais de um jogador acabar, ele compra três novas cartas, ou as que restarem no baralho.
- Se faltar carta no baralho, embaralha-se o descarte de Rituais e continua-se a compra. O Ritual ativo da rodada não pode voltar ao baralho antes de terminar seu efeito.
- O baralho e o descarte de Rituais são independentes dos de criaturas. Mago e Bruxa alteram apenas mãos de Rituais.

## Escolha antes ou depois das criaturas

1. Quando existe poder pendente da rodada anterior, o responsável pelo próximo Ritual informa primeiro se jogará **com olhinho** ou **sem olhinho**. Deve ter pelo menos um Ritual dessa modalidade na mão. Essa escolha fica travada.
2. Resolva o poder pendente **antes de escolher e revelar a carta de Ritual**. Com olhinho, as três criaturas novas de cada jogador ficam ocultas; sem olhinho, cada jogador pode ver a própria mão. A carta guardada do Titereiro já é conhecida.
3. O responsável escolhe uma carta de Ritual da modalidade declarada, informa seus parâmetros e aplica seu efeito. Só então a primeira vaza começa.
4. Quando não há poder pendente, permanece o fluxo simples: jogar um Ritual com olhinho antes de ver criaturas ou revelar a própria mão para escolher um Ritual sem olhinho.

O símbolo do olho cortado deve vir acompanhado do texto “Antes de ver as criaturas” na interface. O servidor valida a fase e não envia cartas de criatura aos clientes antes da hora.

## Primeiro lote de implementação

Primeiro lote do novo conjunto enviado pelo Valney:

| Ritual | Momento | Regra impressa | Teste principal |
|---|---|---|---|
| Runa da Vontade | Depois de ver as criaturas | Escolha qual carta será a mais forte da rodada. | Escolhe-se uma criatura, esteja ela ou não na mão. Suas quatro Luas superam todas as demais cartas, inclusive Arcana. Entre elas e entre as outras cartas, mantém-se a ordem normal. |
| Magia Nula | Depois de ver as criaturas | As magias estão desativadas nessa partida. | Valney definiu que bloqueia habilidades de criaturas somente na rodada atual, inclusive poderes de Trick recusado. |
| Trick Explosivo | Depois de ver as criaturas | A rodada começa valendo 3 pontos. | Double, Hat e Poker aceitos levam a 5, 6 e 7 pontos. Na recusa, ganha-se o último valor aceito. |
| Doblete Sombrio | Depois de ver as criaturas | A rodada começa valendo 2 pontos. | Double, Hat e Poker aceitos levam a 4, 5 e 6 pontos. Na recusa, ganha-se o último valor aceito. |

## Segundo lote de implementação

| Ritual | Momento | Regra implementada |
|---|---|---|
| Maldição da Derrota | Depois de ver as criaturas | Ao fim da rodada, a equipe derrotada perde até 3 pontos, sem ficar abaixo de zero. Também vale se o Trick for recusado. |
| Escolha da Anciã | Depois de ver as criaturas | Cada jogador da equipe que jogou o Ritual compra 3 criaturas extras e escolhe 3 criaturas da própria mão para descartar. A primeira vaza só começa após todos terminarem. |
| Véu da Incerteza | Antes de ver as criaturas | Todos escolhem posições de cartas pelo verso nas três vazas da rodada. A carta jogada se revela na mesa. |
| Mão Cega | Antes de ver as criaturas | Quem jogou o Ritual escolhe um adversário. Só esse jogador escolhe cartas pelo verso nas três vazas da rodada. |

## Terceiro lote de implementação

| Ritual | Momento | Regra implementada |
|---|---|---|
| Roubo Arcano | Depois de ver as criaturas | Quem jogou escolhe um adversário e vê, em privado, todas as criaturas que ele tinha na mão naquele momento. A informação fica consultável até o fim da rodada. |
| Espelho Enfeitiçado | Depois de ver as criaturas | Cada parceiro decide separadamente se troca toda a própria mão com a de um adversário. O jogador que jogou o Ritual decide primeiro. Cada adversário só pode ser escolhido uma vez. Jogadores sem cartas passam a vez automaticamente. |
| Olho da Verdade | Depois de ver as criaturas | Quem jogou escolhe um adversário. A mão atual desse jogador fica visível a todos durante a rodada e acompanha cartas jogadas ou trocadas. |
| Acordo de Sangue | Depois de ver as criaturas | Os membros da equipe veem as mãos dos parceiros e votam. Com maioria favorável, a rodada começa valendo 3 pontos; Double, Hat e Poker aceitos levam a 5, 6 e 7. Se a maioria não for mais possível, a equipe adversária recebe 1 ponto e uma nova rodada é distribuída. Em quatro jogadores, os dois parceiros precisam concordar. |

## Quarto lote de implementação

| Ritual | Momento | Regra implementada |
|---|---|---|
| Escudo Arcano | Depois de ver as criaturas | Se a equipe que jogou o Ritual perder, a equipe vencedora perde 1 ponto após receber os pontos da rodada. O placar não cai abaixo de zero; a vitória da partida considera o placar final. |
| Zebra Mística | Depois de ver as criaturas | No momento em que o Ritual é jogado, registra-se qual equipe tem menos pontos. Se essa equipe vencer a rodada, ganha mais 1 ponto. Empate na escolha não concede bônus. |
| Blefe Premiado | Depois de ver as criaturas | A equipe que jogou o Ritual recebe 2 pontos extras se vencer a rodada sem ter jogado nenhuma Arcana nela. Arcanas jogadas pelo rival ou descartadas sem serem jogadas não impedem o bônus. |
| Visão Compartilhada | Depois de ver as criaturas | Durante toda a rodada, cada membro da equipe que jogou o Ritual vê a mão atual dos parceiros. O outro time não recebe essas cartas na visão enviada pelo servidor. |

## Quinto lote de implementação

| Ritual | Momento | Regra implementada |
|---|---|---|
| Cartada Fantasma | Depois de ver as criaturas | A primeira vaza completa decide a rodada, inclusive se a aposta tiver aumentado por Trick. As cartas jogadas permanecem no histórico da rodada. |
| Tempestade de Cartas | Depois de ver as criaturas | Todas as criaturas ainda nas mãos são embaralhadas juntas e redistribuídas. Cada jogador recebe a mesma quantidade que tinha; baralho, descarte e cartas já jogadas ficam fora da mistura. |
| Lua Invertida | Depois de ver as criaturas | A ordem entre criaturas e entre Luas é invertida nesta rodada. Arcanas seguem acima das outras criaturas; entre Arcanas, a ordem das Luas também se inverte. |
| Controle Mental | Depois de ver as criaturas | Cada aliado controla o adversário no assento seguinte, à sua esquerda na ordem circular. Na vez do adversário, ele pode pedir Trick ou entregar a jogada; só depois da entrega o aliado confirma o sorteio de uma criatura da mão dele no servidor. O efeito vale nas vazas da rodada. |

## Sexto lote de implementação

| Ritual | Momento | Regra implementada |
|---|---|---|
| Revelação do Destino | Depois de ver as criaturas | Cada membro da equipe vota. Só com aprovação unânime todos os aliados descartam as três criaturas atuais e compram três novas. Se alguém recusar, ninguém troca. |
| Feitiço Oculto | Antes de ver as criaturas | Cada jogador escolhe a posição 1, 2 ou 3 pelo verso para reservar uma criatura sem saber qual é. Depois que todos escolherem, veem as duas restantes e jogam normalmente nas duas primeiras vazas; na terceira, jogam obrigatoriamente a carta reservada pelo verso. |
| Trick Premiado | Depois de ver as criaturas | A rodada começa valendo 4 pontos. Double, Hat e Poker Trick aceitos elevam a aposta a 6, 7 e 8 pontos. |
| Pacto da Batalha | Depois de ver as criaturas | Quem jogou o Ritual escolhe um aliado, podendo ser ele mesmo, e um adversário. Só esses dois participam das vazas da rodada. A escolha funciona também em salas de 6 e 8 jogadores. |

## Sétimo lote de implementação

| Ritual | Momento | Regra implementada |
|---|---|---|
| Troca de Sortes | Depois de ver as criaturas | Cada aliado decide se quer trocar. Se aceitar, escolhe uma criatura própria, um adversário e uma posição de carta virada da mão dele. O servidor troca as duas sem revelar publicamente quais eram; cada jogador vê sua nova mão. |
| x1 no Dado | Depois de ver as criaturas | Qualquer integrante de cada equipe pode lançar um dado pela sua equipe. O servidor sorteia de 1 a 6, aceita um lançamento por equipe e repete ambos em caso de empate. A equipe com maior resultado vence a rodada e recebe a aposta atual. |
| Estrela Guia | Depois de ver as criaturas | A equipe vencedora da primeira vaza recebe 1 ponto imediatamente, mesmo que perca a rodada. Se esse ponto alcançar o placar alvo, a partida termina. |
| Dívida Arcana | Depois de ver as criaturas | Se a equipe que jogou o Ritual perder, o rival recebe 1 ponto extra por cada Arcana que ela efetivamente jogou nesta rodada. Também se aplica quando a rodada termina por Trick recusado. |

## Oitavo lote de implementação

| Ritual | Momento | Regra implementada |
|---|---|---|
| Magia Acelerada | Depois de ver as criaturas | Quem jogou o Ritual escolhe uma criatura da própria mão, exceto Arcana, descarta e ativa sua habilidade antes da primeira vaza. Esse jogador passa a primeira vaza e volta a jogar na segunda. Precisa ter uma criatura elegível para jogar este Ritual. |
| Magia Duplicada | Depois de ver as criaturas | Quando uma habilidade de criatura é usada nesta rodada, ela se aplica duas vezes. A segunda aplicação abre novas escolhas de alvo e carta. Se o Titereiro encerrar a rodada, pode recuperar duas criaturas distintas e descarta duas das três novas na rodada seguinte. |
| Ritual Oculto | Depois de ver as criaturas | Em cada vaza, os jogadores confirmam suas criaturas em qualquer ordem. A mesa mostra apenas os versos até que todos os jogadores aptos tenham confirmado; então as cartas e o vencedor são revelados juntos. Cada jogador pode pedir Trick antes de confirmar sua própria carta. |
| Enfraquecer | Depois de ver as criaturas | Quem jogou o Ritual pode, uma vez na rodada, escolher uma criatura adversária já jogada, exceto Arcana, e reduzir sua força em 2 nessa vaza. A Arcana continua mais forte. Uma criatura enfraquecida perde para outra do mesmo valor original, mesmo que sua Lua fosse superior. Quando a última carta entra, a resolução espera essa decisão se houver alvo válido; o jogador também pode guardar o poder para outra vaza. |

## Nono lote de implementação

| Ritual | Momento | Regra implementada |
|---|---|---|
| Silêncio da Bruxa | Depois de ver as criaturas | Durante esta rodada, a equipe adversária não pode pedir Trick nem fazer contra-aumento. A equipe que jogou o Ritual ainda pode pedir. |
| Permuta Profana | Depois de ver as criaturas | Cada jogador escolhe uma criatura da própria mão para entregar ao adversário no assento seguinte, à direita. As escolhas são recolhidas antes da troca; depois todas passam ao mesmo tempo. Isso mantém a quantidade de cartas de cada mão e impede escolher uma carta recém-recebida. |
| Ciclo da Lua | Depois de ver as criaturas | A ordem das Luas se inverte nesta rodada: Nova supera Minguante, Crescente e Cheia no desempate entre criaturas de mesmo valor. A ordem de força das criaturas continua normal, inclusive a Arcana. |
| Caldeirão Bipolar | Depois de ver as criaturas | A criatura vencedora de uma vaza fica abaixo de todas as outras criaturas na vaza seguinte, em suas quatro Luas. Isso inclui Arcana. Depois da vaza seguinte, o efeito passa à nova criatura vencedora; termina com a rodada. |

## Décimo lote de implementação

| Ritual | Momento | Regra implementada |
|---|---|---|
| Campeões Ocultos | Antes de ver as criaturas | Quem jogou o Ritual escolhe, pelo verso, uma posição da mão de cada pessoa, inclusive a sua. As outras cartas vão para o descarte. Uma única vaza decide a rodada. |
| Força Oculta | Depois de ver as criaturas | Quem jogou escolhe um tipo de criatura de valor 1 a 6 e lança um D6. O resultado aumenta a força de todas as quatro Luas desse tipo durante a rodada. |
| Turbilhão do Destino | Antes de ver as criaturas | Cada aliado descarta aleatoriamente uma criatura sem olhar. As cartas descartadas são reveladas e aparecem no histórico como a primeira vaza, vencida pela equipe do Ritual. Restam duas vazas normais; cada aliado joga com duas criaturas, e o rival pode terminar com uma carta sem usar. |
| Profecia Maia | Antes de ver as criaturas | Quem jogou anuncia um número de 1 a 9. As criaturas daquele valor que estavam nas mãos de toda a sua equipe ao jogar o Ritual recebem +2 de força nesta rodada. |

O botão **Ver meus Rituais** mostra a própria mão em tamanho maior, inclusive durante a decisão do Mago. No modo de teste solo, mostra a mão do assento atualmente controlado.

## Último lote: cartas 41–48

| Ritual | Momento | Regra implementada |
|---|---|---|
| Névoa de Sussurros | Depois de ver as criaturas | Uma vez na rodada, antes de uma vaza, escolha uma Lua. Ela vence apenas os desempates entre criaturas do mesmo valor nessa vaza. |
| Todos por Um | Depois de ver as criaturas | O autor pode ativar em uma vaza até depois da última carta. Somam-se os valores impressos por equipe, com Arcana valendo zero. Empate favorece a equipe do Ritual. A maior criatura da vencedora define quem inicia a próxima vaza e qual habilidade pode ser usada. |
| Vínculo às Cegas | Antes de ver as criaturas | O autor vê sua mão e compra duas cartas ocultas. Pode trocar zero, uma ou duas cartas próprias por elas. As extras que não pegar passam ao adversário seguinte, que troca o mesmo número de cartas pelo verso. Os descartes são revelados. |
| Genjutso | Depois de ver as criaturas | Depois que uma vaza termina, mesmo perdendo, o autor pode recuperar qualquer criatura que jogou nesta rodada e que ainda esteja no descarte, trocando-a por outra da própria mão. Pode escolher uma carta da primeira vaza após a segunda. O resultado da vaza permanece. Uma vez por rodada. |
| Vaza Premiada | Depois de ver as criaturas | Escolha a vaza 1, 2 ou 3 ao jogar o Ritual. Se a equipe do Ritual vencer a vaza escolhida, ganha um ponto adicional imediatamente. |
| Eco Temporal | Depois de ver as criaturas | Se a equipe do Ritual perder a primeira vaza, todas as suas criaturas não Arcanas jogadas na segunda e na terceira vazas recebem +2. |
| Mapa do Destino | Antes de ver as criaturas | Anuncie 2–0 ou 2–1. Se sua equipe vencer a rodada com esse placar, recebe um ponto adicional. |
| Bênção das Runas | Depois de ver as criaturas | O autor lança D6. Se sair par, escolhe uma carta física da própria mão para receber +2 na rodada. O bônus acompanha a carta se ela mudar de dono. O anúncio público revela apenas a criatura, sem informar a Lua da carta escolhida. |

O baralho de 48 artes está disponível também no menu de teste solo.

## Arquivos de arte

- Exportar **uma frente por arquivo**, em **800 × 1131 ou 1132 px**, conforme o arredondamento do editor para a altura original de 1131,4 px. Manter a mesma medida em todas as cartas, sem margem externa, e enviar PNG ou WebP junto do arquivo editável.
- As 48 artes ativas estão em `packages/web/public/rituals/`. As criaturas ocultas usam `packages/web/public/cards/verso.png`.
- Reservar o centro para ilustração e deixar título, olho cortado e regra com contraste forte. A regra deve ser legível no tamanho físico de celular, mas a interface também mostrará texto ampliável fora da imagem.
- O layout exibirá a arte na proporção recebida, sem esticá-la. Não é necessário criar outra resolução menor.

## Carta guardada pelo Titereiro

- O dono pode escolher um Ritual de olho cortado mesmo conhecendo a criatura que guardou da rodada anterior. A restrição de visão vale para **as três criaturas novas**.
- Com olhinho, depois de declarar a modalidade e antes de escolher a carta de Ritual, ele seleciona **uma das três cartas novas pelo verso** para descartar, sem saber qual é.
- Sem olhinho, pode ver as três novas e escolher qual delas descartar. A carta guardada pelo Titereiro permanece na mão.
- A Fada vê até duas cartas do adversário e descarta uma antes de conhecer o Ritual atual. Com olhinho, não vê suas próprias criaturas novas.
- O Goblin com olhinho entrega uma posição da própria mão sem ver a carta. Após a troca, a carta entregue e a recebida são reveladas a todos, com indicação de ter ou não recebido o ponto. Sem olhinho, escolhe a carta que entrega após ver a própria mão.
- Se o Trick for recusado durante uma rodada de criaturas ocultas, quem pediu escolhe uma posição pelo verso. A criatura virada é revelada a todos antes de resolver a habilidade. Se sair Arcana ou outra criatura sem habilidade, a carta é descartada e não ativa poder.
- O Grifo com olhinho compra e descarta uma posição sem ver as cartas. Sem olhinho, vê a mão e escolhe qual carta descartar.
- Quando Grifo ou Titereiro descartam uma criatura pelo verso, a criatura descartada é revelada a todos depois da escolha. A própria mão continua oculta conforme a modalidade do Ritual.
