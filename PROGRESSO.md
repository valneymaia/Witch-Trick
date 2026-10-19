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
- [x] Leitura ampliada da carta e do poder no PC e no celular; Mago e Bruxa identificados como indisponíveis até os Rituais.
- [x] Cenários solo para vencer uma vaza ou simular recusa com qualquer criatura disponível.
- [x] Titereiro recupera carta vencedora ou perdedora já jogada na rodada, inclusive da vaza interrompida por Trick recusado; se a rodada terminou, recebe três cartas novas mais a recuperada e descarta uma das três novas.
- [x] Cenário solo de Trick recusado com Titereiro deixa Arcana, Mago e Fada na mesa para testar a recuperação sem depender do sorteio.
- [x] Fada faz o adversário passar a próxima vaza mesmo quando ele ainda tem cartas; o adversário volta a jogar na vaza seguinte, se houver. A mesa indica quem está passando.
- [x] Validação: 33 testes do motor, 2.000 partidas simuladas e compilação. Interface solo conferida no navegador com Arcana, Mago e Fada elegíveis após Trick recusado, Arcana entrando como quarta carta na nova mão e descarte obrigatório de uma das três novas; teste de integração com quatro jogadores e contra-aumento realizado na etapa anterior.

## Próximo passo

Preparar as quatro artes individuais do primeiro lote indicado em `RITUAIS.md`, implementar a fase de escolha do Ritual com ocultação das mãos de criaturas, integrar os quatro efeitos e testar cada um no motor e no navegador. Depois continuar em lotes de quatro até completar as 48 cartas.

## Preparação dos Rituais

- [x] Baralho oficial de 48 cartas confirmado; três Rituais privados por jogador.
- [x] Um Ritual obrigatório por rodada, alternando equipe e jogador responsável.
- [x] Momento de escolha definido para cartas com ou sem olho cortado.
- [x] Dimensão das novas artes corrigida para 800 × 1248 px; um arquivo por carta.
- [x] Primeiro lote e pontos de teste documentados em `RITUAIS.md`.
- [ ] Fluxo de Rituais no motor, servidor e interface; primeiro lote jogável.

## Limitações conhecidas

- Salas e placares são perdidos se o servidor reiniciar.
- O modo de controle dos quatro assentos revela todas as mãos na própria aba e deve ser usado somente para testes. Para testar privacidade e multiplayer, use uma sala normal em quatro abas ou dispositivos.
- A identidade de uma aba se perde quando ela é encerrada; atualizá-la mantém o assento.
- Mago e Bruxa dependem das cartas de Ritual, ainda não implementadas. Partidas com 6 ou 8 pessoas também ficam para depois.

