# Witch's Trick

Primeira versão jogável do jogo de vazas para 4 jogadores, em duas equipes. A equipe A ocupa os assentos 1 e 3; a B, 2 e 4. Cada pessoa recebe 3 criaturas por rodada. A equipe que vence 2 vazas marca 1 ponto; vence a partida quem chega a 15.

## Rodar

Requer Node.js 22 ou superior e pnpm.

```sh
pnpm install
pnpm dev
```

Abra `http://localhost:5173`. Para jogar pelo celular na mesma rede, abra `http://IP_DO_COMPUTADOR:5173`. Libere as portas 5173 e 3001 no firewall se necessário. O servidor mantém as salas apenas em memória; reiniciar o processo encerra as partidas em andamento.

## Jogar

1. Uma pessoa cria uma sala e compartilha o código de 5 caracteres.
2. Outras três entram com o código. A partida começa quando os quatro assentos estiverem ocupados.
3. Na sua vez, toque em uma carta da mão. O servidor verifica a jogada e distribui o estado atualizado.
4. Se a conexão cair, reabra a página no mesmo navegador. A identidade guardada no `localStorage` recupera o assento.

Para testar sozinho, use **Testar sozinho: controlar os 4 assentos**. A tela mostra a mão de quem está na vez. Também é possível criar uma sala comum e usar **Preencher vagas com bots**.

## Desenvolvimento

- `packages/engine`: regras puras, baralho, redução de ações e visão privada.
- `packages/server`: salas em memória e servidor Socket.IO autoritativo.
- `packages/web`: interface React/Vite/Tailwind em português.
- `packages/web/public/cards`: 40 frentes e um verso, fornecidos por Valney.

```sh
pnpm test
pnpm simulate
pnpm build
```

Com `pnpm dev` aberto em outro terminal, `pnpm smoke` verifica criação de sala, mãos privadas, jogada e reconexão.

As regras de referência ficam em `REGRAS.md`. Criaturas ainda não aplicam efeitos nesta fase.

