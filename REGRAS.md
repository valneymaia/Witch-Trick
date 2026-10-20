# Witch's Trick: regras para implementação

Fonte da verdade do projeto. Baseado no PDF de regras do jogo físico e nas decisões do Valney. Itens da seção "Pendências" não devem ser inventados: perguntar.

## Escopo do MVP (Fase 1)

**Dentro:** sala online, 4 jogadores em 2 equipes de 2, baralho de 40 criaturas, 3 cartas por jogador, vazas, melhor de 3, desempate pelas Luas, Trick até Poker Trick, placar até 15, fim de partida e reconexão.

**Fora (fases seguintes):** efeitos das criaturas, feitiços (Rituais), 6 e 8 jogadores, animações e menus finais.

Na Fase 1 as criaturas são jogadas sem aplicar nenhum efeito.

## Mesa

- 4 assentos numerados de 0 a 3, em sentido anti-horário.
- Assentos 0 e 2 formam a Equipe A. Assentos 1 e 3 formam a Equipe B (posições alternadas).
- Ordem de jogada: anti-horária, do assento n para o assento (n + 1) mod 4.

## Baralho de criaturas

40 cartas: 10 criaturas x 4 Luas. Cada carta é única e tem um valor e uma Lua.

| Criatura | Valor | Efeito (Fase 2, não implementar no MVP) |
|---|---|---|
| Arcana | sem círculo, maior de todas | sem efeito |
| Corvo | 1 | A equipe adversária perde 2 pontos. |
| O Titereiro | 2 | Recupere qualquer carta já jogada nesta rodada, vencedora ou não, exceto outro Titereiro. Se um Trick for recusado no meio de uma vaza, as cartas já postas na mesa também podem ser escolhidas. Troque a carta recuperada por uma da sua mão. Se a rodada acabou, receba três cartas novas junto com a recuperada e descarte uma das três novas. |
| Lobo | 3 | Até o fim da rodada, a equipe adversária não pode usar os efeitos de criaturas. |
| Fada | 4 | No início da próxima vaza, veja até 2 cartas da mão de um adversário e escolha uma delas para ser descartada. Esse adversário passa a próxima vaza, mesmo que ainda tenha cartas, e volta a jogar na seguinte, se houver. |
| Goblin | 5 | Troque uma criatura sua por uma de um adversário, aleatoriamente. Se a recebida valer menos de 5, sua equipe ganha 1 ponto. |
| Grifo | 6 | No início da próxima vaza, compre uma carta e depois coloque uma carta da sua mão na pilha de descarte. |
| Familiar | 7 | Sua equipe ganha 1 ponto. |
| O Mago | 8 | Revele uma carta de Ritual aleatória de um adversário. Depois escolha se mantém sua mão ou troca uma carta de Ritual sua pela revelada. |
| A Bruxa | 9 | Compre 1 carta extra de ritual e descarte outra da sua mão. Depende dos Rituais (Fase 2). |

## Luas

Da mais forte para a mais fraca:

1. Cheia (roxa)
2. Crescente (amarela)
3. Minguante (cinza)
4. Nova (vermelha)

Como cada carta é única, nunca há empate total entre duas cartas.

## Comparar duas cartas

1. A Arcana vence qualquer carta que não seja Arcana.
2. Senão, vence o maior valor.
3. Se o valor for igual (ou se forem duas Arcanas), vence a Lua mais forte.

## Fluxo da partida

**Início:** o primeiro jogador da primeira rodada é sorteado (no jogo físico, a decisão é por dados). As duas equipes começam com 0 pontos.

**Rodada:**

1. Embaralhar as 40 criaturas e dar 3 a cada jogador.
2. **Vaza:** o jogador inicial joga uma carta e os demais jogam em ordem. A maior carta vence (ver "Comparar duas cartas"). As cartas da vaza vão para a pilha de descarte.
3. Quem venceu a vaza inicia a próxima.
4. A primeira equipe a vencer 2 vazas vence a rodada. Cada rodada tem 2 ou 3 vazas. A equipe vencedora marca o valor aceito para a rodada, inicialmente 1 ponto.
5. Próxima rodada: juntar todas as cartas, embaralhar de novo e iniciar com o jogador seguinte ao que iniciou a rodada anterior.

**Fim da partida:** a primeira equipe a chegar a 15 pontos vence.

## Pedido de Trick

- O jogador da vez pode pedir um Trick **antes de jogar sua carta**, em qualquer momento da rodada. Enquanto o pedido está pendente, ninguém joga carta.
- O próximo assento na ordem de jogada responde. Se quem pediu é o último a jogar naquela vaza, responde o primeiro jogador daquela mesma vaza.
- Na rodada comum, a sequência é: 1 ponto inicial → **Double Trick** (2) → **Hat Trick** (3) → **Poker Trick** (4). Poker é o último nível de Trick.
- Doblete Sombrio inicia em 2 pontos e Double, Hat e Poker aceitos levam a 4, 5 e 6. Trick Explosivo inicia em 3 e os mesmos níveis levam a 5, 6 e 7. O valor inicial do Ritual soma-se ao nível aceito; a rodada comum mantém os valores 2, 3 e 4.
- Aceitar eleva o valor da rodada e mantém a vez com quem pediu, que ainda pode escolher sua carta.
- Em vez de aceitar ou recusar, quem recebe o pedido pode **contra-aumentar imediatamente** para o próximo nível, se ainda existir. Isso aceita o valor pedido e devolve a decisão a quem acabou de pedir. O turno de jogar carta continua pausado até terminar a sequência. Se o novo pedido for recusado, a equipe que contra-aumentou recebe o valor já aceito.
- Recusar encerra a rodada imediatamente. A equipe de quem pediu ganha o valor **anterior já aceito**. Na rodada comum: 1 ao recusar Double, 2 ao recusar Hat, 3 ao recusar Poker. Em rodada com Doblete ou Trick Explosivo, usa-se o valor inicial ou a soma do último Trick aceito.
- Depois de um aumento aceito, somente a equipe adversária pode pedir o próximo aumento durante as jogadas. O pedido pode vir de qualquer um dos dois jogadores dessa equipe, desde que seja sua vez antes da carta. O contra-aumento é a resposta imediata ao pedido pendente.
- A equipe que ganha duas vazas recebe o valor aceito, limitado ao placar alvo de 15. A rodada seguinte recomeça em 1 ponto.
- A tela mostra três luas na ordem das vazas: âmbar para a Equipe A, verde de poção para a Equipe B. Luas restantes ficam neutras. O resultado da rodada anterior preserva seu histórico de luas.

## Decisões assumidas para o MVP

Valem até o Valney dizer o contrário. Fáceis de trocar, então mantenha isoladas em constantes ou funções pequenas.

1. **Início da próxima rodada.** O PDF diz "o jogador imediatamente à esquerda de quem iniciou a rodada anterior". Assumido: é o próximo na ordem de jogada (assento + 1).
2. **Pontos por rodada.** A rodada comum começa em 1 ponto e chega a 4 com Poker. Com os Rituais de aposta, chega a 6 (Doblete) ou 7 (Trick Explosivo).
3. **Carta que sobra.** Se a rodada acaba em 2 vazas, a terceira carta de cada jogador volta ao baralho sem efeito.

## Efeitos das criaturas (referência para a Fase 2)

- O jogador que vence a vaza **pode** aplicar o efeito da carta com que ganhou (é opcional).
- Há três momentos de efeito: na hora, "no início da próxima vaza" e "até o fim da rodada". O motor deve suportar os três desde o começo, mesmo sem usá-los no MVP.
- A Arcana não tem efeito.
- Mago e Bruxa mexem com cartas de Ritual, então só funcionam depois que os Rituais existirem.

## Pendências (perguntar antes de implementar)

1. **Lobo vermelho.** O texto da carta diz "efeitos de Feitiços". Tratar como "efeitos de criaturas".

## Rituais (Fase 2)

O baralho oficial terá 48 Rituais. Cada jogador recebe três cartas de Ritual; uma carta é jogada por rodada pelo responsável, alternando as equipes e avançando pelos quatro assentos. As cartas com olho cortado são escolhidas antes de revelar as novas mãos de criaturas; as demais podem ser escolhidas depois. O Ritual usado vai ao descarte separado. Uma mão de Rituais vazia é reposta com três cartas; o descarte é reembaralhado quando o baralho acaba. A especificação de fases, artes e primeiro lote está em `RITUAIS.md`.

## Para fases futuras

- "Magia Acelerada" aparece duas vezes com efeitos diferentes. Renomear uma.
- Padronizar os termos "criatura", "feitiço", "ação", "naipe" (parece ser a Lua) e "partida" no lugar de "rodada" em algumas cartas.
- 6 e 8 jogadores: definir tamanho da mão e ordem de jogada.
