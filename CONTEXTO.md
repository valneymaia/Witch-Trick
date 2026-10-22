# Contexto rápido do Witch's Trick

Este arquivo serve para retomar o desenvolvimento. **Valney Maia Neto** criou o jogo e valida as regras jogando. Decisões novas dele prevalecem sobre textos antigos. Para a descrição completa de cada efeito, consulte `REGRAS.md` e `RITUAIS.md`; para o andamento, consulte `PROGRESSO.md`.

## Estado atual

- Jogo web de vazas para 4, 6 ou 8 pessoas em duas equipes alternadas, com alvo de 15 ou 25 pontos.
- As 40 criaturas (10 tipos × 4 Luas), suas habilidades e os 48 Rituais com artes individuais estão implementados. Cada pessoa recebe 3 criaturas por rodada e mantém uma mão privada de 3 Rituais; um Ritual é obrigatório por rodada.
- Há Double, Hat e Poker Trick, histórico das vazas, placar, leitura ampliada das cartas, modo solo com cenários e salas online por código.
- O servidor aplica e valida as jogadas. Cada cliente recebe somente sua própria mão, salvo revelações expressamente previstas pelas regras. O modo solo que controla todos os assentos é uma exceção para testes.
- Falta validar uma **partida completa com amigos em aparelhos e redes separados**. Os testes automáticos e o teste de conexão existente verificam partes do fluxo, mas ainda não equivalem a essa sessão.

## Decisões de regra que costumam afetar correções

- O responsável pelo Ritual alterna entre as equipes e avança um assento por rodada. Com olhinho, escolhe antes de ver as três criaturas novas; sem olhinho, pode vê-las. Poder de criatura pendente da rodada anterior é resolvido antes de revelar o Ritual atual, respeitando essa escolha de visibilidade.
- Ao vencer uma vaza com criatura, o jogador pode ativar ou pular sua habilidade. Ela entra antes da vaza seguinte; se a rodada acabou, a decisão ocorre agora e o efeito entra na próxima rodada. Quando um Trick é recusado, quem pediu escolhe e descarta uma criatura da mão para ativar seu poder na próxima rodada.
- Trick só pode ser pedido na própria vez, antes de jogar a criatura. O próximo assento responde e pode aceitar, recusar ou contra-aumentar. O valor inicial de Rituais de aposta soma-se aos níveis de Trick; detalhes e exemplos estão em `REGRAS.md`.
- A Fada revela a criatura descartada a todos e faz o alvo passar a próxima vaza. O Titereiro recupera uma criatura já jogada **nesta rodada**, exceto outro Titereiro; se a rodada terminou, a carta recuperada acompanha as três novas e uma dessas três é descartada.
- As cores das equipes são âmbar (A) e verde de poção (B). As Luas, da mais forte para a mais fraca no desempate normal, são Cheia, Crescente, Minguante e Nova. Rituais podem alterar temporariamente essa comparação.

## Onde mexer

| Arquivo ou pasta | Responsabilidade |
| --- | --- |
| `packages/engine/src/engine.ts` e `rituals.ts` | Estado e regras das jogadas. |
| `packages/engine/src/view.ts` | Dados enviados a cada jogador; conferir aqui qualquer mudança de informação oculta. |
| `packages/engine/src/*.test.ts` | Testes de regras e privacidade. |
| `packages/server/src/index.ts` | Salas, Socket.IO, reconexão e bots. |
| `packages/web/src/main.tsx` e `style.css` | Interface, ações do jogador e layout. |
| `packages/web/public/cards/` e `rituals/` | Artes das criaturas e dos Rituais. |

## Como validar

Na raiz do repositório: `pnpm test`, `pnpm simulate` e `pnpm build`. Com `pnpm dev` rodando, `pnpm smoke` verifica o fluxo de rede definido em `scripts/smoke.mjs`; ele cobre cenários específicos e não percorre manualmente os 48 Rituais. O menu **Testar Ritual** prepara cada Ritual no modo solo para reproduzir efeitos. Para validar privacidade e partidas reais, use sala normal em abas ou dispositivos separados.

O roteiro da próxima sessão com amigos está no `README.md`. Ao registrar um bug, guardar tamanho da sala, Ritual, vaza, jogador da vez, ação, resultado esperado, resultado observado e captura de tela. Reproduzir o caso antes de alterar a regra.

## Pendências e limites conhecidos

1. Concluir a primeira partida remota até o placar final e corrigir eventuais travamentos ou divergências entre telas.
2. Analisar os feedbacks de clareza das ações e visualização no celular, sem presumir mudanças nas regras antes da decisão do Valney.
3. Para hospedagem contínua, decidir como manter as salas após reinício do servidor. Hoje o estado fica só na memória; a identidade do jogador fica no `sessionStorage` da aba e permite recuperar o assento ao atualizá-la.

Algumas seções históricas de `REGRAS.md` ainda chamam Rituais e habilidades de “fases futuras”. Isso descreve o MVP original, não o estado atual. As decisões detalhadas dos efeitos em `RITUAIS.md`, o código e os feedbacks recentes devem ser conferidos ao trabalhar nessas áreas.
