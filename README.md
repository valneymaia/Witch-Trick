# Witch's Trick

Versão jogável do jogo de vazas para 4 jogadores, em duas equipes. A equipe A ocupa os assentos 1 e 3; a B, 2 e 4. Cada pessoa recebe 3 criaturas por rodada. A equipe que vence 2 vazas marca o valor da rodada, inicialmente 1 ponto; vence a partida quem chega a 15.

## Rodar

Requer Node.js 22 ou superior e pnpm.

```sh
pnpm install
pnpm dev
```

Abra `http://localhost:5173`. O servidor mantém as salas apenas em memória; reiniciar o processo encerra as partidas em andamento.

### Testar com quatro dispositivos ou abas

1. No computador que roda `pnpm dev`, execute `ipconfig` e encontre o endereço IPv4 da rede local (por exemplo, `192.168.0.15`).
2. Deixe computador, celular e tablet na **mesma rede Wi-Fi**. Em cada dispositivo, abra `http://IP_DO_COMPUTADOR:5173`. No próprio computador, `http://localhost:5173` também funciona. Se a página não abrir, libere a porta **5173** no firewall do computador. O navegador usa essa mesma porta para as jogadas online.
3. Em uma aba/dispositivo, escolha um nome e clique em **Criar sala**. Nos outros três, abra uma **nova aba pelo endereço** ou use outro dispositivo, escolha nomes distintos e entre com o código de 5 caracteres.
4. Cada aba agora tem sua própria identidade. Atualizar a mesma aba recupera o assento; uma aba nova representa outro jogador. Evite **Duplicar guia**, pois alguns navegadores copiam a identidade da aba original.
5. Para esse teste, crie uma sala normal. A opção **Testar sozinho** controla os quatro assentos em uma única tela.

## Jogar

1. Uma pessoa cria uma sala e compartilha o código de 5 caracteres.
2. Outras três entram com o código. A partida começa quando os quatro assentos estiverem ocupados.
3. No começo de cada rodada, o jogador indicado escolhe um Ritual de sua mão. Se tiver o símbolo do olho cortado, escolha antes de revelar as três criaturas novas. Os outros Rituais são escolhidos após revelar as criaturas. Na sua vez de jogar, antes de tocar numa criatura, você pode pedir Double, Hat ou Poker Trick. O próximo jogador aceita, recusa ou já aumenta para o próximo Trick. Se recusar, a equipe que pediu recebe o valor anterior. Se aceitar, a rodada passa a valer 2, 3 ou 4 pontos. Ao contra-aumentar, o pedido anterior é aceito e quem pediu primeiro passa a responder.
4. Toque em uma carta da mão para jogar. As três luas no topo mostram quem ganhou cada vaza em ordem: âmbar para a Equipe A, verde de poção para a B.
5. Ao vencer uma vaza com uma criatura que possui habilidade, escolha **Usar habilidade** ou **Pular habilidade**. O efeito entra antes da vaza seguinte. Se a vaza encerrou a rodada, a decisão é feita agora e o efeito entra na rodada seguinte.
6. Quando um Trick é recusado, quem pediu escolhe uma carta da própria mão, descarta essa carta e ativa a habilidade na rodada seguinte. Também pode pular.
7. Use **Ler carta** para ampliar a arte e ver o texto da habilidade em fonte legível no PC ou celular. Mago troca um Ritual da mão por um Ritual aleatório de um adversário; Bruxa compra um Ritual e descarta um. Arcana não possui habilidade.
8. Se a conexão cair, atualize a mesma aba. A identidade guardada no `sessionStorage` recupera o assento enquanto essa aba existir.

Para testar sozinho, use **Testar sozinho: controlar os 4 assentos**. A tela mostra a mão de quem está na vez. Na barra **Testar habilidade**, selecione uma criatura e clique em **Vencer vaza com esta carta** ou **Simular Trick recusado**. Isso reinicia a partida de teste com cartas preparadas, permitindo testar até o Corvo sem depender do sorteio. Também é possível criar uma sala comum e usar **Preencher vagas com bots**.

Para testar o Titereiro após Trick recusado, selecione **O Titereiro** e **Simular Trick recusado**. Arcana, Mago e Fada já estarão na mesa. Escolha o Titereiro da mão, recupere uma dessas cartas e descarte uma das três cartas novas da rodada seguinte.

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

Com `pnpm dev` aberto em outro terminal, `pnpm smoke` verifica quatro jogadores, mãos privadas, Trick com contra-aumento, jogada e reconexão.

As regras de referência ficam em `REGRAS.md`. Estão ativos os poderes de Corvo, Titereiro, Lobo, Fada, Goblin, Grifo, Familiar, Mago e Bruxa. Arcana não tem poder. O baralho oficial de Rituais terá 48 artes diferentes; por enquanto o baralho de teste usa quatro cópias de cada um destes efeitos: Mapa do Destino, Doblete Sombrio, Magia Nula e Silêncio da Bruxa. As artes ainda serão substituídas pelos arquivos individuais de 800 × 1131 ou 1132 px.
