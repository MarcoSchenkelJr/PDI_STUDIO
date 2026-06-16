# PDI Studio - Estratégias dos Desafios

## Visão Geral

O PDI Studio contém 5 desafios de Processamento Digital de Imagens. Cada desafio demonstra a aplicação de técnicas de PDI para resolver problemas reais de classificação e análise de imagens.

---

## Desafio 1: Relógio Analógico

**Objetivo:** Ler um relógio analógico e exibir o horário em formato digital.

**Exemplo:** Imagem com ponteiro das horas em 10 e minutos em 3 → R: 10:15

### Estratégia Utilizada:

1. **Threshold** — Conversão da imagem para escala de cinza e binarização
2. **Detecção de Contornos** — Encontrar o contorno externo do relógio
3. **Máscara Circular** — Criar máscara para isolar os ponteiros dentro do relógio
4. **Afinamento Morfológico** — Reduzir os ponteiros para linhas de 1 pixel
5. **Análise de Pontos Terminais** — Encontrar as pontas dos ponteiros
6. **Trigonometria (ângulos)** — Calcular ângulos dos ponteiros
7. **Conversão Ângulo → Hora/Minuto** — Mapear graus para tempo digital

### Fluxo:
```
Imagem → Threshold → Máscara Circular → Afinamento → 
Pontos Terminais → Trigonometria ângulos → Ângulos → Hora:Minuto
```

---

## Desafio 2: Objetos Coloridos

**Objetivo:** Identificar e contar objetos por cor e formato (círculos e quadrados).

**Exemplo:** Imagem com 3 círculos vermelhos e 2 quadrados azuis → R: 3 Vermelho, 2 Azul

### Estratégia Utilizada:

1. **Matiz, Saturação e Brilho** — Espaço de cor mais adequado para segmentação
2. **Threshold** — Deixar apenas o objeto de interesse e o fundo preto
3. **Morfologia (OPEN/CLOSE)** — Limpar ruído nas máscaras de cor
4. **Detecção de Contornos** — Encontrar cada objeto
5. **Aproximação Poligonal** — Analisar cantos para distinguir círculos de quadrados
6. **Detecção de Sobreposição** — Verificar se há objetos de cores diferentes se sobrepondo

### Fluxo:
```
Imagem → Matiz, Saturação e Brilho → Threshold → Morfologia → 
Detecção de Contornos → Aproximação Poligonal → Classificação
```

---

## Desafio 3: Letras do Alfabeto

**Objetivo:** Identificar letras (A-Z) presentes na imagem, sem repetição.

**Exemplo:** Imagem com A, B, C → R: A, B, C

### Estratégia Utilizada:

1. **Threshold** — Binarização da imagem
2. **Preenchimento de regiões** — Isolar cada letra individualmente
3. **Detecção de Buracos** — Identificar letras com buracos fechados (A, B, O, etc.)
4. **Análise de Proporções** — Aspect ratio e proporção de preenchimento
5. **Distribuição de Pixels** — Analisar terços (esquerda/centro/direita)
6. **Classificação por Regras** — Árvore de decisão baseada em features

### Lógica de Classificação:

| Buracos | Letras              | Critério               |
|---------|---------------------|------------------------|
| 0       | C, X, Y, Z, etc.    | Proporções e simetria  |
| 1       | A, D, O, P, Q, R    | Aspecto do buraco      |
| 2       | B                   | Dois buracos           |

---

## Desafio 4: Placas de Trânsito

**Objetivo:** Identificar o tipo de placa de trânsito na imagem.

**Tipos:** Pare, Velocidade máxima, Proibido estacionar, Sentido obrigatório.

### Estratégia Utilizada:

1. **Threshold** — Detecção da cor vermelha (todas as placas)
2. **Morfologia** — Limpeza da máscara
3. **Detecção de Contornos** — Encontrar as placas
4. **Análise de Proporção Vermelha** — Pare é preenchido (68%), círculos são ocos (19-23%)
5. **Detecção de Diagonal** — Placas de proibição têm diagonal vermelha
6. **Análise de Conteúdo** — Seta (vertical) vs Letra E (horizontal)

### Lógica de Classificação:

| Placa                  | Critério                                         |
|------------------------|--------------------------------------------------|
| Pare                   | Proporção vermelha > 50% (octógono preenchido)   |
| Velocidade             | Proporção vermelha < 50% + sem diagonal          |
| Sentido obrigatório    | Proporção < 50% + diagonal + seta (top > bot)    |
| Proibido estacionar    | Proporção < 50% + diagonal + letra E             |

---

## Desafio 5: Gráfico de Barras

**Objetivo:** Identificar a barra mais alta e a mais baixa em um gráfico.

**Exemplo:** Gráfico com barras de alturas 20, 15, 10, 5 → R: Maior = 20, Menor = 5

### Estratégia Utilizada:

1. **Matiz, Saturação e Brilho** — Detecção da cor das barras (salmão/rosa)
2. **Threshold** — Limpeza da máscara
3. **Detecção de Contornos** — Encontrar cada barra
4. **Cálculo de Altura** — Medir pixels de cada barra
5. **Cálculo de Escala** — Converter pixels para valores reais
6. **Comparação** — Encontrar maior e menor valor

### Lógica de Escala:

| Situação           | Método                      |
|--------------------|-----------------------------|
| Barras diferentes  | Escala = 20 / altura_maior  |
| Barras iguais      | Escala padrão               |

---

## Fluxo Geral do Pipeline

```
1. Frontend (React) → Envia imagem + parâmetros via POST
2. Backend (FastAPI) → Recebe e processa
3. Pipeline → Aplica operações sequenciais
4. Motor PDI → Executa algoritmos (OpenCV)
5. Resposta → Imagem processada + texto resultado
```

---

## Tecnologias PDI Utilizadas

| Técnica | Onde Aplicada |
|---------|---------------|
| **Threshold** | Todos os desafios (binarização) |
| **HSV** | Objetos, Placas, Gráfico (segmentação por cor) |
| **Morfologia** | Todos (limpeza, erosão, dilatação) |
| **Contornos** | Todos (detecção de formas) |
| **Afinamento** | Relógio (reduzir ponteiros) |
| **Flood Fill** | Letras (isolar caracteres) |
| **Trigonometria** | Relógio (calcular ângulos) |
| **Aproximação Poligonal** | Objetos (distinguir círculos/quadrados) |
