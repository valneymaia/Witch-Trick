# Rituais: dezesseis cartas jogáveis

Esta especificação registra as decisões do Valney para o baralho separado de Rituais. Dezesseis cartas receberam artes individuais. O texto jogável também fica disponível na interface.

## Baralho e mãos

- O baralho oficial terá 48 Rituais distintos. Enquanto as regras restantes são implementadas, o baralho de teste usa quatro cópias de cada um dos dezesseis Rituais com arte e regras completas.
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

O botão **Ver meus Rituais** mostra a própria mão em tamanho maior, inclusive durante a decisão do Mago. No modo de teste solo, mostra a mão do assento atualmente controlado.

Mapa do Destino e Silêncio da Bruxa continuam no código e nos testes da etapa anterior, mas não entram no sorteio do lote atual. O sorteio de teste usa quatro cópias de cada um dos dezesseis Rituais com arte e regra ativa. O baralho oficial completo entra em jogo quando as demais artes e regras estiverem prontas.

## Arquivos de arte

- Exportar **uma frente por arquivo**, em **800 × 1131 ou 1132 px**, conforme o arredondamento do editor para a altura original de 1131,4 px. Manter a mesma medida em todas as cartas, sem margem externa, e enviar PNG ou WebP junto do arquivo editável.
- As dezesseis artes ativas estão em `packages/web/public/rituals/`. As criaturas ocultas usam `packages/web/public/cards/verso.png`.
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
