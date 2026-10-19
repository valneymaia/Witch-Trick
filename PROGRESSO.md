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
- [x] Double Trick, Hat Trick e Poker Trick: pedir antes da carta, resposta do próximo assento, aceite/recusa, aumento alternado e pontuação até 4.
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

Receber as quatro artes individuais do primeiro lote, integrar cada imagem à carta correspondente e verificar o fluxo em quatro dispositivos. Depois continuar em lotes de quatro até completar as 48 cartas.

## Preparação dos Rituais

- [x] Baralho oficial de 48 cartas confirmado; três Rituais privados por jogador.
- [x] Um Ritual obrigatório por rodada, alternando equipe e jogador responsável.
- [x] Momento de escolha definido para cartas com ou sem olho cortado.
- [x] Dimensão das novas artes ajustada à disponibilidade do editor: 800 × 1131 ou 1132 px; um arquivo por carta.
- [x] Primeiro lote e pontos de teste documentados em `RITUAIS.md`.
- [x] Primeiro lote confirmado por Valney: Mapa do Destino, Doblete Sombrio, Magia Nula e Silêncio da Bruxa.
- [x] Titereiro com Ritual de olho cortado: carta guardada conhecida; descarte cego de uma das três criaturas novas antes de revelá-las.
- [x] Fluxo de Rituais no motor, servidor e interface; primeiro lote jogável com arte provisória em texto.
- [x] Mago troca um Ritual da mão por um Ritual aleatório de um adversário; Bruxa compra e descarta um Ritual.
- [x] 43 testes do motor, 1.000 partidas simuladas com Rituais e compilação da interface e servidor.
- [ ] Teste de integração do primeiro lote no navegador e em quatro dispositivos.

## Limitações conhecidas

- Salas e placares são perdidos se o servidor reiniciar.
- O modo de controle dos quatro assentos revela todas as mãos na própria aba e deve ser usado somente para testes. Para testar privacidade e multiplayer, use uma sala normal em quatro abas ou dispositivos.
- A identidade de uma aba se perde quando ela é encerrada; atualizá-la mantém o assento.
- O baralho de teste usa quatro cópias de cada um dos quatro efeitos implementados; as outras 44 regras e as artes individuais aguardam implementação. Partidas com 6 ou 8 pessoas também ficam para depois.
