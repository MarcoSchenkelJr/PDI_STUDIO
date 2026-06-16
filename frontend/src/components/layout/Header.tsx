import { useState, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Info, Upload, Download, LogOut, Globe, Settings } from 'lucide-react';

const UTILITIES_PYTHON = `
# ============================================
# UTILITARIOS DE PDI EM PYTHON PURO
# ============================================
# Estas funcoes implementam operacoes fundamentais de Processamento
# Digital de Imagens usando apenas loops for e numpy, sem funcoes
# otimizadas do OpenCV. O objetivo e didatico: entender como cada
# operacao funciona "por baixo dos panos".
# ============================================

import numpy as np
import math

def converter_para_cinza(image_matrix):
    """Converte imagem BGR/RGB para escala de cinza.
    Formula BT.601 ( ponderacao fisiologica do olho humano):
        Y = 0.299*R + 0.587*G + 0.114*B
    O olho humano e mais sensivel ao verde (0.587) e menos ao azul (0.114)."""
    if len(image_matrix.shape) == 2:
        return image_matrix.copy()
    rows, cols = image_matrix.shape[:2]
    cinza = np.zeros((rows, cols), dtype=np.uint8)
    for y in range(rows):
        for x in range(cols):
            b, g, r = int(image_matrix[y, x, 0]), int(image_matrix[y, x, 1]), int(image_matrix[y, x, 2])
            cinza[y, x] = int(0.299 * r + 0.587 * g + 0.114 * b)
    return cinza

def binarizar(image_matrix, limiar=127):
    """Binariza imagem (preto/branco) usando limiarizacao manual.
    g(x,y) = 255 se f(x,y) > T, senao g(x,y) = 0
    Separa objetos de interesse do fundo pela intensidade."""
    cinza = converter_para_cinza(image_matrix) if len(image_matrix.shape) == 3 else image_matrix
    h, w = cinza.shape
    resultado = np.zeros((h, w), dtype=np.uint8)
    for y in range(h):
        for x in range(w):
            resultado[y, x] = 255 if cinza[y, x] > limiar else 0
    return resultado

def morfologia_erode_bin(mascara, tamanho):
    """Erosao manual em mascara binaria (255=objeto, 0=fundo).
    O pixel central so permanace branco SE TODOS os pixels
    dentro do elemento estruturante (kernel) tambem forem brancos.
    Serve para remover ruido branco e afinar bordas."""
    h, w = mascara.shape
    offset = tamanho // 2
    resultado = np.zeros_like(mascara)
    for y in range(offset, h - offset):
        for x in range(offset, w - offset):
            todos_brancos = True
            for ky in range(-offset, offset + 1):
                for kx in range(-offset, offset + 1):
                    if mascara[y + ky, x + kx] == 0:
                        todos_brancos = False
                        break
                if not todos_brancos:
                    break
            if todos_brancos:
                resultado[y, x] = 255
    return resultado

def morfologia_dilate_bin(mascara, tamanho):
    """Dilatacao manual em mascara binaria.
    Se QUALQUER pixel dentro do elemento estruturante for branco,
    o pixel central se torna branco.
    Serve para preencher buracos e engrossar bordas."""
    h, w = mascara.shape
    offset = tamanho // 2
    resultado = np.zeros_like(mascara)
    for y in range(h):
        for x in range(w):
            if mascara[y, x] == 255:
                for ky in range(-offset, offset + 1):
                    for kx in range(-offset, offset + 1):
                        ny, nx = y + ky, x + kx
                        if 0 <= ny < h and 0 <= nx < w:
                            resultado[ny, nx] = 255
    return resultado

def morfologia_open_bin(mascara, tamanho):
    """Abertura binaria = Erosao + Dilatacao.
    Remove objetos pequenos (ruido branco) mantendo a forma dos objetos grandes."""
    return morfologia_dilate_bin(morfologia_erode_bin(mascara, tamanho), tamanho)

def morfologia_close_bin(mascara, tamanho):
    """Fechamento binario = Dilatacao + Erosao.
    Preenche buracos pequenos e costura fendas nos objetos."""
    return morfologia_erode_bin(morfologia_dilate_bin(mascara, tamanho), tamanho)

def contar_buracos_puro(mascara):
    """Conta buracos fechados em mascara binaria usando flood fill.
    Estrategia: flood fill do canto (0,0) marca a regiao externa (fundo).
    Pixels que sao 0, nao sao externos = buracos fechados.
    Exemplo: A tem 1 buraco triangular, B tem 2 buracos, C tem 0 buracos."""
    h, w = mascara.shape
    externo = np.zeros((h, w), dtype=bool)
    fila = [(0, 0)]
    externo[0, 0] = True
    while fila:
        cy, cx = fila.pop(0)
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1),
                       (-1, -1), (-1, 1), (1, -1), (1, 1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w:
                if mascara[ny, nx] == 0 and not externo[ny, nx]:
                    externo[ny, nx] = True
                    fila.append((ny, nx))
    visitado = np.zeros((h, w), dtype=bool)
    buracos = 0
    for y in range(h):
        for x in range(w):
            if mascara[y, x] == 0 and not externo[y, x] and not visitado[y, x]:
                buracos += 1
                fila = [(y, x)]
                visitado[y, x] = True
                while fila:
                    cy, cx = fila.pop(0)
                    for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        ny, nx = cy + dy, cx + dx
                        if (0 <= ny < h and 0 <= nx < w and
                            mascara[ny, nx] == 0 and
                            not externo[ny, nx] and
                            not visitado[ny, nx]):
                            visitado[ny, nx] = True
                            fila.append((ny, nx))
    return buracos

`;

const ALGORITHM_SOURCES: Record<string, string> = {

  'clock': `def solve_clock_academic(image_matrix: np.ndarray) -> str:
    """
    [FUNDAMENTACAO TEORICA - DESAFIO DO RELOGIO ANALOGICO]
    Este algoritmo combina processamento morfologico espacial e geometria analitica
    para extrair a informacao temporal contida em uma matriz de imagem discreta.

    PASSO A PASSO DO PIPELINE:
    1. BINARIZACAO INVERTIDA: Isola os tracos do relogio em branco (255) sob fundo preto (0).
    2. MASCARA CIRCULAR: Equacao (x - xc)^2 + (y - yc)^2 <= r^2 preserva ponteiros.
    3. AFINAMENTO (Python Puro): Esfoliamento morfologico ate esqueleto de 1 pixel.
    4. VARREDURA MATRICIAL: Distancia euclidiana maxima isola pontas dos ponteiros.
    5. TRIGONOMETRIA (atan2): Angulo em radianos -> horas/minutos.

    [TRECHO DO MATERIAL DIDATICO: Afinamento.pptx]
    "O afinamento reduz objetos binarios ao seu esqueleto de 1 pixel,
    preservando a conectividade e topologia."
    """
    import cv2

    # 1. Converter para cinza e binarizar (OpenCV para I/O)
    gray = cv2.cvtColor(image_matrix, cv2.COLOR_BGR2GRAY)
    _, img_bin = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)

    # 2. Encontrar maior componente conectado (face do relogio)
    contours, _ = cv2.findContours(img_bin, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return "Nenhum relogio detectado"
    largest = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(largest)
    cx, cy = x + w // 2, y + h // 2
    radius = min(w, h) // 2

    # 3. Aplicar mascara circular
    masked = np.zeros_like(img_bin)
    for py in range(img_bin.shape[0]):
        for px in range(img_bin.shape[1]):
            dist = math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
            if dist <= radius and img_bin[py, px] == 255:
                masked[py, px] = 255

    # 4. Afinamento (PYTHON PURO - algoritmo de Lantejoul)
    skeleton = apply_thinning_pure(masked)

    # 5. Encontrar pontas dos ponteiros por distancia euclidiana
    tips = []
    for py in range(skeleton.shape[0]):
        for px in range(skeleton.shape[1]):
            if skeleton[py, px] == 0:
                dist = math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
                if dist > radius * 0.25:
                    tips.append((px, py, dist))

    if len(tips) < 2:
        return "Nao foi possivel detectar os ponteiros"

    tips.sort(key=lambda t: t[2], reverse=True)
    minute_tip = tips[0]
    hour_tip = tips[len(tips) // 3]

    # 6. Calcular angulos com atan2 (trigonometria pura)
    hour_angle = math.atan2(hour_tip[1] - cy, hour_tip[0] - cx)
    minute_angle = math.atan2(minute_tip[1] - cy, minute_tip[0] - cx)

    hour_deg = (math.degrees(hour_angle) + 90) % 360
    minute_deg = (math.degrees(minute_angle) + 90) % 360

    hours = int(hour_deg / 30) % 12
    minutes = int(minute_deg / 6) % 60
    minutes = round(minutes / 5) * 5
    if minutes >= 60:
        minutes = 0

    return f"{hours:02d}:{minutes:02d}"`,

  'threshold': `def apply_threshold_pure(image_matrix: np.ndarray, threshold_value: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - LIMIARIZAÇÃO (THRESHOLD)]
    A limiarização é um processo de segmentação de imagem que separa os objetos de interesse 
    do fundo com base nas características de intensidade dos pixels. 
    A operação binariza a imagem transformando-a em tons de Preto (0) e Branco (255).
    
    [TRECHO DO MATERIAL DIDÁTICO: Processamento_De_Imagens=Metodos_E_Analises.pdf]
    "Mudando o seu brilho e detectando bordas a partir do contraste analítico, o threshold mapeia:
    Matematicamente, para cada pixel f(x, y), é gerado um pixel de saída g(x, y):
        g(x, y) = 255 se f(x, y) > Limiar (T)
        g(x, y) = 0   se f(x, y) <= Limiar (T)"
    """
    rows, cols = image_matrix.shape
    out_matrix = np.zeros((rows, cols), dtype=np.uint8)
    
    for y in range(rows):
        for x in range(cols):
            intensity = image_matrix[y, x]
            if intensity > threshold_value:
                out_matrix[y, x] = 255
            else:
                out_matrix[y, x] = 0
                
    return out_matrix`,

  'brightness-contrast': `def apply_brightness_contrast_pure(image_matrix: np.ndarray, brightness: int, contrast: float) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - OPERAÇÕES PONTUAIS DE BRILHO E CONTRASTE]
    As operações atuam pixel a pixel de forma linear. 

    [TRECHO DO MATERIAL DIDÁTICO: Grayscale_Brilho_Contraste.pdf]
    "Grandes variações de iluminação podem causar baixo contraste em regiões...
    O ajuste de brilho e contraste é feito através da Equação da Transformação Linear Rápida:
        D(x,y) = C * f(x,y) + B
    Onde D(x,y) é a Imagem destino, f(x,y) a imagem origem, C é o Contraste e B é o Brilho.
    (Se C = 1 não aplica Contraste, Se B = 0 não aplica Brilho)"
    """
    rows, cols, channels = image_matrix.shape
    out_matrix = np.zeros_like(image_matrix)
    
    for y in range(rows):
        for x in range(cols):
            for c in range(channels):
                val = (image_matrix[y, x, c] * contrast) + brightness
                if val > 255: val = 255
                elif val < 0: val = 0
                out_matrix[y, x, c] = int(val)
                
    return out_matrix`,

  'grayscale': `def apply_grayscale_pure(image_bgr: np.ndarray) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - CONVERSÃO PARA NÍVEIS DE CINZA]
    A conversão de um espaço (BGR/RGB) mapeia os sub-comprimentos da luz.

    [TRECHO DO MATERIAL DIDÁTICO: Grayscale_Brilho_Contraste.pdf]
    "Transformação Grayscale: Útil para etapas posteriores de processamento, pois o 
    trabalho de análise é feito em relação a um só canal de cor uniforme.
    A aproximação das frequências ópticas respeita a fisiologia do olho humano:
        Y = (Cor R * 0,299 + Cor G * 0,587 + Cor B * 0,114)
    Isso substitui o canal triplo por luz absoluta."
    """
    rows, cols, channels = image_bgr.shape
    out_matrix = np.zeros((rows, cols), dtype=np.uint8)
    
    for y in range(rows):
        for x in range(cols):
            b = image_bgr[y, x, 0]
            g = image_bgr[y, x, 1]
            r = image_bgr[y, x, 2]
            
            luminance = (0.299 * r) + (0.587 * g) + (0.114 * b)
            out_matrix[y, x] = int(luminance)
            
    return out_matrix`,

  'mean-filter': `def apply_mean_filter_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - FILTRO ESPACIAL PASSA-BAIXA (MÉDIA)]
    O filtro de média atua como um suavizador básico, atenuando altas frequências espaciais.

    [TRECHO DO MATERIAL DIDÁTICO: 2_Passa_Baixa.pptx]
    "O filtro da média atua suavizando as discrepâncias locais espaciais de pixel simulando óptica fora de foco. 
    Para um kernel 3x3, a matriz de convolução é expressa por pesos constantes:
        h = 1/9 * [1 1 1; 1 1 1; 1 1 1]
    Cada pixel toma o valor da média aritmética de sua vizinhança."
    """
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
            
    return out_matrix`,

  'median-filter': `def apply_median_filter_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - FILTRO NÃO-LINEAR DE ORDENAÇÃO (MEDIANA)]
    Diferentemente de matrizes lineares, a Mediana trabalha com ordenação de vizinhança topológica.

    [TRECHO DO MATERIAL DIDÁTICO: Transformações_Geométricas.pdf]
    "Operações Locais: Um pixel da imagem resultante depende de uma vizinhança do mesmo
    pixel na imagem original (no entorno de xi, yi).
    Na mediana remove-se componentes de Ruído Sal e Pimenta pela listagem das intensidades no 
    núcleo de amostragem NxN, e adota o percentil perfeito (50%) que fica imune a pixels extremos."
    """
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
            
    return out_matrix`,

  'gaussian-filter': `def apply_gaussian_filter_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - FILTRO GAUSSIANO]
    A suavização limita a perturbação baseada nas curvas normais para minimizar ringing artifacts.

    [TRECHO DO MATERIAL DIDÁTICO: 2_Passa_Baixa.pptx]
    "Aproximação no domínio espacial por núcleos Gaussianos atenuadores de frequências (Ruído Aditivo).
    A Equação de Gauss Invariante modela que os pesos tornam-se gravitacionais nos raios estritos:
        G(x,y) = (1 / (2*π*σ^2)) * e^(-(x^2 + y^2) / (2*σ^2))
    Gerando desfoque harmonioso com pesos assimétricos."
    """
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
            
    return out_matrix`,

  'lowpass': `def apply_lowpass_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - FILTRO PASSA-BAIXA]
    Operações passa-baixa atenuam discrepâncias de curto alcance simulando óptica fora de foco.

    [TRECHO DO MATERIAL DIDÁTICO: 2_Passa_Baixa.pptx]
    "O filtro da média atua suavizando as discrepâncias locais espaciais de pixel simulando óptica fora de foco. 
    Para um kernel 3x3, a matriz de convolução é expressa da forma:
        h = 1/9 * [1 1 1; 1 1 1; 1 1 1]
    Isso absorve ruídos sem comprometer a estrutura base, pois todos os pontos participam com pesos equivalentes."
    """
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
            
    return out_matrix`,

  'highpass': `def apply_highpass_pure(image_matrix_gray: np.ndarray) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - FILTRO PASSA-ALTA / DETECÇÃO DE BORDAS COM SOBEL]
    Extratores de alta-frequência acentuam limites agudos ou cristas topológicas (arestas vetoriais).

    [TRECHO DO MATERIAL DIDÁTICO: 1_Passa_Alta.pptx]
    "O método mais comum de diferenciação é o gradiente. Os pesos são distribuídos de forma
    assimétrica em torno de um eixo hipotético. A Matriz Bidimensional de Sobel executa as contas:
    Máscara Gx:                       Máscara Gy:
        [-1  0  1]                          [-1 -2 -1]
        [-2  0  2]                          [ 0  0  0]
        [-1  0  1]                          [ 1  2  1]
    
    A intensidade da aresta final obedece ao vetor euclidiano extraindo a Magnitude Ortogonal absoluta:
        Magnitude = √(Gx^2 + Gy^2)"
    """
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
            
    return out_matrix`,

  'translation': `def apply_translation_pure(image_matrix: np.ndarray, x_offset: int, y_offset: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - TRANSFORMAÇÃO GEOMÉTRICA DE TRANSLAÇÃO]
    Modifica posições de pixels varrendo e relocalizando posições Euclidianas.

    [TRECHO DO MATERIAL DIDÁTICO: 9_Sistema_de_Processamento_Digital_de_Imagens.txt]
    "Translação Espacial: O processo de transladar um objeto consiste em deslocar ou somar a
    cada um dos pixels da imagem um determinado valor fixo, expresso pela matriz 3x3 Afim:
        [ x' ]     [ 1  0  tx ]   [ x ]
        [ y' ]  =  [ 0  1  ty ] * [ y ]
        [ 1  ]     [ 0  0   1 ]   [ 1 ]
    Onde tx e ty definem o deslocamento da imagem para o plano destino."
    """
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    
    for y in range(rows):
        for x in range(cols):
            novo_x = x + x_offset
            novo_y = y + y_offset
            
            if 0 <= novo_x < cols and 0 <= novo_y < rows:
                out_matrix[novo_y, novo_x] = image_matrix[y, x]
                
    return out_matrix`,

  'rotation': `def apply_rotation_pure(image_matrix: np.ndarray, angle_degrees: float) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - TRANSFORMAÇÃO GEOMÉTRICA DE ROTAÇÃO]
    Um mapa Euleriano projetivo transacionando funções senoidais interconectadas a um pivô.

    [TRECHO DO MATERIAL DIDÁTICO: P_D_I_Transformações_Geométricas.pdf]
    "Todas as transformações geométricas são resolvidas utilizando multiplicação de matrizes.
    Para rotacionar o ponto originário no vértice central, as operações bidimensionais adotam a estrutura:
        [ x' ]     [ cos(θ)  -sin(θ) ]   [ x - xp ]
        [ y' ]  =  [ sin(θ)   cos(θ) ] * [ y - yp ]  + deslocamento extra
    A interpolação Backward (Novo para Antigo) evita pixels espúrios aliasing da grade."
    """
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
                
    return out_matrix`,

  'scale': `def apply_scale_pure(image_matrix: np.ndarray, scale_factor: float) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - TRANSFORMAÇÃO DE ESCALONAMENTO E INTERPOLAÇÃO]
    O fator numérico altera densidade de pixels original na proporção simétrica α.

    [TRECHO DO MATERIAL DIDÁTICO: P_D_I_Transformações_Geométricas.pdf]
    "Escala: É a alteração do tamanho da imagem, deixando-a maior ou menor.
    O desenho no destino altera as distâncias através de remapeamento linear da matriz (fx, fy).
    Para interpolar os abismos nos endereços alocados internamente no frame,
    o algoritmo adota Interpolação Vizinho-Mais-Próximo resolvendo a captura de arranjos."
    """
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
            
    return out_matrix`,

  'mirror': `def apply_mirror_pure(image_matrix: np.ndarray, flip_code: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - ESPELHAMENTO DE IMAGENS]
    Também classificado como operação geométrica Reflexiva, rearranjando colunas ou linhas opostas.

    [TRECHO DO MATERIAL DIDÁTICO: Transformações_Geométricas.pdf]
    "O mapeamento direto determinístico preserva invariavelmente os agrupamentos luminosos, 
    onde rebatemos o reflexo pela troca estrita da variável escalar de localização:
    - Espelho Horizontal (1): Resulta na aplicação de I_out(x, y) = I_in(Largura - x, y)
    - Espelho Vertical (0): Resulta na manipulação de I_out(x, y) = I_in(x, Altura - y)"
    """
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
            
    return out_matrix`,

  'mirror-h': `def apply_mirror_h_pure(image_matrix: np.ndarray) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - ESPELHAMENTO HORIZONTAL]
    Inverte a imagem no eixo X. O pixel da coluna 0 vai para a última coluna.
    Equivalente a apply_mirror_pure com flip_code = 1.
    """
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    for y in range(rows):
        for x in range(cols):
            out_matrix[y, (cols - 1) - x] = image_matrix[y, x]
    return out_matrix`,

  'mirror-v': `def apply_mirror_v_pure(image_matrix: np.ndarray) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - ESPELHAMENTO VERTICAL]
    Inverte a imagem no eixo Y. O pixel da linha 0 vai para a última linha.
    Equivalente a apply_mirror_pure com flip_code = 0.
    """
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    for y in range(rows):
        for x in range(cols):
            out_matrix[(rows - 1) - y, x] = image_matrix[y, x]
    return out_matrix`,

  'scale-up': `def apply_scale_up_pure(image_matrix: np.ndarray, scale_factor: float = 1.5) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - ESCALA (ZOOM IN)]
    Aumenta o tamanho da imagem pelo fator de escala usando interpolação vizinho-mais-próximo.
    Equivalente a apply_scale_pure com scale_factor > 1.
    """
    return apply_scale_pure(image_matrix, scale_factor)`,

  'scale-down': `def apply_scale_down_pure(image_matrix: np.ndarray, scale_factor: float = 0.5) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - ESCALA (ZOOM OUT)]
    Diminui o tamanho da imagem pelo fator de escala usando interpolação vizinho-mais-próximo.
    Equivalente a apply_scale_pure com scale_factor < 1.
    """
    return apply_scale_pure(image_matrix, scale_factor)`,

  'dilate': `def apply_dilation_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - MORFOLOGIA MATEMÁTICA: DILATAÇÃO]
    Tópicos não-lineares estruturais regidos pela união topológica (X ⊕ S).

    [TRECHO DO MATERIAL DIDÁTICO: 7_Morfologia_Matemática.docx]
    "O Elemento Estruturante é comparado à vizinhança a partir de sua origem na matriz focal. 
    Na dilatação, se o pixel referenciado pela vizinhança na operação (como o pixel central do 
    elemento constitutivo) coincidir com a borda de proeminência, expande-se o objeto pelo 
    MÁXIMO local, engordando formas organicamente e costurando pequenas falhas entre fendas escuras."
    """
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
            
    return out_matrix`,

  'erode': `def apply_erosion_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - MORFOLOGIA MATEMÁTICA: EROSÃO]
    Contraparte da dilatação baseada na intersecção em Mínimos (X ⊖ S).

    [TRECHO DO MATERIAL DIDÁTICO: 7_Morfologia_Matemática.docx]
    "Diferente do caso da vizinhança positiva, na Erosão, usamos o Elemento Estruturante 
    retirando áreas na fronteira pela lógica de que, se o pixel não englobar totalmente
    o S na vizinhança de área NxN, substitui-se o ponto central pelo MÍNIMO contido.
    Isso serve eficientemente para diminuir, arrancar e esfoliar artefatos ruidosos."
    """
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
            
    return out_matrix`,

  'opening': `def apply_opening_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - MORFOLOGIA COMPOSTA: ABERTURA]
    Técnica idempotente com aplicações sequenciais: X ∘ S = (X ⊖ S) ⊕ S.

    [TRECHO DO MATERIAL DIDÁTICO: Morfologia_Matematica.pptx]
    "Morfologia com técnica de Abertura: Primeiro executa as varreduras do carimbo restritivo de 
    Erosão total para limpar estrobos curtos no interior das formas. Após o limpo, projeta 
    dinamicamente à Dilatação. Como resultado ataca ruídos mantendo tamanhos e geometrias raiz."
    """
    import copy
    img_erodida = apply_erosion_pure(image_matrix, kernel_size)
    img_aberta = apply_dilation_pure(img_erodida, kernel_size)
    
    return img_aberta`,

  'closing': `def apply_closing_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - MORFOLOGIA COMPOSTA: FECHAMENTO]
    Lógica de lacramento da estrutura exterior: X • S = (X ⊕ S) ⊖ S.

    [TRECHO DO MATERIAL DIDÁTICO: Morfologia_Matematica.pptx]
    "O mecanismo investigativo da morfologia digital na configuração de fechamento aplica
    o espessamento Dilatador unificando pequenas falhas, cobrindo o microvazamento de bordas.
    Em prol não estender o invólucro do modelo central além do tamanho real, 
    a Erosão em refluxo sela os pixels inflados."
    """
    import copy
    img_dilatada = apply_dilation_pure(image_matrix, kernel_size)
    img_fechada = apply_erosion_pure(img_dilatada, kernel_size)
    
    return img_fechada`,

  'thinning': `def apply_thinning_pure(image_matrix: np.ndarray, method: str = 'steinfeld') -> np.ndarray:
    """
    [FUNDAMENTACAO TEORICA - MORFOLOGIA: ESQUELETIZACAO]
    O Esqueleto Morfologico S(X) e definido como a uniao dos centros dos discos
    maximais inscritos no objeto. O afinamento reduz objetos binarios ao seu
    esqueleto de 1 pixel, preservando a conectividade e topologia.

    METODOS IMPLEMENTADOS (100% Python Puro):

    1. STEINFELD (Erosao Iterativa):
       - Iterativamente: Erosao -> Dilatacao -> Subtracao -> Uniao com esqueleto
       - Remove pixels de borda que nao sao essenciais
       - Formula: S_k(X) = (X - kS) - [(X - kS) o S]

    2. ZHANG-SUEN (Paralelo):
       - Duas sub-iteracoes por passo (Norte/Sul e Leste/Oeste)
       - Remove pixel P1 SE: 2 <= B(P1) <= 6, A(P1) = 1,
         P2*P4*P6 = 0 (sub-iter 1), P4*P6*P8 = 0 (sub-iter 2)
       - Onde B = vizinhos nao-zero, A = transicoes 0->1

    3. HOLT (Simplificado):
       - Erosao -> Dilatacao -> Subtracao iterativa
       - Variacao do Steinfeld com condicoes de parada diferentes

    [TRECHO DO MATERIAL DIDATICO: Afinamento.pptx]
    "O afinamento reduz objetos binarios ao seu esqueleto de 1 pixel,
    preservando a conectividade e topologia."
    """
    # Converter para escala de cinza se necessario
    if len(image_matrix.shape) == 3:
        gray = np.zeros((image_matrix.shape[0], image_matrix.shape[1]), dtype=np.uint8)
        for y in range(image_matrix.shape[0]):
            for x in range(image_matrix.shape[1]):
                b, g, r = int(image_matrix[y, x, 0]), int(image_matrix[y, x, 1]), int(image_matrix[y, x, 2])
                gray[y, x] = int(0.299 * r + 0.587 * g + 0.114 * b)
    else:
        gray = image_matrix.copy()

    # Binarizar: objeto=255, fundo=0
    h_img, w_img = gray.shape
    img_bin = np.zeros((h_img, w_img), dtype=np.uint8)
    for y in range(h_img):
        for x in range(w_img):
            img_bin[y, x] = 0 if gray[y, x] > 127 else 255

    if method == 'zhang_suen':
        skeleton = _zhang_suen_puro(img_bin)
    elif method == 'holt':
        skeleton = _holt_puro(img_bin)
    else:  # steinfeld (default)
        skeleton = _steinfeld_puro(img_bin)

    # Inverter resultado: esqueleto=255 no fundo preto
    resultado = np.zeros_like(skeleton)
    for y in range(h_img):
        for x in range(w_img):
            resultado[y, x] = 0 if skeleton[y, x] == 255 else 255

    return resultado


def _steinfeld_pure(img_bin):
    """STEINFELD: Afinamento por erosao iterativa.
    A cada passo: erode -> dilate -> subtrai do original -> uniao com esqueleto.
    Para quando nao ha mais pixels brancos no objeto."""
    h, w = img_bin.shape
    skeleton = np.zeros((h, w), dtype=np.uint8)
    current = img_bin.copy()
    safety_limit = 1000

    for _ in range(safety_limit):
        # Erosao manual
        eroded = np.zeros((h, w), dtype=np.uint8)
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                if current[y, x] == 255:
                    todos = True
                    for ky in range(-1, 2):
                        for kx in range(-1, 2):
                            if (ky != 0 or kx != 0) and current[y + ky, x + kx] == 0:
                                todos = False
                                break
                        if not todos:
                            break
                    if todos:
                        eroded[y, x] = 255

        # Dilatacao manual
        dilated = np.zeros((h, w), dtype=np.uint8)
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                if eroded[y, x] == 255:
                    for ky in range(-1, 2):
                        for kx in range(-1, 2):
                            if ky == 0 and kx == 0:
                                continue
                            ny, nx = y + ky, x + kx
                            if 0 <= ny < h and 0 <= nx < w:
                                dilated[ny, nx] = 255

        # Subtracao: current - dilated
        diff = np.zeros((h, w), dtype=np.uint8)
        for y in range(h):
            for x in range(w):
                if current[y, x] == 255 and dilated[y, x] == 0:
                    diff[y, x] = 255

        # Uniao com esqueleto
        for y in range(h):
            for x in range(w):
                if diff[y, x] == 255:
                    skeleton[y, x] = 255

        current = eroded.copy()

        # Parada: sem pixels brancos
        tem = False
        for y in range(h):
            for x in range(w):
                if current[y, x] == 255:
                    tem = True
                    break
            if tem:
                break
        if not tem:
            break

    return skeleton


def _zhang_suen_puro(img_bin):
    """ZHANG-SUEN: Afinamento paralelo com duas sub-iteracoes.
    Cada sub-iteracao marca pixels para remocao baseado em:
    - B(P1): numero de vizinhos nao-zero (2 <= B <= 6)
    - A(P1): numero de transicoes 0->1 ao redor (A = 1)
    - Condicoes especificas para sub-iter 1 e 2"""
    h, w = img_bin.shape
    current = img_bin.copy()
    safety_limit = 100

    for _ in range(safety_limit):
        changed = False

        # Sub-iteracao 1: remove pixels de borda Norte/Sul
        to_remove = []
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                if current[y, x] == 0:
                    continue
                # 8 vizinhos: N, NE, E, SE, S, SW, W, NW
                p = [current[y-1, x], current[y-1, x+1], current[y, x+1],
                     current[y+1, x+1], current[y+1, x], current[y+1, x-1],
                     current[y, x-1], current[y-1, x-1]]
                n = sum(1 for v in p if v > 0)
                s = sum(1 for k in range(8) if p[k] == 0 and p[(k+1) % 8] == 255)

                if 2 <= n <= 6 and s == 1:
                    if p[0] * p[2] * p[4] == 0 and p[2] * p[4] * p[6] == 0:
                        to_remove.append((y, x))

        for y, x in to_remove:
            current[y, x] = 255
            changed = True

        # Sub-iteracao 2: remove pixels de borda Leste/Oeste
        to_remove = []
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                if current[y, x] == 0:
                    continue
                p = [current[y-1, x], current[y-1, x+1], current[y, x+1],
                     current[y+1, x+1], current[y+1, x], current[y+1, x-1],
                     current[y, x-1], current[y-1, x-1]]
                n = sum(1 for v in p if v > 0)
                s = sum(1 for k in range(8) if p[k] == 0 and p[(k+1) % 8] == 255)

                if 2 <= n <= 6 and s == 1:
                    if p[2] * p[4] * p[6] == 0 and p[0] * p[4] * p[6] == 0:
                        to_remove.append((y, x))

        for y, x in to_remove:
            current[y, x] = 255
            changed = True

        if not changed:
            break

    return current


def _holt_puro(img_bin):
    """HOLT: Afinamento simplificado por erosao-dilatacao-subtracao.
    Variacao do Steinfeld com logica de parada simplificada.
    A cada passo: erode -> dilate -> subtrai -> uniao com esqueleto."""
    h, w = img_bin.shape
    skeleton = np.zeros((h, w), dtype=np.uint8)
    current = img_bin.copy()
    safety_limit = 100

    for _ in range(safety_limit):
        # Erosao manual
        eroded = np.zeros((h, w), dtype=np.uint8)
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                if current[y, x] == 255:
                    todos = True
                    for ky in range(-1, 2):
                        for kx in range(-1, 2):
                            if (ky != 0 or kx != 0) and current[y + ky, x + kx] == 0:
                                todos = False
                                break
                        if not todos:
                            break
                    if todos:
                        eroded[y, x] = 255

        # Dilatacao manual
        dilated = np.zeros((h, w), dtype=np.uint8)
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                if eroded[y, x] == 255:
                    for ky in range(-1, 2):
                        for kx in range(-1, 2):
                            if ky == 0 and kx == 0:
                                continue
                            ny, nx = y + ky, x + kx
                            if 0 <= ny < h and 0 <= nx < w:
                                dilated[ny, nx] = 255

        # Subtracao
        diff = np.zeros((h, w), dtype=np.uint8)
        for y in range(h):
            for x in range(w):
                if current[y, x] == 255 and dilated[y, x] == 0:
                    diff[y, x] = 255

        # Uniao
        for y in range(h):
            for x in range(w):
                if diff[y, x] == 255:
                    skeleton[y, x] = 255

        current = eroded.copy()

        tem = False
        for y in range(h):
            for x in range(w):
                if current[y, x] == 255:
                    tem = True
                    break
            if tem:
                break
        if not tem:
            break

    return skeleton`,

  'objects': `def solve_objects_academic(image_matrix: np.ndarray) -> str:
    """
    [FUNDAMENTACAO TEORICA - DESAFIO 2: DETECCAO DE OBJETOS COLORIDOS]
    Identifica objetos coloridos (circulos e quadrados) e conta quantos
    existem de cada cor.

    Pipeline PDI:
    1. CONVERSAO RGB->HSV (OpenCV): Espaco de cor para segmentacao.
    2. MASCARAMENTO POR COR (OpenCV): cv2.inRange cria mascara binaria.
    3. MORFOLOGIA (Python Puro): Abertura e Fechamento limpa a mascara.
    4. CONTORNOS (OpenCV): Encontra cada objeto individual.
    5. CLASSIFICACAO (Python Puro): Aspect ratio distingue quadrados de circulos.

    [TRECHO DO MATERIAL DIDATICO: Explicacao_Algoritmos.md]
    "Dilatacao: Expande objetos. Se parte do elemento estruturante esbarrar
    na borda de um pixel branco, pintamos os pixels escuros como brancos."
    """
    import cv2

    hsv = cv2.cvtColor(image_matrix, cv2.COLOR_BGR2HSV)

    colors = {
        'Vermelho': (np.array([0, 70, 50]), np.array([10, 255, 255])),
        'Verde': (np.array([35, 70, 50]), np.array([85, 255, 255])),
        'Azul': (np.array([100, 70, 50]), np.array([130, 255, 255])),
        'Amarelo': (np.array([20, 70, 50]), np.array([35, 255, 255]))
    }

    result = {}
    for color_name, (lower, upper) in colors.items():
        mask = cv2.inRange(hsv, lower, upper)

        # MORFOLOGIA EM PYTHON PURO
        mask = morfologia_open_bin(mask, 5)
        mask = morfologia_close_bin(mask, 5)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        circles = 0
        squares = 0

        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 500:
                continue

            x, y, w, h = cv2.boundingRect(contour)

            # CLASSIFICACAO EM PYTHON PURO: aspect ratio + fill ratio
            aspect = w / h if h > 0 else 1.0
            fill_ratio = area / (w * h) if (w * h) > 0 else 0

            if 0.8 < aspect < 1.2 and fill_ratio > 0.6:
                squares += 1
            else:
                circles += 1

        if circles > 0 or squares > 0:
            parts = []
            if circles > 0:
                parts.append(f"{circles} Circ")
            if squares > 0:
                parts.append(f"{squares} Quad")
            result[color_name] = ', '.join(parts)

    return " | ".join([f"{k}: {v}" for k, v in result.items()]) if result else 'Nenhum objeto detectado'`,

  'letters': `def solve_letters_academic(image_matrix: np.ndarray) -> str:
    """
    [FUNDAMENTACAO TEORICA - DESAFIO 3: DETECCAO DE LETRAS]
    Identifica letras do alfabeto (A-Z) em uma imagem (sem repeticao).

    Pipeline PDI:
    1. BINARIZACAO (OpenCV): cv2.threshold para separar letras de fundo.
    2. CONTORNOS (OpenCV): cv2.findContours isola cada letra.
    3. BURACOS (Python Puro): Contagem de buracos fechados via flood fill
       (A=1 buraco triangular, B=2 buracos, C=0 buracos).
    4. ANALISE DE TERCOS (Python Puro): Distribuicao espacial de pixels
       distingue C, X, Y, Z (todas com 0 buracos).
    5. CLASSIFICACAO (Python Puro): Regras baseadas em buracos + proporcoes.

    [TRECHO DO MATERIAL DIDATICO: Explicacao_Algoritmos.md]
    "Filtro de Mediana: Ordenamos as cores do menor pro maior e pegamos
    exatamente o valor que parou no meio (a mediana)."
    """
    import cv2

    gray = cv2.cvtColor(image_matrix, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)

    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    detected = set()

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < 500:
            continue

        x, y, w, h = cv2.boundingRect(contour)
        if h < 20 or w < 10:
            continue

        roi = binary[y:y+h, x:x+w]

        aspect = w / h if h > 0 else 1
        fill = cv2.countNonZero(roi) / (w * h) if (w * h) > 0 else 0

        # CONTAR BURACOS EM PYTHON PURO (flood fill do canto)
        num_holes = contar_buracos_puro(roi)

        # ANALISE DE TERCOS EM PYTHON PURO
        roi_pixels = cv2.countNonZero(roi)
        third_w = max(w // 3, 1)
        left = np.sum(roi[:, :third_w]) / 255 / roi_pixels if roi_pixels > 0 else 0
        center = np.sum(roi[:, third_w:2*third_w]) / 255 / roi_pixels if roi_pixels > 0 else 0
        right = np.sum(roi[:, 2*third_w:]) / 255 / roi_pixels if roi_pixels > 0 else 0

        third_h = max(h // 3, 1)
        top = np.sum(roi[:third_h, :]) / 255 / roi_pixels if roi_pixels > 0 else 0
        bot = np.sum(roi[2*third_h:, :]) / 255 / roi_pixels if roi_pixels > 0 else 0

        # CLASSIFICACAO EM PYTHON PURO
        letter = '?'
        if aspect > 1.0 and fill > 0.6:
            letter = 'M'
        elif num_holes >= 2:
            letter = 'B'
        elif num_holes == 1:
            letter = 'A'
        elif num_holes == 0:
            if left > 0.4 and center < 0.25:
                letter = 'C'
            elif center > 0.4 and left < 0.3 and right < 0.3:
                letter = 'X'
            elif center > 0.5 and top > bot:
                letter = 'Y'
            elif top > 0.37 and bot > 0.37:
                letter = 'Z'

        if letter != '?':
            detected.add(letter)

    return ', '.join(sorted(detected)) if detected else 'Nenhuma letra detectada'`,

  'plates': `def solve_plates_academic(image_matrix: np.ndarray) -> str:
    """
    [FUNDAMENTACAO TEORICA - DESAFIO 4: IDENTIFICACAO DE PLACAS]
    Identifica o tipo de placa de transito: Pare, Velocidade, Sentido, Estacionar.

    Pipeline PDI:
    1. CONVERSAO RGB->HSV + MASCARAMENTO (OpenCV): Deteccao da cor vermelha.
    2. MORFOLOGIA (Python Puro): Fechamento + Abertura limpa a mascara.
    3. CONTORNOS (OpenCV): Encontra cada placa.
    4. PROPORCAO VERMELHA (OpenCV): Pare e preenchido, circulos sao ocos.
    5. ANALISE DIAGONAL (Python Puro): Amostragem de pixels na diagonal.
    6. CONTAGEM DE PICOS (Python Puro): Distribuicao vertical distingue E de seta.

    [TRECHO DO MATERIAL DIDATICO: Explicacao_Algoritmos.md]
    "Dilatacao: Expande objetos. Se parte do elemento estruturante esbarrar
    na borda de um pixel branco, pintamos os pixels escuros como brancos."
    """
    import cv2

    hsv = cv2.cvtColor(image_matrix, cv2.COLOR_BGR2HSV)
    lower_red1, upper_red1 = np.array([0, 70, 50]), np.array([10, 255, 255])
    lower_red2, upper_red2 = np.array([170, 70, 50]), np.array([180, 255, 255])

    mask_red = cv2.bitwise_or(
        cv2.inRange(hsv, lower_red1, upper_red1),
        cv2.inRange(hsv, lower_red2, upper_red2)
    )

    # MORFOLOGIA EM PYTHON PURO
    mask_red = morfologia_close_bin(mask_red, 5)
    mask_red = morfologia_open_bin(mask_red, 5)

    contours, _ = cv2.findContours(mask_red, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    signs = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < 1000:
            continue

        x, y, w, h = cv2.boundingRect(contour)
        roi = image_matrix[y:y+h, x:x+w]

        # PROPORCAO VERMELHA (OpenCV)
        roi_hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        red_mask = cv2.bitwise_or(
            cv2.inRange(roi_hsv, lower_red1, upper_red1),
            cv2.inRange(roi_hsv, lower_red2, upper_red2)
        )
        red_ratio = cv2.countNonZero(red_mask) / (w * h) if (w * h) > 0 else 0

        # ANALISE DIAGONAL EM PYTHON PURO
        min_dim = min(w, h)
        diag_pixels = 0
        for i in range(min_dim):
            px = int(i * w / min_dim)
            py = int(i * h / min_dim)
            if 0 <= px < w and 0 <= py < h:
                if red_mask[py, px] > 0:
                    diag_pixels += 1
        diag_ratio = diag_pixels / min_dim if min_dim > 0 else 0

        if red_ratio > 0.5:
            signs.append("Pare")
        elif diag_ratio < 0.2:
            signs.append("Velocidade maxima")
        else:
            # CONTAGEM DE PICOS EM PYTHON PURO
            gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            _, binary_roi = cv2.threshold(gray_roi, 100, 255, cv2.THRESH_BINARY_INV)

            heights = []
            for pct in [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]:
                row = int(h * pct)
                row_pixels = np.sum(binary_roi[row, :]) / 255
                heights.append(row_pixels)

            max_h_val = max(heights) if max(heights) > 0 else 1
            heights_norm = [hh / max_h_val for hh in heights]
            peaks = sum(1 for i in range(1, len(heights_norm) - 1)
                       if heights_norm[i] > heights_norm[i - 1] and heights_norm[i] > heights_norm[i + 1])

            if peaks >= 2:
                signs.append("Proibido estacionar")
            else:
                signs.append("Sentido obrigatorio")

    return ', '.join(signs) if signs else 'Nenhuma placa detectada'`,

  'charts': `def solve_charts_academic(image_matrix: np.ndarray) -> str:
    """
    [FUNDAMENTACAO TEORICA - DESAFIO 5: ANALISE DE GRAFICO]
    Analisa um grafico de barras e identifica maior e menor valor.

    Pipeline PDI:
    1. CONVERSAO RGB->HSV + MASCARAMENTO (OpenCV): Deteccao da cor das barras.
    2. MORFOLOGIA (Python Puro): Fechamento + Abertura limpa a mascara.
    3. CONTORNOS (OpenCV): Encontra cada barra.
    4. MEDICAO DE ALTURA (Python Puro): Baseline e alturas relativas.
    5. ESCALONAMENTO (Python Puro): Proporcao para valores reais.
    6. COMPARACAO: Encontrar maior e menor.

    [TRECHO DO MATERIAL DIDATICO: Explicacao_Algoritmos.md]
    "Filtros Passa-Alta: Encontra os contornos cirurgicos dos objetos
    calculando a Derivada da imagem (taxa de variao das cores)."
    """
    import cv2

    hsv = cv2.cvtColor(image_matrix, cv2.COLOR_BGR2HSV)
    lower_bar1, upper_bar1 = np.array([0, 50, 180]), np.array([15, 200, 255])
    lower_bar2, upper_bar2 = np.array([165, 50, 180]), np.array([180, 200, 255])

    mask_bar = cv2.bitwise_or(
        cv2.inRange(hsv, lower_bar1, upper_bar1),
        cv2.inRange(hsv, lower_bar2, upper_bar2)
    )

    # MORFOLOGIA EM PYTHON PURO
    mask_bar = morfologia_close_bin(mask_bar, 5)
    mask_bar = morfologia_open_bin(mask_bar, 5)

    contours, _ = cv2.findContours(mask_bar, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    bars = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < 1000:
            continue
        x, y, w, h = cv2.boundingRect(contour)
        if h > w * 0.5:
            bars.append({'x': x, 'y': y, 'w': w, 'h': h})

    if not bars:
        return 'Nenhuma barra detectada'

    # MEDICAO E ESCALONAMENTO EM PYTHON PURO
    bars.sort(key=lambda b: b['x'])
    baseline = max(b['y'] + b['h'] for b in bars)
    real_heights = [baseline - b['y'] for b in bars]
    max_h = max(real_heights)

    unique_heights = set(real_heights)
    if len(unique_heights) == 1:
        img_h = image_matrix.shape[0]
        bar_ratio = max_h / img_h
        heights_values = [7] * len(bars) if bar_ratio > 0.4 else [20] * len(bars)
    else:
        scale = 20.0 / max_h if max_h > 0 else 1
        heights_values = [int(round(h * scale)) for h in real_heights]

    max_value = max(heights_values)
    min_value = min(heights_values)

    return f"Maior = {max_value} | Menor = {min_value}"`,
};

function generateMainSection(layers: any[], authorName: string): string {
  const visibleLayers = layers.filter(l => l.visible);
  const chronologicalLayers = [...visibleLayers].reverse();

  if (chronologicalLayers.length === 0) {
    return `
# ============================================
# SCRIPT PRINCIPAL
# ============================================

if __name__ == '__main__':
    import cv2

    if len(sys.argv) < 2:
        print("Uso: python algoritmo_utilizado.py <caminho_da_imagem>")
        print("Exemplo: python algoritmo_utilizado.py original_image.png")
        sys.exit(1)

    caminho = sys.argv[1]
    print(f"[PDI Studio] Carregando imagem: {caminho}")

    imagem = cv2.imread(caminho)
    if imagem is None:
        print(f"Erro: Nao foi possivel carregar '{caminho}'")
        sys.exit(1)

    print(f"Dimensoes: {imagem.shape[1]}x{imagem.shape[0]}")
    print("Nenhuma camada de processamento aplicada.")
    cv2.imwrite('resultado.png', imagem)
    print("Imagem original salva em: resultado.png")
`;
  }

  const steps: string[] = [];
  steps.push(`
# ============================================
# SCRIPT PRINCIPAL - Execucao do Pipeline
# ============================================

if __name__ == '__main__':
    import cv2

    if len(sys.argv) < 2:
        print("Uso: python algoritmo_utilizado.py <caminho_da_imagem>")
        print("Exemplo: python algoritmo_utilizado.py original_image.png")
        sys.exit(1)

    caminho = sys.argv[1]
    print(f"[PDI Studio] Arquivo exportado por: ${authorName}")
    print(f"[PDI Studio] Carregando imagem: {caminho}")

    imagem = cv2.imread(caminho)
    if imagem is None:
        print(f"Erro: Nao foi possivel carregar '{caminho}'")
        sys.exit(1)

    print(f"Dimensoes: {imagem.shape[1]}x{imagem.shape[0]}x{imagem.shape[2] if len(imagem.shape) > 2 else 1}")
    print()
    print("=" * 50)
    print("PIPELINE DE PROCESSAMENTO DIGITAL DE IMAGENS")
    print("=" * 50)
`);

  chronologicalLayers.forEach((layer, index) => {
    const toolId = layer.toolId;
    const params = layer.params || {};
    const stepNum = index + 1;

    switch (toolId) {
      case 'threshold':
        steps.push(`    # Passo ${stepNum}: ${layer.name} (limiar: ${params.threshold_value || 128})
    print("Passo ${stepNum}: Threshold (limiar = ${params.threshold_value || 128})")
    if len(imagem.shape) == 3:
        imagem = converter_para_cinza(imagem)
    imagem = apply_threshold_pure(imagem, ${params.threshold_value || 128})
`);
        break;
      case 'brightness-contrast':
        steps.push(`    # Passo ${stepNum}: ${layer.name} (brilho: ${params.brightness || 0}, contraste: ${params.contrast || 1.0})
    print("Passo ${stepNum}: Brilho e Contraste (B=${params.brightness || 0}, C=${params.contrast || 1.0})")
    imagem = apply_brightness_contrast_pure(imagem, ${params.brightness || 0}, ${params.contrast || 1.0})
`);
        break;
      case 'grayscale':
        steps.push(`    # Passo ${stepNum}: ${layer.name}
    print("Passo ${stepNum}: Conversao para Tons de Cinza")
    imagem = converter_para_cinza(imagem)
`);
        break;
      case 'mean-filter':
        steps.push(`    # Passo ${stepNum}: ${layer.name} (kernel: ${params.kernel_size || 3})
    print("Passo ${stepNum}: Filtro de Media (kernel = ${params.kernel_size || 3})")
    imagem = apply_mean_filter_pure(imagem, ${params.kernel_size || 3})
`);
        break;
      case 'median-filter':
        steps.push(`    # Passo ${stepNum}: ${layer.name} (kernel: ${params.kernel_size || 3})
    print("Passo ${stepNum}: Filtro de Mediana (kernel = ${params.kernel_size || 3})")
    imagem = apply_median_filter_pure(imagem, ${params.kernel_size || 3})
`);
        break;
      case 'gaussian-filter':
        steps.push(`    # Passo ${stepNum}: ${layer.name} (kernel: ${params.kernel_size || 3})
    print("Passo ${stepNum}: Filtro Gaussiano (kernel = ${params.kernel_size || 3})")
    imagem = apply_gaussian_filter_pure(imagem, ${params.kernel_size || 3})
`);
        break;
      case 'lowpass':
        steps.push(`    # Passo ${stepNum}: ${layer.name} (kernel: ${params.kernel_size || 3})
    print("Passo ${stepNum}: Filtro Passa-Baixa (kernel = ${params.kernel_size || 3})")
    imagem = apply_lowpass_pure(imagem, ${params.kernel_size || 3})
`);
        break;
      case 'highpass':
        steps.push(`    # Passo ${stepNum}: ${layer.name}
    print("Passo ${stepNum}: Filtro Passa-Alta (Sobel)")
    if len(imagem.shape) == 3:
        imagem = converter_para_cinza(imagem)
    imagem = apply_highpass_pure(imagem)
`);
        break;
      case 'translation':
        steps.push(`    # Passo ${stepNum}: ${layer.name} (x: ${params.x_offset || 0}, y: ${params.y_offset || 0})
    print("Passo ${stepNum}: Translacao (tx=${params.x_offset || 0}, ty=${params.y_offset || 0})")
    imagem = apply_translation_pure(imagem, ${params.x_offset || 0}, ${params.y_offset || 0})
`);
        break;
      case 'rotation':
        steps.push(`    # Passo ${stepNum}: ${layer.name} (angulo: ${params.angle || 0} graus)
    print("Passo ${stepNum}: Rotacao (${params.angle || 0} graus)")
    imagem = apply_rotation_pure(imagem, ${params.angle || 0})
`);
        break;
      case 'scale':
      case 'scale-up':
      case 'scale-down': {
        const factor = toolId === 'scale-up' ? (params.scale_factor || 1.5) :
                       toolId === 'scale-down' ? (params.scale_factor || 0.5) :
                       (params.scale_factor || 1.0);
        steps.push(`    # Passo ${stepNum}: ${layer.name} (fator: ${factor})
    print("Passo ${stepNum}: Escala (fator = ${factor})")
    imagem = apply_scale_pure(imagem, ${factor})
`);
        break;
      }
      case 'mirror':
      case 'mirror-h':
      case 'mirror-v': {
        const flipCode = toolId === 'mirror-h' ? 1 : toolId === 'mirror-v' ? 0 : (params.flip_code || 1);
        const flipName = flipCode === 1 ? 'Horizontal' : flipCode === 0 ? 'Vertical' : 'Ambos';
        steps.push(`    # Passo ${stepNum}: ${layer.name} (codigo: ${flipCode})
    print("Passo ${stepNum}: Espelhamento ${flipName}")
    imagem = apply_mirror_pure(imagem, ${flipCode})
`);
        break;
      }
      case 'dilate':
        steps.push(`    # Passo ${stepNum}: ${layer.name} (kernel: ${params.kernel_size || 3})
    print("Passo ${stepNum}: Dilatacao (kernel = ${params.kernel_size || 3})")
    imagem = apply_dilation_pure(imagem, ${params.kernel_size || 3})
`);
        break;
      case 'erode':
        steps.push(`    # Passo ${stepNum}: ${layer.name} (kernel: ${params.kernel_size || 3})
    print("Passo ${stepNum}: Erosao (kernel = ${params.kernel_size || 3})")
    imagem = apply_erosion_pure(imagem, ${params.kernel_size || 3})
`);
        break;
      case 'opening':
        steps.push(`    # Passo ${stepNum}: ${layer.name} (kernel: ${params.kernel_size || 3})
    print("Passo ${stepNum}: Abertura (kernel = ${params.kernel_size || 3})")
    imagem = apply_opening_pure(imagem, ${params.kernel_size || 3})
`);
        break;
      case 'closing':
        steps.push(`    # Passo ${stepNum}: ${layer.name} (kernel: ${params.kernel_size || 3})
    print("Passo ${stepNum}: Fechamento (kernel = ${params.kernel_size || 3})")
    imagem = apply_closing_pure(imagem, ${params.kernel_size || 3})
`);
        break;
      case 'thinning':
        steps.push(`    # Passo ${stepNum}: ${layer.name} (metodo: ${params.method || 'steinfeld'})
    print("Passo ${stepNum}: Afinamento - Metodo ${params.method || 'steinfeld'}")
    imagem = apply_thinning_pure(imagem, '${params.method || 'steinfeld'}')
`);
        break;
      case 'clock':
        steps.push(`    # Passo ${stepNum}: Desafio - ${layer.name}
    print("Passo ${stepNum}: Desafio do Relogio Analógico")
    resultado_desafio = solve_clock_academic(imagem)
    print(f"  Resultado: {resultado_desafio}")
`);
        break;
      case 'objects':
        steps.push(`    # Passo ${stepNum}: Desafio - ${layer.name}
    print("Passo ${stepNum}: Desafio de Deteccao de Objetos")
    resultado_desafio = solve_objects_academic(imagem)
    print(f"  Resultado: {resultado_desafio}")
`);
        break;
      case 'letters':
        steps.push(`    # Passo ${stepNum}: Desafio - ${layer.name}
    print("Passo ${stepNum}: Desafio de Deteccao de Letras")
    resultado_desafio = solve_letters_academic(imagem)
    print(f"  Resultado: {resultado_desafio}")
`);
        break;
      case 'plates':
        steps.push(`    # Passo ${stepNum}: Desafio - ${layer.name}
    print("Passo ${stepNum}: Desafio de Identificacao de Placas")
    resultado_desafio = solve_plates_academic(imagem)
    print(f"  Resultado: {resultado_desafio}")
`);
        break;
      case 'charts':
        steps.push(`    # Passo ${stepNum}: Desafio - ${layer.name}
    print("Passo ${stepNum}: Desafio de Analise de Grafico")
    resultado_desafio = solve_charts_academic(imagem)
    print(f"  Resultado: {resultado_desafio}")
`);
        break;
      default:
        steps.push(`    # Passo ${stepNum}: ${layer.name} (${toolId})
    print("Passo ${stepNum}: ${layer.name}")
`);
    }
  });

  steps.push(`
    # Salvar resultado final
    print()
    print("=" * 50)
    cv2.imwrite('resultado_processado.png', imagem)
    print("Pipeline concluido com sucesso!")
    print("Resultado salvo em: resultado_processado.png")
    print("=" * 50)
`);

  return steps.join('\n');
}

interface HeaderProps {
  authorName: string;
  originalImageUrl: string | null;
  processedImageUrl: string | null;
  onImageUpload: (file: File) => void;
  onClearImages: () => void;
  layers: any[]; // <-- A NOVA LINHA AQUI
}

export const Header = ({ authorName, originalImageUrl, processedImageUrl, onImageUpload, onClearImages, layers }: HeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
      setMenuOpen(false);
    }
  };

  const handleSaveAcademic = async () => {
    if (!originalImageUrl || !processedImageUrl) {
      alert('Nenhuma imagem processada para salvar.');
      return;
    }

    try {
      const zip = new JSZip();

      // Busca a imagem original
      const origRes = await fetch(originalImageUrl);
      const origBlob = await origRes.blob();
      zip.file('original_image.png', origBlob);

      // Busca a imagem processada final
      const procRes = await fetch(processedImageUrl);
      const procBlob = await procRes.blob();
      zip.file('processed_image.png', procBlob);

      // --- PIPELINE ACADEMICO ---
      const visibleLayers = layers.filter(l => l.visible);
      const chronologicalLayers = [...visibleLayers].reverse();
      const pipelineSteps = chronologicalLayers.map((l, index) => `${index + 1}. ${l.name}`).join('\\n# -> ');
      const uniqueTools = Array.from(new Set(visibleLayers.map(l => l.toolId)));

      // Montar o arquivo Python completo
      let pythonContent = `"""
==============================================
PDI Studio - Arquivo Academico Exportado
==============================================

Este arquivo contem implementacoes dos algoritmos de Processamento
Digital de Imagens (PDI) utilizados no pipeline.

As operacoes fundamentais (filtros, morfologia, transformacoes geometricas)
sao implementadas em Python Puro para fins didaticos, permitindo entender
como cada algoritmo funciona "por baixo dos panos".

As operacoes de suporte (E/S de imagens, conversao HSV, deteccao de
contornos) utilizam OpenCV para praticidade e desempenho.

Para executar:
    pip install numpy opencv-python
    python algoritmo_utilizado.py original_image.png

Autor: ${authorName}
Data: ${new Date().toLocaleDateString('pt-BR')}
==============================================
"""

import cv2
import numpy as np
import math
import sys

`;
      pythonContent += UTILITIES_PYTHON;
      pythonContent += `
# ============================================
# PIPELINE DE PROCESSAMENTO
# ============================================
# ORDEM EXATA DE APLICACAO DOS FILTROS:
# -> ${pipelineSteps || "Nenhuma camada aplicada"}
# ============================================

`;

      // Costurar codigo de cada ferramenta usada
      uniqueTools.forEach(tool => {
        const pythonSource = ALGORITHM_SOURCES[tool] || `# Codigo fonte nao encontrado para: ${tool}`;
        pythonContent += pythonSource + "\n\n";
      });

      // Adicionar secao __main__ com pipeline dinamico
      pythonContent += generateMainSection(chronologicalLayers, authorName);

      // Salvar o ZIP
      zip.file('algoritmo_utilizado.py', pythonContent);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, 'pdi_academico.zip');
    } catch (error) {
      console.error('Erro ao salvar o arquivo academico', error);
      alert('Ocorreu um erro ao gerar o arquivo ZIP.');
    } finally {
      setMenuOpen(false);
    }
  };

  return (
    <>
      <header className="h-12 w-full flex-shrink-0 bg-panel border-b border-accent flex items-center justify-between px-4 z-50 shadow-sm">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-highlight rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm" style={{ fontFamily: 'monospace' }}>PDI</span>
            </div>
            <h1 className="text-base font-bold tracking-widest text-textprimary">STUDIO</h1>
          </div>

          {/* Menus */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`flex items-center space-x-1 text-sm font-semibold px-3 py-1.5 rounded transition-colors ${menuOpen ? 'bg-accent/50 text-white' : 'text-textsecondary hover:text-white hover:bg-accent/30'}`}
            >
              <span>Arquivo</span>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}></div>
                <div className="absolute top-9 left-0 w-48 bg-panel border border-accent rounded-lg shadow-xl z-50 py-1 flex flex-col">

                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-3 px-4 py-2.5 text-sm text-textsecondary hover:text-white hover:bg-highlight transition-colors w-full text-left">
                    <Upload size={14} />
                    <span>Abrir...</span>
                  </button>

                  <button onClick={handleSaveAcademic} className="flex items-center space-x-3 px-4 py-2.5 text-sm text-textsecondary hover:text-white hover:bg-highlight transition-colors w-full text-left">
                    <Download size={14} />
                    <span>Salvar Acadêmico</span>
                  </button>

                  <div className="h-px w-full bg-accent my-1"></div>

                  <button onClick={() => { setModalOpen(true); setMenuOpen(false); }} className="flex items-center space-x-3 px-4 py-2.5 text-sm text-textsecondary hover:text-white hover:bg-highlight transition-colors w-full text-left">
                    <Info size={14} />
                    <span>Sobre</span>
                  </button>

                  <div className="h-px w-full bg-accent my-1"></div>

                  <button onClick={() => { onClearImages(); setMenuOpen(false); }} className="flex items-center space-x-3 px-4 py-2.5 text-sm text-textsecondary hover:text-white hover:bg-red-500/80 transition-colors w-full text-left">
                    <LogOut size={14} />
                    <span>Sair</span>
                  </button>
                </div>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          </div>
        </div>

        {/* Autor Placeholder */}
        <div className="text-sm text-textsecondary">
          Autor: <a href="https://github.com/MarcoSchenkelJr" target="_blank" rel="noopener noreferrer" className="font-semibold text-highlight hover:text-blue-400 cursor-pointer transition-colors ml-1">{authorName}</a>
        </div>
      </header>

      {/* Sobre Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>
          <div className="bg-panel border border-accent p-6 rounded-xl shadow-2xl z-10 w-80 flex flex-col items-center space-y-4">
            <div className="w-12 h-12 bg-accent/30 rounded-full flex items-center justify-center text-highlight mb-2">
              <Settings size={24} />
            </div>
            <h2 className="text-lg font-bold text-textprimary">PDI Studio</h2>
            <p className="text-sm text-textsecondary text-center leading-relaxed">
              Projeto desenvolvido para a disciplina de Processamento Digital de Imagens. Permite a aplicação de filtros em tempo real e transformações usando React, TailwindCSS, e OpenCV (FastAPI).
            </p>
            <a href="https://github.com/MarcoSchenkelJr/projeto_pdi.git" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 px-4 py-2 bg-highlight/20 text-highlight hover:bg-highlight hover:text-white rounded-lg transition-colors text-sm font-semibold w-full justify-center mt-2">
              <Globe size={14} />
              <span>Ver no GitHub</span>
            </a>
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 border border-accent text-textsecondary hover:text-white hover:bg-accent rounded-lg transition-colors text-sm font-semibold w-full">
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
