# Explicação Educativa: Algoritmos de Processamento Digital de Imagens (PDI)

Este documento foi criado para explicar de forma **simples e didática** como funciona a lógica matemática dos códigos que processam as imagens no nosso sistema. 

Seja nos fundos do backend (onde usamos bibliotecas otimizadas em C++) ou nas exportações em "Python Puro", todo o tratamento de imagens baseia-se num conceito simples: **uma imagem não é nada mais que uma enorme tabela de números (matriz)**.

Aqui está o que cada módulo do projeto faz com essa matriz:

---

## 1. Operações Pontuais (Pixel a Pixel)
Essas são as operações mais básicas. Elas olham para **um único pixel por vez**, ignorando totalmente os pixels ao redor.

* **Grayscale (Tons de Cinza):** 
  Uma imagem colorida tem 3 canais por pixel (Vermelho, Verde e Azul - RGB). Para transformá-la em preto e branco, nós criamos um loop `for` que passa em cada pixel e tira uma média ponderada das cores para criar um único tom de luminosidade: `Luminância = 0.299*R + 0.587*G + 0.114*B`.
* **Threshold (Limiarização / Binarização):** 
  O objetivo é transformar a imagem inteira estritamente em Preto Puro (0) ou Branco Puro (255). Nós escolhemos um valor de "corte" na balança (ex: 128). O laço `for` pergunta para cada pixel: "Sua cor é maior que 128?". Se sim, ele vira 255 (Branco). Se não, vira 0 (Preto).
* **Brilho e Contraste:** 
  É pura matemática aritmética do ensino fundamental. Para **Brilho**, nós somamos ou subtraímos um número constante de cada pixel da matriz. Para **Contraste**, nós multiplicamos a cor do pixel por um fator (escalar). Isso "estica" ou "encurta" a distância entre as cores mais claras e escuras.

---

## 2. Filtros Espaciais (A Vizinhança)
Aqui a brincadeira fica inteligente. Para alterar um pixel central, nós somos obrigados a observar os pixels ao redor dele. Nós deslizamos uma mini-matriz ("Máscara" ou "Kernel", geralmente 3x3 ou 5x5) por cima de cada pedacinho da imagem!

* **Filtro de Média (Desfoque/Blur) e Passa-Baixa:** 
  Serve para borrar a imagem (ótimo para remover pequenos ruídos). Nós pegamos todos os pixels da vizinhança (um de cada lado e os das diagonais), somamos o valor de todos e dividimos pelo total. O pixel central troca sua cor pela "média" do próprio bairro. 
* **Filtro de Mediana:** 
  Similar ao da média, mas resolve de forma mais justa. Se a vizinhança é um "bairro" 3x3 (9 pixels no total), nós ordenamos as cores do menor pro maior e pegamos exatamente o valor que parou no meio (a mediana). Remove "pontos pretos e brancos" soltos lindamente.
* **Filtros Passa-Alta (Detecção de Bordas - Sobel):** 
  Encontra os contornos cirúrgicos dos objetos calculando a famosa "Derivada" da imagem (taxa de variação das cores). Como aplicamos? Nós criamos e aplicamos iterativamente **duas matrizes** de vizinhança (Kernels 3x3) de forma simultânea na imagem:
  * **(Gradiente horizontal - Gx):** Avalia os pixels da esquerda contra a direita usando `[-1, 0, 1; -2, 0, 2; -1, 0, 1]`.
  * **(Gradiente vertical - Gy):** Avalia os pixels de cima contra os de baixo usando `[-1, -2, -1; 0, 0, 0; 1, 2, 1]`.
  A lógica genial é que o negativo (-1 e -2) de um lado anula perfeitamente o positivo (1 e 2) do outro, SE as cores forem iguais. A matemática resulta em ZERO (preto, sem borda). Mas, se um lado for bem escuro (0) e o outro claro (255), os pesos multiplicam e acendem com um valor elevadíssimo (borda clara)!
  Por fim, para revelar o formato das coisas em qualquer direção (diagonal, curva), nós fechamos a conta usando o **Teorema de Pitágoras**. Pegamos o pico em `X`, o pico em `Y`, elevamos ambos ao quadrado, somamos e extraímos a raiz quadrada para montar a "Hipotenusa" (Magnitude). E lá está, os riscos das silhuetas saltam da tela!

---

## 3. Transformações Geométricas
Você lembra dos gráficos em plano Cartesiano (Eixo X e Y) das aulas de geometria? Todo pixel tem uma coordenada `(x, y)`!

* **Translação:** 
  Para mover a imagem, nós literalmente criamos uma imagem em branco do mesmo tamanho e preenchemos usando uma regra simples: o novo pixel na tela vai receber a cor do pixel que estava nas posições `X + Salto` e `Y + Salto`.
* **Escala:** 
  Se você quiser dobrar o tamanho da imagem, a matriz nova é gerada sendo duas vezes maior nas duas arestas. Nós então lemos os pixels da imagem antiga multiplicando as coordenadas por 0.5 (porque de trás pra frente, mapeamos os buracos gerados por duplicação e os preenchemos repetindo cores ou gerando suas médias).
* **Espelhamento:** 
  Só inverte as leituras. Num espelhamento horizontal, o pixel que estava na coluna 0 vira a última coluna, o da coluna 1 vira a penúltima, e assim sucessivamente.

---

## 4. Morfologia Matemática
Baseia-se em formatos. A gente define uma "sombra" (elemento estruturante) quadrada ou redonda e tenta esfregar isso no objeto binário (Preto e Branco):

* **Dilatação:** 
  Expande objetos mágicos na imagem. Se parte do nosso "elemento estruturante" esbarrar na borda num pixel branco do objeto em nossa varredura, nós pintamos os pixels escuros sob o contorno como Brancos também. Isso engorda os contornos ("incha" a massa branca) e tampa buraquinhos e rachaduras prestas!
* **Erosão:** 
  O exato aposto! É super exigente. Ela pede que toda a forma do "elemento estruturante" se encaixe totalmente por dentro do objeto branco. Como as partes finas do elemento borda não atendem a exigência, então essas bordas são "descascadas". Serve para limpar farpas, ruídos e fiapos brancos perdidos flutuando pelo preto.

---
Essa é a síntese lógica de tudo de fantástico que o `PDI Studio` faz rodando matrizes pelo processador por debaixo dos panos!

---

## 5. Exemplos de Código (Python Puro)

Abaixo estão **todos** os trechos exatos do nosso código de exportação do PDI Studio que demonstram na prática as lógicas explicadas acima, com todas as iterações (laços) e acessos de matrizes expostos de forma crua, sem utilizar funções otimizadas (caixas-pretas) do OpenCV:

### 1. Tons de Cinza (Grayscale)
\`\`\`
def apply_grayscale_pure(image_bgr: np.ndarray) -> np.ndarray:
    rows, cols, channels = image_bgr.shape
    out_matrix = np.zeros((rows, cols), dtype=np.uint8)
    
    for y in range(rows):
        for x in range(cols):
            b = image_bgr[y, x, 0]
            g = image_bgr[y, x, 1]
            r = image_bgr[y, x, 2]
            
            luminance = (0.299 * r) + (0.587 * g) + (0.114 * b)
            out_matrix[y, x] = int(luminance)
            
    return out_matrix
\`\`\`

### 2. Limiarização (Threshold)
\`\`\`
def apply_threshold_pure(image_matrix: np.ndarray, threshold_value: int) -> np.ndarray:
    rows, cols = image_matrix.shape
    out_matrix = np.zeros((rows, cols), dtype=np.uint8)
    
    for y in range(rows):
        for x in range(cols):
            intensity = image_matrix[y, x]
            if intensity > threshold_value:
                out_matrix[y, x] = 255
            else:
                out_matrix[y, x] = 0
                
    return out_matrix
\`\`\`

### 3. Brilho e Contraste
\`\`\`
def apply_brightness_contrast_pure(image_matrix: np.ndarray, brightness: int, contrast: float) -> np.ndarray:
    rows, cols, channels = image_matrix.shape
    out_matrix = np.zeros_like(image_matrix)
    
    for y in range(rows):
        for x in range(cols):
            for c in range(channels):
                val = (image_matrix[y, x, c] * contrast) + brightness
                if val > 255: val = 255
                elif val < 0: val = 0
                out_matrix[y, x, c] = int(val)
                
    return out_matrix
\`\`\`

### 4. Filtro de Média (Blur)
\`\`\`
def apply_mean_filter_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    offset = kernel_size // 2
    area = kernel_size * kernel_size
    
    for y in range(offset, rows - offset):
        for x in range(offset, cols - offset):
            soma_b, soma_g, soma_r = 0, 0, 0
            
            for ky in range(-offset, offset + 1):
                for kx in range(-offset, offset + 1):
                    b = image_matrix[y + ky, x + kx][0]
                    g = image_matrix[y + ky, x + kx][1]
                    r = image_matrix[y + ky, x + kx][2]
                    soma_b += b
                    soma_g += g
                    soma_r += r
                    
            out_matrix[y, x] = [soma_b // area, soma_g // area, soma_r // area]
            
    return out_matrix
\`\`\`

### 5. Filtro de Mediana
\`\`\`
def apply_median_filter_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    offset = kernel_size // 2
    
    for y in range(offset, rows - offset):
        for x in range(offset, cols - offset):
            vizinhos_b = []
            vizinhos_g = []
            vizinhos_r = []
            
            for ky in range(-offset, offset + 1):
                for kx in range(-offset, offset + 1):
                    b = image_matrix[y + ky, x + kx][0]
                    g = image_matrix[y + ky, x + kx][1]
                    r = image_matrix[y + ky, x + kx][2]
                    vizinhos_b.append(b)
                    vizinhos_g.append(g)
                    vizinhos_r.append(r)
            
            vizinhos_b.sort()
            vizinhos_g.sort()
            vizinhos_r.sort()
            meio = len(vizinhos_b) // 2
            
            out_matrix[y, x] = [vizinhos_b[meio], vizinhos_g[meio], vizinhos_r[meio]]
            
    return out_matrix
\`\`\`

### 6. Filtro Gaussiano
\`\`\`
def apply_gaussian_filter_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    import math
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    offset = kernel_size // 2
    sigma = kernel_size / 6.0 
    
    kernel = np.zeros((kernel_size, kernel_size), dtype=np.float32)
    soma_pesos = 0.0
    for ky in range(-offset, offset + 1):
        for kx in range(-offset, offset + 1):
            peso = (1.0 / (2.0 * math.pi * (sigma**2))) * math.exp(-(kx**2 + ky**2) / (2 * (sigma**2)))
            kernel[ky + offset, kx + offset] = peso
            soma_pesos += peso
            
    kernel /= soma_pesos

    for y in range(offset, rows - offset):
        for x in range(offset, cols - offset):
            b_val, g_val, r_val = 0.0, 0.0, 0.0
            
            for ky in range(-offset, offset + 1):
                for kx in range(-offset, offset + 1):
                    peso = kernel[ky + offset, kx + offset]
                    b = float(image_matrix[y + ky, x + kx][0])
                    g = float(image_matrix[y + ky, x + kx][1])
                    r = float(image_matrix[y + ky, x + kx][2])
                    
                    b_val += b * peso
                    g_val += g * peso
                    r_val += r * peso
                    
            out_matrix[y, x] = [int(b_val), int(g_val), int(r_val)]
            
    return out_matrix
\`\`\`

### 7. Filtro Passa-Baixa
\`\`\`
def apply_lowpass_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    offset = kernel_size // 2
    
    for y in range(offset, rows - offset):
        for x in range(offset, cols - offset):
            s_b, s_g, s_r = 0, 0, 0
            for ky in range(-offset, offset + 1):
                for kx in range(-offset, offset + 1):
                    b = image_matrix[y + ky, x + kx][0]
                    g = image_matrix[y + ky, x + kx][1]
                    r = image_matrix[y + ky, x + kx][2]
                    s_b += b; s_g += g; s_r += r
                    
            area = kernel_size * kernel_size
            out_matrix[y, x] = [s_b // area, s_g // area, s_r // area]
            
    return out_matrix
\`\`\`

### 8. Filtro Sobel (Passa-Alta)
\`\`\`
def apply_highpass_pure(image_matrix_gray: np.ndarray) -> np.ndarray:
    import math
    rows, cols = image_matrix_gray.shape
    out_matrix = np.zeros((rows, cols), dtype=np.uint8)
    
    Gx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])
    Gy = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]])
    
    for y in range(1, rows - 1):
        for x in range(1, cols - 1):
            soma_x = 0.0
            soma_y = 0.0
            
            for ky in range(-1, 2):
                for kx in range(-1, 2):
                    pixel = float(image_matrix_gray[y + ky, x + kx])
                    soma_x += pixel * Gx[ky + 1, kx + 1]
                    soma_y += pixel * Gy[ky + 1, kx + 1]
                    
            magnitude = math.sqrt((soma_x * soma_x) + (soma_y * soma_y))
            if magnitude > 255: magnitude = 255
            if magnitude < 0: magnitude = 0
            
            out_matrix[y, x] = int(magnitude)
            
    return out_matrix
\`\`\`

### 9. Translação
\`\`\`
def apply_translation_pure(image_matrix: np.ndarray, x_offset: int, y_offset: int) -> np.ndarray:
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    
    for y in range(rows):
        for x in range(cols):
            novo_x = x + x_offset
            novo_y = y + y_offset
            
            if 0 <= novo_x < cols and 0 <= novo_y < rows:
                out_matrix[novo_y, novo_x] = image_matrix[y, x]
                
    return out_matrix
\`\`\`

### 10. Rotação
\`\`\`
def apply_rotation_pure(image_matrix: np.ndarray, angle_degrees: float) -> np.ndarray:
    import math
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    
    center_y, center_x = rows // 2, cols // 2
    theta = math.radians(angle_degrees)
    
    for y in range(rows):
        for x in range(cols):
            Y_c = y - center_y
            X_c = x - center_x
            
            old_x = int((X_c * math.cos(theta)) + (Y_c * math.sin(theta))) + center_x
            old_y = int(-(X_c * math.sin(theta)) + (Y_c * math.cos(theta))) + center_y
            
            if 0 <= old_x < cols and 0 <= old_y < rows:
                out_matrix[y, x] = image_matrix[old_y, old_x]
                
    return out_matrix
\`\`\`

### 11. Escala
\`\`\`
def apply_scale_pure(image_matrix: np.ndarray, scale_factor: float) -> np.ndarray:
    rows, cols = image_matrix.shape[:2]
    channels = image_matrix.shape[2] if len(image_matrix.shape) > 2 else 1
    new_rows = int(rows * scale_factor)
    new_cols = int(cols * scale_factor)
    
    if channels > 1:
        out_matrix = np.zeros((new_rows, new_cols, channels), dtype=np.uint8)
    else:
        out_matrix = np.zeros((new_rows, new_cols), dtype=np.uint8)
    
    for y in range(new_rows):
        for x in range(new_cols):
            old_x = int(x / scale_factor)
            old_y = int(y / scale_factor)
            
            if old_x >= cols: old_x = cols - 1
            if old_y >= rows: old_y = rows - 1
            
            out_matrix[y, x] = image_matrix[old_y, old_x]
            
    return out_matrix
\`\`\`

### 12. Espelhamento (Mirror)
\`\`\`
def apply_mirror_pure(image_matrix: np.ndarray, flip_code: int) -> np.ndarray:
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    
    for y in range(rows):
        for x in range(cols):
            novo_y = y
            novo_x = x
            
            if flip_code == 1:
                novo_x = (cols - 1) - x
            elif flip_code == 0:
                novo_y = (rows - 1) - y
            elif flip_code == -1:
                novo_x = (cols - 1) - x
                novo_y = (rows - 1) - y
                
            out_matrix[novo_y, novo_x] = image_matrix[y, x]
            
    return out_matrix
\`\`\`

### 13. Dilatação (Morfologia Matemática)
\`\`\`
def apply_dilation_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    offset = kernel_size // 2
    
    for y in range(offset, rows - offset):
        for x in range(offset, cols - offset):
            max_b, max_g, max_r = 0, 0, 0
            
            for ky in range(-offset, offset + 1):
                for kx in range(-offset, offset + 1):
                    b = image_matrix[y + ky, x + kx][0]
                    g = image_matrix[y + ky, x + kx][1]
                    r = image_matrix[y + ky, x + kx][2]
                    
                    if b > max_b: max_b = b
                    if g > max_g: max_g = g
                    if r > max_r: max_r = r
                    
            out_matrix[y, x] = [max_b, max_g, max_r]
            
    return out_matrix
\`\`\`

### 14. Erosão (Morfologia Matemática)
\`\`\`
def apply_erosion_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    offset = kernel_size // 2
    
    for y in range(offset, rows - offset):
        for x in range(offset, cols - offset):
            min_b, min_g, min_r = 255, 255, 255
            
            for ky in range(-offset, offset + 1):
                for kx in range(-offset, offset + 1):
                    b = image_matrix[y + ky, x + kx][0]
                    g = image_matrix[y + ky, x + kx][1]
                    r = image_matrix[y + ky, x + kx][2]
                    
                    if b < min_b: min_b = b
                    if g < min_g: min_g = g
                    if r < min_r: min_r = r
                    
            out_matrix[y, x] = [min_b, min_g, min_r]
            
    return out_matrix
\`\`\`

### 15. Abertura
\`\`\`
def apply_opening_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    import copy
    img_erodida = apply_erosion_pure(image_matrix, kernel_size)
    img_aberta = apply_dilation_pure(img_erodida, kernel_size)
    return img_aberta
\`\`\`

### 16. Fechamento
\`\`\`
def apply_closing_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    import copy
    img_dilatada = apply_dilation_pure(image_matrix, kernel_size)
    img_fechada = apply_erosion_pure(img_dilatada, kernel_size)
    return img_fechada
\`\`\`
