# Progresso

## Fase 1: versão jogável inicial

- [x] Monorepo TypeScript com pnpm, motor, servidor e interface.
- [x] Quarenta cartas nomeadas e artes em quatro Luas, mais o verso.
- [x] Motor com distribuição por seed, vez, comparação de cartas, vazas, rodadas e placar até 15.
- [x] Visão privada para cada jogador e testes das regras principais.
- [x] Simulador de partidas com verificação de invariantes.
- [x] Salas por código, quatro assentos, servidor autoritativo e reconexão por identidade local.
- [x] Lobby, mesa, mão, placar, preenchimento com bots e controle dos quatro assentos em uma aba.
- [x] Validação: 12 testes do motor, 2.000 partidas simuladas, compilação e teste de integração da sala.

## Próximo passo

Jogar uma partida real entre celular e PC, observar legibilidade e fluxo, e registrar qualquer bug reproduzível como teste antes da correção. Depois ajustar implantação em VPS.

## Limitações conhecidas

- Salas e placares são perdidos se o servidor reiniciar.
- O modo de controle dos quatro assentos revela todas as mãos na própria aba e deve ser usado somente para testes.
- Efeitos de criaturas, Rituais, Trick e partidas com 6 ou 8 pessoas pertencem às fases seguintes.
