# Storage Calculator

Calculadora de armazenamento para planejar quanto SSD você precisa para instalar seus jogos.

## Como usar

```bash
yarn
yarn dev
```

Abra o endereço do Vite no navegador. A lista de jogos e as configurações ficam salvas no `localStorage`.

## Deploy (GitHub Pages)

```bash
yarn deploy
```

O script faz o build, publica a pasta `dist/` na branch `gh-pages` e empurra para o GitHub. O `base path` é detectado pelo nome do repositório. O site fica em `https://<seu-usuario>.github.io/<nome-do-repo>/`.

## O que calcula

- Armazenamentos do tipo SSD ou MicroSD (o Ally tem um slot de cartão)
- Capacidade de cada armazenamento (presets por tipo ou valor manual)
- Espaço reservado para o sistema operacional
- Folga percentual para updates/shaders
- Soma da biblioteca de jogos
- Espaço livre / faltando e recomendação de capacidade
