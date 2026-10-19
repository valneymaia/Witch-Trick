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
- [x] Validação: 29 testes do motor, 2.000 partidas simuladas e compilação. Interface solo conferida no navegador com vitória e recusa do Corvo; teste de integração com quatro jogadores e contra-aumento realizado na etapa anterior.

## Próximo passo

Jogar uma partida real entre celular e PC com as habilidades, observar legibilidade e fluxo, e registrar qualquer bug reproduzível como teste antes da correção. Depois implementar os Rituais e ajustar implantação em VPS.

## Limitações conhecidas

- Salas e placares são perdidos se o servidor reiniciar.
- O modo de controle dos quatro assentos revela todas as mãos na própria aba e deve ser usado somente para testes. Para testar privacidade e multiplayer, use uma sala normal em quatro abas ou dispositivos.
- A identidade de uma aba se perde quando ela é encerrada; atualizá-la mantém o assento.
- Mago e Bruxa dependem das cartas de Ritual, ainda não implementadas. Partidas com 6 ou 8 pessoas também ficam para depois.
