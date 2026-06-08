# Frontend — Monitor da Linha de Produção (OEE)

Dashboard em **Next.js (App Router)** com **Server-Side Rendering**, **React** e
**Tailwind CSS**, que lê a tabela `pecas` do PostgreSQL e exibe a produção da
linha em gráficos.

## Stack

- **Next.js 16** (App Router) — páginas renderizadas no servidor.
- **React 19**.
- **Tailwind CSS v4**.
- **pg** — consulta direta ao PostgreSQL em Server Components.
- Gráficos em **SVG puro** (sem biblioteca de chart, sem JS no cliente).

## O que é exibido

- **KPIs**: total de peças, peças boas, peças ruins e taxa de qualidade.
- **Produção por dia**: barras empilhadas (boas + ruins).
- **Qualidade**: rosca (donut) com a proporção boas × ruins.
- **Produção por hora do dia** (0–23h).
- **Últimas peças** registradas.

Os dados vêm da tabela `pecas (id, horario timestamptz, status)`, onde `status`
é `boa` ou `ruim` (ver `Backend/init.sql`).

## Configuração

Conexão definida por variáveis de ambiente (com defaults iguais ao
`Backend/docker-compose.yaml`). Copie `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

| Variável           | Default              |
| ------------------ | -------------------- |
| `PGHOST`           | `localhost`          |
| `PGPORT`           | `8888`               |
| `PGDATABASE`       | `mydatabase`         |
| `PGUSER`           | `myuser`             |
| `PGPASSWORD`       | `mysecretpassword`   |
| `DISPLAY_TIMEZONE` | `America/Sao_Paulo`  |

## Como rodar

```bash
# 1. suba o banco (na pasta Backend)
docker compose up -d

# 2. dependências e dev server
npm install
npm run dev   # http://localhost:3000
```

Build de produção:

```bash
npm run build
npm start
```

## Estrutura

```text
src/
├── app/
│   ├── layout.tsx        # layout raiz + fontes
│   ├── page.tsx          # dashboard (Server Component, SSR dinâmico)
│   └── globals.css       # Tailwind
├── components/
│   ├── Card.tsx          # Card + KpiCard
│   ├── StackedBarChart.tsx
│   ├── HourlyChart.tsx
│   └── DonutChart.tsx
└── lib/
    ├── db.ts             # pool de conexão pg
    └── metrics.ts        # queries + agregações
```
