# Witch's Trick

Jogo de vazas criado por **Valney Maia Neto**. A sala aceita 4, 6 ou 8 jogadores em duas equipes, com vitória em 15 ou 25 pontos. Os assentos ímpares pertencem à Equipe A; os pares, à B. Cada pessoa recebe 3 criaturas por rodada. A equipe que vence 2 vazas marca o valor da rodada, inicialmente 1 ponto.

## Rodar

Requer Node.js 22 ou superior e pnpm.

```sh
pnpm install
pnpm dev
```

Abra `http://localhost:5173`. O servidor mantém as salas apenas em memória; reiniciar o processo encerra as partidas em andamento.

### Testar com amigos

1. No computador que roda `pnpm dev`, execute `ipconfig` e encontre o endereço IPv4 da rede local (por exemplo, `192.168.0.15`).
2. Deixe computador, celular e tablet na **mesma rede Wi-Fi**. Em cada dispositivo, abra `http://IP_DO_COMPUTADOR:5173`. No próprio computador, `http://localhost:5173` também funciona. Se a página não abrir, libere a porta **5173** no firewall do computador. O navegador usa essa mesma porta para as jogadas online.
3. Em uma aba/dispositivo, escolha um nome, 4, 6 ou 8 jogadores e o alvo de 15 ou 25 pontos; clique em **Criar sala**. Os amigos entram com o código de 5 caracteres. A partida começa quando todos os assentos estiverem ocupados.
4. Cada aba agora tem sua própria identidade. Atualizar a mesma aba recupera o assento; uma aba nova representa outro jogador. Evite **Duplicar guia**, pois alguns navegadores copiam a identidade da aba original.
5. Para testar a partida entre amigos, crie uma sala normal. A opção **Testar sozinho** controla todos os assentos em uma única tela.

Para jogar com pessoas em **outras redes**, mantenha `pnpm dev` aberto e exponha a porta 5173 com um túnel HTTPS temporário: `cloudflared tunnel --url http://localhost:5173`. Se o comando não estiver instalado, baixe o executável para Windows na [página oficial da Cloudflare](https://developers.cloudflare.com/tunnel/downloads/). Compartilhe o endereço `https://…trycloudflare.com` e o código da sala no Discord. O túnel e o computador precisam continuar ligados durante a partida. O endereço muda quando o túnel é reiniciado.

## Jogar

1. Uma pessoa cria uma sala e compartilha o código de 5 caracteres.
2. Os demais entram com o código. A partida começa quando os 4, 6 ou 8 assentos escolhidos estiverem ocupados.
3. No começo de cada rodada, o jogador indicado escolhe um Ritual de sua mão. Se tiver o símbolo do olho cortado, escolha antes de revelar as três criaturas novas. Os outros Rituais são escolhidos após revelar as criaturas. Na sua vez de jogar, antes de tocar numa criatura, você pode pedir Double, Hat ou Poker Trick. O próximo jogador aceita, recusa ou já aumenta para o próximo Trick. Se recusar, a equipe que pediu recebe o último valor aceito. Sem Ritual de aposta, Double, Hat e Poker aceitos valem 2, 3 e 4 pontos. Com Doblete Sombrio, valem 4, 5 e 6; com Trick Explosivo, 5, 6 e 7. Ao contra-aumentar, o pedido anterior é aceito e quem pediu primeiro passa a responder.
4. Toque em uma carta da mão para jogar. As três luas no topo mostram quem ganhou cada vaza em ordem: âmbar para a Equipe A, verde de poção para a B.
5. Ao vencer uma vaza com uma criatura que possui habilidade, escolha **Usar habilidade** ou **Pular habilidade**. O efeito entra antes da vaza seguinte. Se a vaza encerrou a rodada, a decisão é feita agora e o efeito entra na rodada seguinte.
6. Quando um Trick é recusado, quem pediu escolhe uma carta da própria mão, descarta essa carta e ativa a habilidade na rodada seguinte. Também pode pular.
7. Use **Ler carta** para ampliar a arte e ver o texto da habilidade em fonte legível no PC ou celular. Use **Ver meus Rituais** para consultar sua mão de Rituais, inclusive ao decidir a habilidade do Mago. Mago revela um Ritual aleatório de um adversário e permite escolher se deseja trocar por um da própria mão; Bruxa compra um Ritual e descarta um. Arcana não possui habilidade.
8. Se a conexão cair, atualize a mesma aba. A identidade guardada no `sessionStorage` recupera o assento enquanto essa aba existir.

Para testar sozinho, use **Testar sozinho: controlar os assentos**. A tela mostra a mão de quem está na vez. Em salas de 4, a barra **Testar habilidade** permite preparar uma vaza ou um Trick recusado. Também é possível criar uma sala comum e usar **Preencher vagas com bots**.

Para testar o Titereiro após Trick recusado, selecione **O Titereiro** e **Simular Trick recusado**. Arcana, Mago e Fada já estarão na mesa. Escolha o Titereiro da mão, recupere uma dessas cartas e descarte uma das três cartas novas da rodada seguinte.

No teste solo de 4 pessoas, **Testar Ritual → Preparar Ritual** reinicia a partida com o Ritual escolhido na mão do Jogador 1. Assim dá para testar cada um dos doze efeitos sem esperar o sorteio.

Os doze Rituais do baralho de teste incluem Maldição da Derrota, Escolha da Anciã, Véu da Incerteza e Mão Cega. Na Anciã, cada aliado compra três criaturas extras e descarta três antes da primeira vaza. No Véu, todos jogam pelo verso; na Mão Cega, só o adversário escolhido joga pelo verso. A escolha cega vale durante toda a rodada. No Acordo de Sangue, a equipe decide por maioria; com 4 jogadores, ambos os parceiros precisam concordar.

As cartas ocultas usam a arte oficial `verso.png`. Quando um Trick é recusado, a criatura escolhida para o poder é revelada a todos, mesmo se não tiver habilidade. A troca do Goblin também revela a carta entregue e a recebida, e informa se o valor recebido deu 1 ponto.
Descartes feitos pelo verso com Grifo ou Titereiro também são revelados depois da escolha. O Goblin ganha o ponto quando recebe uma criatura de valor **5 ou menos**.

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

Com `pnpm dev` aberto em outro terminal, `pnpm smoke` verifica salas de 4, 6 e 8 jogadores, mãos privadas, Trick, jogada e reconexão.

As regras de referência ficam em `REGRAS.md`. Estão ativos os poderes de Corvo, Titereiro, Lobo, Fada, Goblin, Grifo, Familiar, Mago e Bruxa. Arcana não tem poder. O baralho oficial de Rituais terá 48 artes diferentes; por enquanto o baralho de teste usa quatro cópias de cada um dos doze efeitos implementados. As artes recebidas estão em `packages/web/public/rituals/` e podem ser ampliadas durante o jogo. Veja `RITUAIS.md` para as regras e pendências deste lote.
