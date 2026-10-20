# Rituais: primeiro lote jogável

Esta especificação registra as decisões do Valney para o baralho separado de Rituais. O primeiro lote de quatro cartas recebeu artes individuais de `ritual (1).zip`, todas em 800 × 1132 px. O texto jogável também fica disponível na interface.

## Baralho e mãos

- O baralho oficial terá 48 Rituais distintos. Enquanto as regras restantes são implementadas, o baralho de teste usa quatro cópias de cada um dos quatro Rituais do primeiro lote com arte.
- Cada jogador recebe três Rituais em uma mão privada.
- Em cada rodada, exatamente um jogador joga um Ritual. O responsável segue a ordem dos assentos: 1 (Equipe A), 2 (Equipe B), 3 (Equipe A), 4 (Equipe B), repetindo. O primeiro responsável acompanha o assento inicial sorteado da partida.
- O Ritual usado sai da mão e vai ao descarte de Rituais. Quando a mão de Rituais de um jogador acabar, ele compra três novas cartas, ou as que restarem no baralho.
- Se faltar carta no baralho, embaralha-se o descarte de Rituais e continua-se a compra. O Ritual ativo da rodada não pode voltar ao baralho antes de terminar seu efeito.
- O baralho e o descarte de Rituais são independentes dos de criaturas. Mago e Bruxa alteram apenas mãos de Rituais.

## Escolha antes ou depois das criaturas

1. No começo da rodada, as novas mãos de criaturas ficam ocultas para todos.
2. O responsável pode jogar um Ritual marcado com **olho cortado** nesse momento. A escolha e os parâmetros do Ritual são confirmados antes de revelar as novas criaturas.
3. Se preferir ver sua mão de criaturas, o responsável abre a distribuição para todos. Depois disso, só pode escolher um Ritual **sem** olho cortado.
4. Após a escolha, todos recebem a visão privada normal da própria mão de criaturas e a rodada de vazas começa.

O símbolo do olho cortado deve vir acompanhado do texto “Antes de ver as criaturas” na interface. O servidor valida a fase e não envia cartas de criatura aos clientes antes da hora.

## Primeiro lote de implementação

Primeiro lote do novo conjunto enviado pelo Valney:

| Ritual | Momento | Regra impressa | Teste principal |
|---|---|---|---|
| Runa da Vontade | Depois de ver as criaturas | Escolha qual carta será a mais forte da rodada. | Escolhe-se uma criatura, esteja ela ou não na mão. Suas quatro Luas superam todas as demais cartas, inclusive Arcana. Entre elas e entre as outras cartas, mantém-se a ordem normal. |
| Magia Nula | Depois de ver as criaturas | As magias estão desativadas nessa partida. | Valney definiu que bloqueia habilidades de criaturas somente na rodada atual, inclusive poderes de Trick recusado. |
| Trick Explosivo | Depois de ver as criaturas | A rodada começa valendo 3 pontos. | Double, Hat e Poker aceitos levam a 5, 6 e 7 pontos. Na recusa, ganha-se o último valor aceito. |
| Doblete Sombrio | Depois de ver as criaturas | A rodada começa valendo 2 pontos. | Double, Hat e Poker aceitos levam a 4, 5 e 6 pontos. Na recusa, ganha-se o último valor aceito. |

Mapa do Destino e Silêncio da Bruxa continuam no código e nos testes da etapa anterior, mas não entram no sorteio do lote atual. As próximas oito artes recebidas ficam para lotes posteriores: Maldição da Derrota, Escolha da Anciã, Roubo Arcano, Espelho Enfeitiçado, Olho da Verdade, Véu da Incerteza, Mão Cega e Acordo de Sangue. O baralho completo entra em jogo quando as 48 regras estiverem prontas.

## Arquivos de arte

- Exportar **uma frente por arquivo**, em **800 × 1131 ou 1132 px**, conforme o arredondamento do editor para a altura original de 1131,4 px. Manter a mesma medida em todas as cartas, sem margem externa, e enviar PNG ou WebP junto do arquivo editável.
- As quatro artes do lote atual estão em `packages/web/public/rituals/`: `runa-da-vontade.png`, `magia-nula.png`, `trick-explosivo.png` e `doblete-sombrio.png`. O verso terá seu próprio arquivo quando for enviado.
- Reservar o centro para ilustração e deixar título, olho cortado e regra com contraste forte. A regra deve ser legível no tamanho físico de celular, mas a interface também mostrará texto ampliável fora da imagem.
- O layout exibirá a arte na proporção recebida, sem esticá-la. Não é necessário criar outra resolução menor.

## Carta guardada pelo Titereiro

- O dono pode escolher um Ritual de olho cortado mesmo conhecendo a criatura que guardou da rodada anterior. A restrição de visão vale para **as três criaturas novas**.
- Se escolher um Ritual de olho cortado, ele seleciona **uma das três cartas novas pelo verso** para descartar, sem saber qual é. Só então as duas novas restantes são reveladas, junto com a carta guardada.
- Se escolher ver as criaturas e depois jogar um Ritual sem olho cortado, ele pode ver as três novas e escolher qual delas descartar. A carta guardada pelo Titereiro permanece na mão.
