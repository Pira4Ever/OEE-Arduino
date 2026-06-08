# Projeto OEE – Eficiência Global do Equipamento (Low-Cost)

Protótipo didático de uma linha de produção simplificada que detecta e **classifica peças por
visão computacional**, aciona atuadores físicos via **Arduino/ESP8266** e armazena os resultados
para cálculo do indicador **OEE (Overall Equipment Effectiveness)**.

> Projeto acadêmico (FATEC) de caráter educacional, voltado a disciplinas de manufatura enxuta,
> Indústria 4.0, automação e IoT industrial.

---

## 📌 Visão Geral

O sistema simula uma esteira que:

1. Recebe o comando de início de um ciclo (botão físico na maquete).
2. Movimenta a peça por uma esteira (motor principal).
3. Captura a peça por uma câmera e a classifica como **BOA** ou **RUIM** usando OpenCV.
4. Aciona um motor desviador + LED correspondente ao resultado (separa peças boas/ruins).
5. Registra a produção para posterior análise dos pilares do OEE (Disponibilidade, Desempenho
   e Qualidade).

A comunicação entre o microcontrolador e o software de visão é feita por **MQTT**, o que
desacopla o hardware do processamento e permite que cada parte rode em máquinas distintas na
mesma rede.

---

## 🏗️ Arquitetura

```text
                    ┌──────────────────────────────────────────────────┐
                    │                  Broker MQTT (Mosquitto)          │
                    │              tópicos: oee/arduino  /  oee/pc      │
                    └──────────────────────────────────────────────────┘
                          ▲   publica "scan"          ▲   publica "BOA"/"RUIM"
                          │                            │
        ┌─────────────────┴───────────┐   ┌────────────┴───────────────────────┐
        │   Arduino / ESP8266          │   │   ComputerVision (Python + OpenCV)  │
        │  (NodeMCU v2)                │   │                                     │
        │  • botão inicia o ciclo      │   │  • assina  oee/arduino              │
        │  • motor principal (esteira) │   │  • em "scan": captura frames da     │
        │  • publica "scan"            │   │    câmera e classifica a peça       │
        │  • assina  oee/pc            │   │  • publica "BOA"/"RUIM" em oee/pc   │
        │  • em "BOA"/"RUIM":          │   │  • grava o resultado no PostgreSQL  │
        │    aciona motor + LED        │   └──────────────────┬──────────────────┘
        └──────────────────────────────┘                     │ INSERT INTO pecas
                                                              ▼
        ┌─────────────────────────────────────┐   ┌──────────────────────────────┐
        │   Frontend (Next.js + Tailwind)     │──▶│   PostgreSQL (tabela pecas)   │
        │   dashboard SSR de boas × ruins     │   │   id, horario, status         │
        │   hospedado na Vercel               │   └──────────────────────────────┘
        └─────────────────────────────────────┘
```

> 🌐 **Dashboard online:** <https://oee-arduino-frontend.vercel.app/>

O repositório é um monorepo com quatro componentes independentes:

| Pasta             | Tecnologia                         | Papel                                                        |
| ----------------- | ---------------------------------- | ------------------------------------------------------------ |
| `Arduino/`        | C++ / PlatformIO (ESP8266 NodeMCU) | Controle físico da esteira, botão, motores desviadores e LEDs |
| `ComputerVision/` | Python 3.13 / OpenCV / paho-mqtt / psycopg2 | Classifica as peças por visão e grava o resultado no PostgreSQL |
| `Backend/`        | Docker Compose (Mosquitto + PostgreSQL) | Broker MQTT e banco de dados                            |
| `frontend/`       | Next.js 16 / React 19 / Tailwind CSS (SSR) | Dashboard de visualização (hospedado na Vercel)         |

---

## 🔄 Fluxo de uma Peça

1. O operador pressiona o **botão** na maquete (`buttonPin`, com debounce de 200 ms).
2. O ESP8266 liga o **motor principal** (`analogWrite(motorPrincipal, 210)`) por 4 s para levar a
   peça até a câmera, depois o desliga.
3. O ESP8266 publica `"scan"` no tópico **`oee/arduino`**.
4. O serviço de visão recebe `"scan"`, lê ~`fps` frames da câmera e, para cada frame:
   - converte para escala de cinza e aplica desfoque gaussiano;
   - binariza (limiar adaptativo por padrão, ou fixo);
   - encontra contornos e filtra por área mínima;
   - conta os vértices do contorno aproximado: **< 6 vértices → BOA**, **≥ 6 → RUIM**.
5. Por votação majoritária entre os frames, define o resultado e publica `"BOA"` ou `"RUIM"` no
   tópico **`oee/pc`**.
6. Em seguida o serviço de visão **grava o resultado no PostgreSQL** (`INSERT INTO pecas`,
   com `status` = `boa` ou `ruim`), alimentando o dashboard.
7. O ESP8266 recebe o resultado e, por 2 s, aciona o **motor desviador** e o **LED**
   correspondentes (`motorBom`/`ledBom` ou `motorRuim`/`ledRuim`), separando a peça.

> **Critério de classificação:** o algoritmo atual distingue as peças pelo **número de lados**
> do contorno (geometria), e não por cor ou tamanho. Peças com poucos vértices são tratadas como
> "BOA" e peças mais "arredondadas"/complexas (muitos vértices) como "RUIM". Os parâmetros
> (`threshold_value`, `blur_size`, `min_area`, `epsilon_factor`, `use_adaptive`) ficam no topo da
> classe `Detector` em [ComputerVision/main.py](ComputerVision/main.py) e devem ser calibrados
> conforme a iluminação e as peças usadas.

---

## 🧩 Componentes em Detalhe

### Arduino — `Arduino/`

Firmware em C++ para **NodeMCU v2 (ESP8266)**, construído com **PlatformIO**.

**Pinos** (definidos em [Arduino/src/main.cpp](Arduino/src/main.cpp)):

| Pino   | Variável         | Função                                  |
| ------ | ---------------- | --------------------------------------- |
| `D0`   | `motorPrincipal` | Motor da esteira (PWM via `analogWrite`)|
| `D1`   | `motorBom`       | Motor desviador de peças boas           |
| `D2`   | `motorRuim`      | Motor desviador de peças ruins          |
| `D5`   | `buttonPin`      | Botão de início de ciclo (`INPUT_PULLUP`)|
| `D6`   | `ledBom`         | LED indicador de peça boa               |
| `D7`   | `ledRuim`        | LED indicador de peça ruim              |
| `D8`   | `ledStatus`      | LED de status (WiFi + MQTT conectados)  |

- Conecta-se ao WiFi e ao broker MQTT (porta 1883); reconecta automaticamente em caso de queda
  (desligando a esteira e o LED de status enquanto offline).
- Dependência: `knolleary/PubSubClient@^2.8` (ver [Arduino/platformio.ini](Arduino/platformio.ini)).
- Credenciais ficam em `Arduino/src/secrets.h` (SSID, senha e endereço do broker).

> ⚠️ **Segurança:** o arquivo `secrets.h` versionado contém credenciais de exemplo (incluindo
> credenciais comentadas de um broker HiveMQ Cloud). **Não** reutilize essas credenciais e
> mantenha segredos reais fora do controle de versão.

### ComputerVision — `ComputerVision/`

Aplicação Python que faz a ponte entre a câmera, o MQTT e o banco de dados.

- Classe `Detector`: abre a câmera (`cv2.VideoCapture`) e implementa a classificação descrita acima.
- Classe `MyClient`: cliente MQTT (paho-mqtt, MQTT v5). Assina `oee/arduino`, responde a `scan`
  (publica o resultado) e a `stop` (libera a câmera e encerra o loop).
- **Acesso ao banco de dados:** ao receber `scan`, além de publicar `"BOA"`/`"RUIM"` em `oee/pc`,
  o serviço conecta ao **PostgreSQL** via `psycopg2` e executa um `INSERT INTO pecas (status)`
  (`'boa'` ou `'ruim'`), com `commit` a cada peça. É este serviço que **popula** a tabela lida
  pelo dashboard.
- Configuração por variáveis de ambiente em `ComputerVision/.env`:
  - MQTT: `MQTT_BROKER`, `MQTT_PORT`, `MQTT_USER`, `MQTT_PASS`. Se usuário/senha forem informados,
    o cliente habilita TLS automaticamente.
  - Banco: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASS`
    (defaults: `localhost` / `8888` / `mydatabase` / `myuser` / `mysecretpassword`).
- Dependências (ver [ComputerVision/pyproject.toml](ComputerVision/pyproject.toml)):
  `opencv-python`, `paho-mqtt`, `psycopg2`, `python-dotenv`. Requer **Python ≥ 3.13**.

> A fonte de vídeo está fixada como `Detector(1)` (segunda câmera do sistema). Ajuste o índice
> para `0` (webcam padrão) ou para o caminho/URL do seu dispositivo conforme necessário.

### Backend — `Backend/`

Infraestrutura local via **Docker Compose** ([Backend/docker-compose.yaml](Backend/docker-compose.yaml)):

- **Mosquitto** (`eclipse-mosquitto:2.1.2-alpine`): broker MQTT.
  - Porta `1883` (MQTT) e `9001` (WebSockets), conexões anônimas permitidas, persistência ativa.
  - Configuração em [Backend/mqtt/config/mosquitto.conf](Backend/mqtt/config/mosquitto.conf).
- **PostgreSQL** (`postgres:18-alpine`): banco de dados.
  - Exposto em `localhost:8888` (mapeado para `5432` interno).
  - Credenciais padrão: `myuser` / `mysecretpassword`, banco `mydatabase`.
  - O schema é criado por [Backend/init.sql](Backend/init.sql): tabela `pecas (id, horario, status)`.

### Frontend — `frontend/`

Dashboard em **Next.js 16 / React 19** com **Tailwind CSS**, renderizado no servidor (SSR).

- 🌐 **Em produção na Vercel:** <https://oee-arduino-frontend.vercel.app/>
- A página [frontend/src/app/page.tsx](frontend/src/app/page.tsx) é um Server Component que
  consulta o PostgreSQL diretamente (via `pg`) e exibe KPIs (total, boas, ruins, qualidade) e
  gráficos de peças **boas × ruins** por dia, por semana e por hora.
- Os gráficos são **SVG puro** renderizado no servidor (sem biblioteca de chart, sem JS no cliente).
- Botão **"Baixar Excel"** → Route Handler [frontend/src/app/api/export/route.ts](frontend/src/app/api/export/route.ts)
  que gera um `.xlsx` (via `exceljs`) com todas as peças.
- Conexão por variáveis de ambiente (defaults para `localhost:8888`); ver
  [frontend/.env.example](frontend/.env.example). Em produção, configure as variáveis
  `PG*` na Vercel apontando para um PostgreSQL acessível pela internet.

---

## ⚙️ Como Executar

> Pré-requisitos: Docker + Docker Compose, Node.js (para o frontend), Python ≥ 3.13 (sugerido
> [`uv`](https://github.com/astral-sh/uv) — há um `uv.lock` no projeto) e PlatformIO (para o firmware).

### 1. Subir broker MQTT e banco

```bash
cd Backend
docker compose up -d
```

### 2. Serviço de visão computacional

```bash
cd ComputerVision
# crie o .env com as variáveis de MQTT (MQTT_BROKER, MQTT_PORT, ...) e de
# banco de dados (DATABASE_HOST, DATABASE_PORT, DATABASE_NAME, DATABASE_USER, DATABASE_PASS)
uv sync          # ou: pip install opencv-python paho-mqtt psycopg2 python-dotenv
uv run main.py   # ou: python main.py
```

### 3. Firmware do Arduino

```bash
cd Arduino
# ajuste src/secrets.h (SSID, PASS, MQTT_BROKER)
pio run --target upload
pio device monitor   # baud 9600
```

### 4. Dashboard

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

> Também disponível em produção na Vercel: <https://oee-arduino-frontend.vercel.app/>

---

## 📊 Sobre o OEE

O **OEE** é o produto de três pilares:

```text
Disponibilidade = Tempo de operação real / Tempo planejado de produção
Desempenho      = (Peças produzidas × Tempo de ciclo ideal) / Tempo de operação real
Qualidade       = Peças boas / Peças totais produzidas

OEE = Disponibilidade × Desempenho × Qualidade
```

Neste protótipo, o pilar de **Qualidade** é o mais diretamente representado: a contagem de peças
**boas** e **ruins** alimenta o cálculo de aprovação. Disponibilidade e Desempenho dependem do
registro de tempos de ciclo e paradas.

---

## 🚧 Estado Atual e Limitações Conhecidas

Com base no código presente no repositório:

- O cálculo completo do OEE (Disponibilidade e Desempenho) ainda não está implementado em código;
  o sistema hoje cobre a captura, classificação, **persistência** e atuação física — ou seja,
  cobre diretamente o pilar de **Qualidade**.
- A classificação distingue peças por **número de vértices** do contorno; requer calibração dos
  parâmetros de visão para o ambiente real.
- O serviço de visão grava no banco **sem reconexão automática**: se a conexão com o PostgreSQL
  cair, é necessário reiniciar o serviço.
- O dashboard hospedado na Vercel depende de um PostgreSQL acessível pela internet; com as
  credenciais padrão apontando para `localhost`, ele só exibe dados quando o banco está acessível
  a partir do ambiente de execução.

> Estas observações refletem o código tal como está no repositório no momento desta documentação
> e devem ser confirmadas/atualizadas conforme o projeto evolui.

---

## 📁 Estrutura do Repositório

```text
OEE-Arduino/
├── Arduino/            # Firmware ESP8266 (PlatformIO)
│   ├── src/
│   │   ├── main.cpp
│   │   └── secrets.h
│   └── platformio.ini
├── ComputerVision/     # Classificação por visão (Python/OpenCV)
│   ├── main.py
│   └── pyproject.toml
├── Backend/            # Infra local (Docker Compose)
│   ├── docker-compose.yaml
│   ├── init.sql
│   └── mqtt/config/mosquitto.conf
├── frontend/           # Dashboard (Next.js)
│   └── src/app/page.tsx
└── README.md
```

---

## 📡 Tópicos MQTT

| Tópico        | Publicado por | Mensagens             | Significado                                   |
| ------------- | ------------- | --------------------- | --------------------------------------------- |
| `oee/arduino` | Arduino       | `scan`, `stop`        | Pede uma classificação / encerra a visão      |
| `oee/pc`      | ComputerVision| `BOA`, `RUIM`         | Resultado da classificação da peça            |

---

## 👥 Contribuidores

[<img src="https://avatars.githubusercontent.com/u/59701790?size=100" width="80" height="80" alt="Octavio Piratininga" style="border-radius:50%;">](https://github.com/Pira4Ever)
[<img src="https://avatars.githubusercontent.com/u/269061644?size=100" width="80" height="80" alt="Yuri Tavares" style="border-radius:50%;">](https://github.com/YuriTV07)
[<img src="https://avatars.githubusercontent.com/u/269567747?size=100" width="80" height="80" alt="Gustavo Henrique Teles" style="border-radius:50%;">](https://github.com/Gustavera5)
[<img src="https://avatars.githubusercontent.com/u/269211557?size=100" width="80" height="80" alt="Lopes" style="border-radius:50%;">](https://github.com/daviponteslopes12-web)
[<img src="https://avatars.githubusercontent.com/u/286823963?size=100" width="80" height="80" alt="Henrique Domingues" style="border-radius:50%;">](https://github.com/rique-dmngs)

## 📄 Licença

Ver o arquivo [LICENSE](LICENSE).
