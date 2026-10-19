# Rituais: preparação da Fase 2

Esta especificação registra as decisões do Valney para o baralho separado de Rituais. As cartas ainda não estão ativas na partida digital. O PDF `cartas ritual oficial.pdf` é referência visual; o texto jogável será mantido também como dados e texto da interface.

## Baralho e mãos

- O baralho oficial tem 48 Rituais distintos.
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

Quatro Rituais, para exercitar os principais momentos sem ativar uma carta ainda sem regra:

| Ritual | Momento | Regra impressa | Teste principal |
|---|---|---|---|
| Mapa do Destino | Antes de ver as criaturas; olho cortado | Anuncie se sua equipe vencerá por 2–0 ou 2–1. Se acertar, +1 ponto bônus. | O palpite é confirmado antes da revelação e pontua só com o resultado anunciado. |
| Doblete Sombrio | Depois de ver as criaturas | A rodada começa valendo 2 pontos. | Trick parte do valor 2 e a recusa usa o valor já aceito. |
| Magia Nula | Depois de ver as criaturas | As habilidades das criaturas são desativadas nesta rodada. | Bloqueia poderes de vaza e de Trick recusado durante a rodada. |
| Silêncio da Bruxa | Depois de ver as criaturas | Os adversários não podem pedir Trick nesta rodada. | Bloqueia pedido e contra-aumento da equipe adversária; a equipe que jogou o Ritual pode pedir. |

As outras 44 cartas continuam fora do sorteio jogável até que seu texto seja implementado e testado. Essa seleção de quatro é uma proposta para o primeiro ciclo de testes; o baralho completo entra em jogo quando suas regras estiverem prontas.

## Arquivos de arte

- Exportar **uma frente por arquivo**, em **800 × 1248 px**, sem margem externa. Manter o arquivo editável original e enviar PNG ou WebP.
- Nomes sugeridos: `mapa-do-destino.png`, `doblete-sombrio.png`, `magia-nula.png`, `silencio-da-bruxa.png`. O verso terá seu próprio arquivo.
- Reservar o centro para ilustração e deixar título, olho cortado e regra com contraste forte. A regra deve ser legível no tamanho físico de celular, mas a interface também mostrará texto ampliável fora da imagem.
- O layout renderiza a mesma arte menor em telas pequenas. Não é necessário criar outra resolução menor.

## Decisões ainda necessárias ao integrar efeitos

- A carta guardada pelo Titereiro para a rodada seguinte já é conhecida pelo dono antes da escolha de Ritual. Definir se isso impede usar um Ritual de olho cortado ou se a restrição vale apenas para as três criaturas novas.
- Confirmar se os Rituais escolhidos de cada lote são os desejados antes de preparar as artes finais.
