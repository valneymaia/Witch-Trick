# Witch's Trick online

Versão web do jogo de cartas/tabuleiro Witch's Trick, para jogar com amigos (em call no Discord, cada um no seu dispositivo). Sem monetização e sem contas de usuário.

## Como trabalhamos

- Eu (Valney) dirijo o projeto e valido jogando. Você implementa.
- Responda em português, de forma curta e natural, sem travessões.
- Antes de codar cada tarefa, proponha um plano curto e espere meu OK.
- Tarefas pequenas. Ao terminar cada uma: testes passando, commit com mensagem clara e atualização do `PROGRESSO.md` (o que foi feito, próximo passo, bugs conhecidos).
- Cada bug que eu achar jogando vira um teste antes da correção.
- Não implemente nada fora do escopo da fase atual.

## Fonte da verdade

`REGRAS.md` define as regras do jogo. Se algo estiver ambíguo ou listado nas pendências, pergunte. Não invente regra. As "Decisões assumidas" do `REGRAS.md` valem até eu dizer o contrário.

## Stack

- TypeScript em tudo, pnpm workspaces.
- `packages/engine`: regras puras, sem rede nem interface, testadas com Vitest.
- `packages/server`: Node + Socket.IO. Salas por código, servidor autoritativo.
- `packages/web`: React + Vite + Tailwind, com tema roxo de bruxas. Animações só mais tarde.
- Sem banco de dados: o estado das partidas fica em memória.
- Hospedagem: no início roda na minha máquina, depois num VPS. Tudo deve subir com um comando (`pnpm dev`).

## Regras de arquitetura

1. **Motor puro e determinístico.** Cada jogada é uma função do tipo `reduce(state, action) => state`. A aleatoriedade (embaralhar, sorteio) vem de um gerador com seed injetado, para os testes serem reproduzíveis.
2. **O servidor manda.** Ele valida cada ação com o motor antes de atualizar o estado. O cliente nunca calcula o resultado.
3. **Informação privada.** O cliente só recebe a própria mão e a quantidade de cartas dos outros. Deve existir uma função `viewFor(state, playerId)` com testes que garantam isso.
4. **Preparar para o futuro.** Efeitos temporários, modificadores de força e habilidades "no início da próxima vaza" ou "até o fim da rodada" entram depois. As ações de Trick já estão no motor. Modele efeitos futuros como dados no estado (lista de efeitos ativos com escopo e gatilho), nunca como ifs espalhados.
5. **Reconexão.** Cada aba tem um `playerId` guardado no sessionStorage. Se a conexão cair ou a página for atualizada na mesma aba, reassume o mesmo assento na mesma sala.
6. **Dados das cartas num único lugar.** Um arquivo com id, tipo, valor, Lua, caminho da imagem e chave de efeito. Os efeitos ficam em módulos separados, um por criatura.

## Nomes

- **Criatura**: carta jogada nas vazas (40 cartas). O PDF antigo de regras chama de "Feitiço".
- **Feitiço**: carta de Ritual (fora do MVP).
- Identificadores no código em inglês (`Creature`, `Spell`, `Moon`, `Trick`). Textos da interface em português.
- Luas, da mais fraca para a mais forte: `new` (Nova, vermelha), `waning` (Minguante, cinza), `waxing` (Crescente, amarela), `full` (Cheia, roxa).

## Imagens das cartas

- Criaturas já importadas: PNG de 800 x 1250 px. Novos Rituais: arte individual de 800 x 1248 px, conforme decisão posterior do Valney. Cada carta ocupa a página inteira.
- Ficam em `packages/web/public/cards/`, com nomes sem acento no formato `<criatura>-<lua>.png`. Exemplos: `bruxa-cheia.png`, `mago-nova.png`, `arcana-crescente.png`, e `verso.png` para o verso.
- Se os arquivos vierem com o nome da cor em vez da Lua, mapeie: roxa = cheia, amarela = crescente, cinza = minguante, vermelha = nova.
- Se vierem como zip numerado do Canva, a ordem das Luas dentro de cada criatura é: roxa, amarela, cinza, vermelha. Confirme comigo a ordem das criaturas antes de renomear em massa.
- Se uma imagem ainda não existir, desenhe a carta em CSS (nome, valor e Lua) como substituta.

## Testes

- Vitest no motor, com pelo menos um teste por regra do `REGRAS.md`.
- Script `pnpm simulate`: bots aleatórios jogam milhares de partidas com seeds diferentes e verificam invariantes (40 cartas únicas, a partida sempre termina, vazas e rodadas seguem as regras).
- Modo de teste na interface: botão para preencher assentos com bots e opção de controlar todos os assentos numa aba só.

## Ordem das tarefas da Fase 1

1. Esqueleto do projeto (engine, server, web) com Vitest configurado.
2. Motor: baralho de 40, distribuir, jogar criatura, vencer a vaza (valor, Luas, Arcana), melhor de 3, placar até 15, com testes.
3. Script de bots jogando partidas inteiras.
4. Servidor: salas por código, 4 assentos, mão privada e reconexão.
5. Tela: lobby, mesa, mão, jogar carta, placar, mais o modo de teste com bots.
6. Primeira partida de verdade, com celular e PC.

## Escopo atual

Fase 1, o MVP. Veja a seção "Escopo do MVP" no `REGRAS.md`.

