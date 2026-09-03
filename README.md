# Big Boo B

Prova de conceito de um jogo de plataformas em HTML5 Canvas, React e TypeScript.

O jogador controla a criança com o apoio de Boo B e Boo A para enfrentar **The Big One** ao longo de três níveis. O jogo inclui ataques com flores, power-up da beringela, introduções narrativas e um leaderboard global.

## Jogar online

<https://big-boo-b-gameplay.wiremaze-4708.chatgpt.site>

## Funcionalidades

- Três níveis sequenciais com cenários e dificuldade progressiva
- Movimento, salto e ataque de flores
- Boo A como bónus de estrelas
- Power-up da beringela: Flower Storm durante 5 segundos
- Boss com ataques cada vez mais rápidos e aleatórios
- Mensagem narrativa antes de cada nível
- Leaderboard global persistente
- Controlos de teclado e controlos táteis

## Controlos

| Ação | Teclas |
| --- | --- |
| Movimento | `←` `→` ou `A` `D` |
| Salto | `Espaço`, `↑` ou `W` |
| Ataque de Boo B | `E` ou `Shift` |

## Desenvolvimento local

Requer uma versão recente do Node.js e npm.

```bash
npm install
npm run dev
```

Para validar a versão de produção:

```bash
npm run build
```

## Leaderboard

O leaderboard usa uma base de dados D1 no ambiente de publicação. A configuração lógica encontra-se em `.openai/hosting.json` e as migrações estão em `drizzle/`.

## Tecnologias

- React
- TypeScript
- HTML5 Canvas
- Vinext/Vite
- Cloudflare Workers e D1

## Versão

Versão atual do protótipo: **0.0.10**.
