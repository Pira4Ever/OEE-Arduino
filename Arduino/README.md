# Projeto OEE – Eficiência Global do Equipamento (Low-Cost)

Sistema didático de monitoramento de linha de produção simplificada com cálculo de **OEE** utilizando Arduino.

## 📌 Sobre o Projeto

Este projeto tem como objetivo principal demonstrar o cálculo do indicador **OEE (Overall Equipment Effectiveness)** de forma prática, acessível e de baixo custo, utilizando componentes eletrônicos comuns e plataforma Arduino.

O sistema simula uma linha de produção simples que:

- Detecta peças que passam por uma esteira
- Classifica as peças como **OK** ou **NOK** (aprovadas/reprovadas)
- Registra tempos de ciclo, paradas, falhas e produção
- Calcula em tempo real (ou ao final do ciclo) os três pilares do OEE:
  - **Disponibilidade**
  - **Desempenho**
  - **Qualidade**
- Apresenta o valor final do **OEE (%)**

É um projeto de caráter **educacional/industrial introdutório**, ideal para TCCs, disciplinas de manufatura enxuta, Indústria 4.0, automação industrial, IoT industrial e melhoria contínua.

## 🎯 Objetivo

Desenvolver um protótipo de baixo custo capaz de monitorar uma linha de produção simplificada, classificar peças e calcular o indicador OEE, fornecendo dados claros para análise de perdas e melhoria de processos.

## ✨ Funcionalidades Implementadas

- Simulação de linha de produção com esteira (motor DC + driver)
- Detecção de peças com sensor de proximidade / óptico
- Classificação OK/NOK (ex.: sensor de cor, altura, peso ou botão simulado)
- Registro automático de:
  - Tempo planejado de produção
  - Tempo de parada (downtime)
  - Ciclos produtivos
  - Peças boas × peças ruins
- Cálculo dos índices:
  - Disponibilidade = Tempo de operação real / Tempo planejado
  - Desempenho = (Peças produzidas × Tempo de ciclo ideal) / Tempo de operação real
  - Qualidade = Peças boas / Peças totais produzidas
  - **OEE = Disponibilidade × Desempenho × Qualidade**
- Exibição em display LCD 16×2 / OLED / Serial Monitor
- (opcional) Envio de dados via Serial para computador (Excel, Processing, Python, Node-RED etc.)
