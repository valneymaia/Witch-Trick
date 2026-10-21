# Progresso

## Fase 1: versão jogável inicial

- [x] Monorepo TypeScript com pnpm, motor, servidor e interface.
- [x] Quarenta cartas nomeadas e artes em quatro Luas, mais o verso.
- [x] Motor com distribuição por seed, vez, comparação de cartas, vazas, rodadas e placar até 15.
- [x] Visão privada para cada jogador e testes das regras principais.
- [x] Simulador de partidas com verificação de invariantes.
- [x] Salas por código, quatro assentos, servidor autoritativo e reconexão por identidade local.
- [x] Lobby, mesa, mão, placar, preenchimento com bots e controle dos quatro assentos em uma aba.
- [x] Três luas sequenciais no topo, com âmbar para a Equipe A e verde de poção para a B; histórico da rodada anterior.
- [x] Double Trick, Hat Trick e Poker Trick: pedir antes da carta, resposta do próximo assento, aceite/recusa, aumento alternado e pontuação até 4 na rodada comum ou até 7 com Ritual de aposta.
- [x] Resposta com contra-aumento imediato, com turno pausado e decisão devolvida ao jogador que pediu primeiro.
- [x] Identidade por aba para testar quatro jogadores no mesmo navegador, além de dispositivos separados na mesma rede.
- [x] Layout de mesa mais compacto no PC e mão do jogador que responde visível no modo de teste.
- [x] Habilidades de Corvo, Titereiro, Lobo, Fada, Goblin, Grifo e Familiar, com escolha privada do jogador, validação no servidor e ativação na vaza ou rodada seguinte.
- [x] Trick recusado: quem pediu escolhe e descarta uma carta da mão para usar a habilidade na próxima rodada.
- [x] Leitura ampliada da carta e do poder no PC e no celular.
- [x] Cenários solo para vencer uma vaza ou simular recusa com qualquer criatura disponível.
- [x] Titereiro recupera carta vencedora ou perdedora já jogada na rodada, inclusive da vaza interrompida por Trick recusado; se a rodada terminou, recebe três cartas novas mais a recuperada e descarta uma das três novas.
- [x] Cenário solo de Trick recusado com Titereiro deixa Arcana, Mago e Fada na mesa para testar a recuperação sem depender do sorteio.
- [x] Fada faz o adversário passar a próxima vaza mesmo quando ele ainda tem cartas; o adversário volta a jogar na vaza seguinte, se houver. A mesa indica quem está passando.
- [x] Validação: 33 testes do motor, 2.000 partidas simuladas e compilação. Interface solo conferida no navegador com Arcana, Mago e Fada elegíveis após Trick recusado, Arcana entrando como quarta carta na nova mão e descarte obrigatório de uma das três novas; teste de integração com quatro jogadores e contra-aumento realizado na etapa anterior.

## Próximo passo

Validar com amigos em dispositivos e redes separados uma partida de 6 ou 8 pessoas até 25 pontos. Depois continuar os Rituais em lotes de quatro até completar as 48 cartas.

## Preparação dos Rituais

- [x] Baralho oficial de 48 cartas confirmado; três Rituais privados por jogador.
- [x] Um Ritual obrigatório por rodada, alternando equipe e jogador responsável.
- [x] Momento de escolha definido para cartas com ou sem olho cortado.
- [x] Dimensão das novas artes ajustada à disponibilidade do editor: 800 × 1131 ou 1132 px; um arquivo por carta.
- [x] Primeiro lote e pontos de teste documentados em `RITUAIS.md`.
- [x] Primeiro protótipo: Mapa do Destino, Doblete Sombrio, Magia Nula e Silêncio da Bruxa. Mapa e Silêncio continuam testáveis no código, mas saíram do sorteio do lote atual.
- [x] Titereiro com Ritual de olho cortado: carta guardada conhecida; descarte cego de uma das três criaturas novas antes de revelá-las.
- [x] Fluxo de Rituais no motor, servidor e interface; primeiro lote jogável com arte provisória em texto.
- [x] Mago revela um Ritual aleatório de um adversário e permite decidir se troca ou mantém a mão; Bruxa compra e descarta um Ritual.
- [x] Antes de resolver poder pendente, responsável pelo Ritual declara com ou sem olhinho. Titereiro, Fada, Goblin e Grifo usam a visibilidade correspondente; só depois o Ritual é escolhido e aplicado.
- [x] Goblin com olhinho entrega criatura pelo verso; a troca e o ponto são revelados a todos. Fada age antes de Runa da Vontade ou qualquer outro Ritual atual.
- [x] Validação desta correção: 54 testes do motor, compilação dos três pacotes, 1.000 partidas simuladas com Rituais e teste de sala com quatro conexões.
- [x] Segundo lote com arte recebida em 800 × 1132 px: Runa da Vontade, Magia Nula, Trick Explosivo e Doblete Sombrio. Arte ampliável e regra textual na interface.
- [x] Runa fortalece as quatro Luas da criatura escolhida acima de todas as demais, inclusive Arcana; Magia Nula bloqueia habilidades de criaturas somente na rodada atual.
- [x] Doblete e Trick Explosivo mantêm o valor inicial e aceitam a sequência completa Double → Hat → Poker. Valores aceitos: 4/5/6 com Doblete e 5/6/7 com Trick Explosivo; recusa entrega o último valor aceito.
- [x] 46 testes do motor, 1.000 partidas simuladas com Rituais e compilação. Teste de integração local com quatro conexões, escolha de Ritual, mãos privadas, Trick e reconexão realizado na etapa anterior.
- [x] Terceiro lote: Maldição da Derrota, Escolha da Anciã, Véu da Incerteza e Mão Cega, com as quatro artes recebidas.
- [x] Anciã compra três criaturas extras para cada jogador de sua equipe; cada um escolhe três descartes antes da primeira vaza.
- [x] Véu oculta as quatro mãos; Mão Cega oculta só o adversário escolhido. A seleção pelo verso dura as três vazas e é validada no servidor.
- [x] Botão para consultar a própria mão de Rituais, inclusive durante a habilidade do Mago.
- [x] Validação do terceiro lote: 58 testes do motor, 1.000 partidas simuladas com Rituais e compilação.
- [x] Cartas ocultas exibem a arte oficial `verso.png`. Após Trick recusado, a criatura escolhida é revelada a todos, inclusive Arcana sem poder. A troca do Goblin mostra as duas criaturas e se rendeu ponto.
- [x] Testes de regressão para revelação pública em quatro visões, Arcana escolhida às cegas e resultado com e sem ponto do Goblin.
- [x] Descartes cegos do Grifo e do Titereiro revelados para os quatro jogadores após a escolha.
- [x] Goblin ganha 1 ponto se a criatura recebida valer 5 ou menos, inclusive outro Goblin; regra, texto e teste atualizados.
- [x] Menu solo permite escolher um dos oito Rituais ativos e reiniciar com ele na mão do Jogador 1 para testar seu efeito.
- [x] Validação desta etapa: 61 testes do motor, 1.000 partidas simuladas com Rituais, compilação e teste de sala com quatro conexões e seletor de Ritual.
- [x] Proxy do Vite aceita WebSocket do Socket.IO. Túnel temporário Cloudflare abriu a página e passou o teste de sala com quatro clientes, mãos privadas, Trick e reconexão por uma URL pública.
- [x] Vite aceita subdomínios temporários `trycloudflare.com`, permitindo abrir o jogo pelo túnel sem liberar hosts arbitrários.
- [x] Quarto conjunto de artes importado: Roubo Arcano, Espelho Enfeitiçado, Olho da Verdade e Acordo de Sangue. Roubo mostra uma fotografia privada da mão adversária; Olho mostra a mão atual a todos; Espelho troca mãos inteiras com decisões individuais e alvos distintos; Acordo exige consentimento dos dois parceiros.
- [x] 65 testes do motor, 1.000 partidas simuladas com Rituais e teste de sala com quatro conexões. O Espelho faz passar automaticamente jogadores que ficaram sem cartas.
- [x] Validação visual no navegador local: Espelho impede escolher o mesmo adversário duas vezes; Acordo exige os dois votos e inicia com 3 pontos, permitindo Double Trick por 5.
- [x] Escolha de Ritual mostra as três cartas juntas. Antes de revelar as criaturas, só Rituais com olhinho podem ser jogados; depois da revelação, eles seguem visíveis para consulta e só os demais ficam jogáveis. Layout conferido no navegador local.
- [x] Nome do criador Valney Maia Neto na abertura; criação de sala com 4, 6 ou 8 pessoas e alvo de 15 ou 25 pontos.
- [x] Motor e servidor usam quantidade dinâmica de assentos. Anciã e Espelho percorrem todos os parceiros; Acordo de Sangue exige maioria da equipe. A interface e a documentação mostram as opções escolhidas.
- [x] 74 testes do motor, 500 partidas simuladas para cada tamanho de sala (incluindo alvo 25), compilação e teste Socket.IO com salas de 4, 6 e 8 conexões; abertura e mesa de 8 conferidas no navegador local.
- [x] Quatro novos Rituais com as artes recebidas: Escudo Arcano, Zebra Mística, Blefe Premiado e Visão Compartilhada. Escudo desconta 1 ponto de quem venceu contra sua equipe; Zebra registra quem estava atrás na escolha; Blefe conta apenas Arcanas jogadas pela equipe do Ritual; Visão mostra as mãos atuais somente aos parceiros.
- [x] 81 testes do motor, compilação e 100 partidas simuladas com Rituais para cada tamanho de sala (4, 6 e 8 jogadores, alvo 25).
- [x] Histórico compacto das cartas de cada vaza concluída na mesa, inclusive a última jogada. A rodada anterior fica consultável até a primeira vaza da próxima. Assentos, nomes e cartas usam as mesmas cores das Luas: Equipe A âmbar e Equipe B verde.
- [x] Escolha de Ritual nas habilidades da Bruxa e do Mago ampliada em cartões com arte, descrição legível e botão de ação. Layout em duas colunas no computador e uma no celular.
- [x] Todas as escolhas de cartas nas habilidades usam cartões maiores, incluindo Fada, Titereiro, Goblin, Grifo e a decisão do Mago. Escolhas às cegas exibem apenas o verso; ações sem carta têm botões grandes. Compilação e 82 testes do motor passaram.
- [x] O descarte da Fada revela publicamente a criatura escolhida, com imagem, nome, Lua e jogador afetado. As opções vistas antes da escolha continuam privadas. Compilação e 82 testes do motor passaram.
- [x] Placar e Luas permanecem visíveis durante a rolagem da partida. A mesa vazia usa menos altura, aproximando o histórico e a mão; no celular, a faixa fixa mostra placar e Luas em formato compacto.
- [ ] Partida completa com amigos em dispositivos e redes separados.

## Limitações conhecidas

- Salas e placares são perdidos se o servidor reiniciar.
- O modo de controle de todos os assentos revela todas as mãos na própria aba e deve ser usado somente para testes. Para testar privacidade e multiplayer, use uma sala normal em abas ou dispositivos separados.
- A identidade de uma aba se perde quando ela é encerrada; atualizá-la mantém o assento.
- O baralho de teste usa quatro cópias de cada um dos dezesseis efeitos com arte. Os demais Rituais aguardam implementação em lotes de quatro.
