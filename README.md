# PDI Studio

Um sistema interativo completo para **Processamento Digital de Imagens (PDI)**, desenvolvido como projeto acadêmico da disciplina ministrada pela Profª Marta Bez na Universidade Feevale.

---

## Visão Geral do Projeto

O PDI Studio é um editor de imagens web-based que permite aplicar operações de PDI em tempo real através de um sistema de camadas (layers). O diferencial pedagógico é o **Exportador Acadêmico**: ao clicar em "Salvar Acadêmico", o estudante baixa um `.zip` contendo:

1. A imagem original
2. A imagem processada
3. Um arquivo `algoritmo_utilizado.py` com **implementações em Python Puro** de todos os algoritmos utilizados, com comentários explicativos e fundamentação teórica baseada no material das aulas.

---

## Arquitetura Híbrida: Por que OpenCV no Backend e Python Puro no Exportador?

O projeto adota uma arquitetura **híbrida deliberada** que reflete tanto a realidade do desenvolvimento web profissional quanto o objetivo pedagógico da disciplina:

### Backend (Produção) — OpenCV + FastAPI
O backend utiliza **OpenCV** e **NumPy** para processamento de imagens porque:
- **Performance**: OpenCV é otimizado em C++ internamente — processa imagens em milissegundos
- **Prática profissional**: Projetos reais de visão computacional usam bibliotecas otimizadas
- **Robustez**: OpenCV trata bordas, interpolação e casos extremos que seriam complexos em Python puro

> O backend NÃO é o foco de estudo de PDI. É a camada de infraestrutura que viabiliza a aplicação web.

### Exportador Acadêmico (Estudo) — Python Puro
O código exportado (`algoritmo_utilizado.py`) é escrito em **Python Puro** porque:
- **Didática**: O estudante vê cada iteração, cada fórmula matemática, cada loop
- **Transparência**: Não há "caixas-pretas" — tudo é visível e auditável
- **Aprendizado**: As implementações seguem exatamente o que foi ensinado nas aulas (laços for, fórmulas de convolução, trigonometria, etc.)

> O ZIP exportado é o **verdadeiro tesouro de estudos** do projeto. É ele que o estudante baixa para entender como cada algoritmo funciona "por baixo dos panos".

### Resumo da Arquitetura

| Camada | Tecnologia | Código | Objetivo |
|--------|-----------|--------|----------|
| **Frontend** | React + TypeScript | `frontend/src/` | Interface do usuário |
| **Backend** | Python + FastAPI + OpenCV | `backend/` | Processamento em produção |
| **Exportador** | Python Puro (no ZIP) | `Header.tsx` → `ALGORITHM_SOURCES` | Estudo e aprendizado |

---

## Funcionalidades Implementadas

### Operações Pontuais (Pixel a Pixel)
Cada pixel é processado individualmente, sem considerar vizinhos:
- **Grayscale** — Conversão para tons de cinza com fórmula BT.601: `Y = 0.299R + 0.587G + 0.114B`
- **Threshold** — Binarização: `g(x,y) = 255 se f(x,y) > T, senão 0`
- **Brilho e Contraste** — Transformação linear: `D(x,y) = C * f(x,y) + B`

### Filtros Espaciais (Convolução)
Um "carimbo" (kernel) desliza sobre a imagem, processando a vizinhança de cada pixel:
- **Filtro de Média** — Média aritmética dos vizinhos (suavização)
- **Filtro de Mediana** — Valor central da lista ordenada (remove ruído sal-e-pimenta)
- **Filtro Gaussiano** — Peso gaussiano: `G(x,y) = (1/2πσ²) * e^(-(x²+y²)/2σ²)`
- **Passa-Baixa** — Atenua altas frequências (borramento)
- **Passa-Alta (Sobel)** — Detecta bordas via gradiente: `Magnitude = √(Gx² + Gy²)`

### Transformações Geométricas
Remapeamento de coordenadas espaciais:
- **Translação** — Deslocamento: `x' = x + tx, y' = y + ty`
- **Rotação** — Matriz de rotação com seno/cosseno ao redor de um pivô
- **Escala** — Redimensionamento com interpolação vizinho-mais-próximo
- **Espelhamento** — Inversão de eixos (horizontal/vertical)

### Morfologia Matemática
Operações em imagens binárias usando Elemento Estruturante:
- **Dilatação** — Expande objetos (MÁXIMO local)
- **Erosão** — Contrai objetos (MÍNIMO local)
- **Abertura** — Erosão + Dilatação (remove ruído branco)
- **Fechamento** — Dilatação + Erosão (preenche buracos)
- **Afinamento** — 3 métodos: Steinfeld, Zhang-Suen, Holt (esqueletização)

### Desafios de PDI
Cinco exercícios práticos implementados:
1. **Relógio Analógico** — Detecção de ponteiros + trigonometria (atan2)
2. **Objetos Coloridos** — Segmentação por cor HSV + classificação de formato
3. **Reconhecimento de Letras** — Análise topológica (buracos + proporções)
4. **Placas de Trânsito** — Detecção vermelha + análise diagonal + picos
5. **Análise de Gráfico** — Medição de barras + escalonamento

---

## Stack Tecnológica

| Camada | Tecnologias |
|--------|------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Lucide Icons |
| **Backend** | Python 3.11, FastAPI, OpenCV, NumPy |
| **Deploy** | Vercel + Netlify (Frontend) + Render (Backend) |
| **Exportador** | JSZip + File-Saver (geração do ZIP no navegador) |

---

## Como Executar Localmente

**Pré-requisitos:** Node.js 18+ e Python 3.11+

### Backend (Terminal 1)
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Linux/Mac
# venv\Scripts\activate       # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```

Acesse: `http://localhost:5173`

---

## Estrutura do Projeto

```
PDI_STUDIO/
├── backend/
│   ├── main.py                          # API FastAPI (rota única de pipeline)
│   ├── services/
│   │   ├── point_operations.py          # Grayscale, Threshold, Brilho/Contraste
│   │   ├── spatial_filters.py           # Média, Mediana, Gaussiano, Sobel
│   │   ├── geometric.py                 # Translação, Rotação, Escala, Espelho
│   │   ├── morphology.py                # Dilatação, Erosão, Abertura, Fechamento, Afinamento
│   │   └── challenges/
│   │       ├── clock.py                 # Desafio 1: Relógio Analógico
│   │       ├── objects.py               # Desafio 2: Objetos Coloridos
│   │       ├── letters.py               # Desafio 3: Letras
│   │       ├── plates.py                # Desafio 4: Placas de Trânsito
│   │       └── charts.py                # Desafio 5: Análise de Gráfico
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Header.tsx           # Menu + Exportador Acadêmico (ALGORITHM_SOURCES)
│       │   │   ├── MainLayout.tsx       # Motor de pipeline + estados
│       │   │   ├── Sidebar.tsx          # Painel de ferramentas
│       │   │   ├── Inspector.tsx        # Painel de propriedades
│       │   │   └── LayersPanel.tsx      # Painel de camadas
│       │   └── workspace/
│       │       └── CanvasArea.tsx       # Exibição da imagem
│       ├── api.ts                       # Comunicação com o backend
│       └── App.tsx
└── README.md
```

---

## Acesso ao Projeto (Live)

- **Frontend (Vercel):** https://pdistudio.vercel.app/
- **Frontend (Netlify):** https://pdistudio.netlify.app/
- **Backend (Render):** Hospedado no Render (serviço independente)

> *Nota: O backend Render pode levar ~50s para "acordar" na primeira requisição (camada gratuita). Requisições subsequentes são instantâneas.*

---

## Autor

**Marco Schenkel Jr.** — Desenvolvimento, design e implementação de todas as funcionalidades.

*Desenvolvido como projeto da disciplina de Processamento Digital de Imagens — Universidade Feevale (Profª Marta Bez).*

*Auxílio de IA (MiMo Code) no desenvolvimento e refatoração de código.*
