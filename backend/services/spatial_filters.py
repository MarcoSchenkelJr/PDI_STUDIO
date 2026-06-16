"""
FILTROS ESPACIAIS (Convolução com Kernel / Máscara)
====================================================

Os filtros espaciais operam na VIZINHANÇA de cada pixel. Um "carimbo" matricial
(chamado Kernel, Máscara ou Elemento Estruturante) desliza sobre a imagem, e o
valor do pixel central é substituído por uma combinação dos pixels vizinhos.

Convolução discreta:
    g(x,y) = Σ Σ f(x+i, y+j) * h(i,j)
            i j

Onde:
    - f(x,y) = imagem de entrada
    - h(i,j) = kernel/máscara do filtro
    - g(x,y) = imagem de saída

Classificação por frequência:
    - PASSA-BAIXA: suaviza (remove altas frequências / ruído)
    - PASSA-ALTA: realça bordas (remove baixas frequências / detalhes)

Referência: 2_Passa_Baixa.pptx, 1_Passa_Alta.pptx
            Explicacao_Algoritmos.md
"""

import cv2
import numpy as np


def apply_mean_filter(image_bytes: bytes, kernel_size: int) -> bytes:
    """
    FILTRO DA MÉDIA (Passa-Baixa / Blur)
    ======================================
    
    O filtro de média é o mais simples dos filtros passa-baixa. Cada pixel
    é substituído pela MÉDIA ARITMÉTICA dos pixels na sua vizinhança NxN.
    
    Kernel 3x3:
        h = 1/9 * [[1, 1, 1],
                     [1, 1, 1],
                     [1, 1, 1]]
    
    Efeito: suaviza a imagem, remove ruído de alta frequência, mas também
    borra bordas e detalhes finos.
    
    Referência: 2_Passa_Baixa.pptx
    "O filtro da média atua suavizando as discrepâncias locais espaciais
    de pixel simulando óptica fora de foco."
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Kernel deve ser ímpar para ter um pixel central definido
    if kernel_size % 2 == 0:
        kernel_size += 1
        
    # cv2.blur aplica convolução com kernel de média (todos os pesos = 1/N²)
    blurred = cv2.blur(img, (kernel_size, kernel_size))
    
    _, encoded_img = cv2.imencode('.png', blurred)
    return encoded_img.tobytes()


def apply_median_filter(image_bytes: bytes, kernel_size: int) -> bytes:
    """
    FILTRO DA MEDIANA (Não-Linear / Ordenação)
    ===========================================
    
    Diferente do filtro da média (linear), o filtro da mediana é NÃO-LINEAR.
    Os pixels da vizinhança são ORDENADOS do menor ao maior, e o pixel central
    recebe o valor do MEIO (50º percentil).
    
    Excelente para remover ruído "Sal e Pimenta" (pixels brancos/pretos soltos)
    sem borrar bordas — preserva melhor as arestas que o filtro da média.
    
    Para kernel 3x3 (9 pixels):
        1. Ordena os 9 valores: [v1, v2, ..., v9]
        2. Pixel central recebe v5 (mediana)
    
    Referência: Transformações_Geométricas.pdf
    "Na mediana remove-se componentes de Ruído Sal e Pimenta pela listagem
    das intensidades no núcleo de amostragem NxN, e adota o percentil
    perfeito (50%) que fica imune a pixels extremos."
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if kernel_size % 2 == 0:
        kernel_size += 1
        
    # cv2.medianBlur ordena os vizinhos e seleciona o central
    median = cv2.medianBlur(img, kernel_size)
    
    _, encoded_img = cv2.imencode('.png', median)
    return encoded_img.tobytes()


def apply_gaussian_filter(image_bytes: bytes, kernel_size: int) -> bytes:
    """
    FILTRO GAUSSIANO (Passa-Baixa Ponderado)
    ==========================================
    
    Diferente da média (pesos iguais), o Gaussiano atribui PESOS proporcionais
    à distribuição normal (curva de sino). Pixels mais próximos do centro
    recebem pesos MAIORES, e pixels nas bordas recebem pesos MENORES.
    
    Fórmula do kernel Gaussiano 2D:
        G(x,y) = (1 / 2πσ²) * e^(-(x² + y²) / 2σ²)
    
    Onde σ (sigma) controla a "largura" do desfoque:
        - σ pequeno: desfoque suave
        - σ grande: desfoque intenso
    
    Resultado: desfoque mais "natural" e harmonioso que o filtro da média,
    com transições suaves entre os pixels.
    
    Referência: 2_Passa_Baixa.pptx
    "Aproximação no domínio espacial por núcleos Gaussianos atenuadores
    de frequências. A Equação de Gauss Invariante modela que os pesos
    tornam-se gravitacionais nos raios estritos."
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if kernel_size % 2 == 0:
        kernel_size += 1
        
    # sigmaX=0 faz o OpenCV calcular σ automaticamente: σ = 0.3 * ((ksize-1)*0.5 - 1) + 0.8
    gaussian = cv2.GaussianBlur(img, (kernel_size, kernel_size), 0)
    
    _, encoded_img = cv2.imencode('.png', gaussian)
    return encoded_img.tobytes()


def apply_lowpass(image_bytes: bytes, kernel_size: int) -> bytes:
    """
    FILTRO PASSA-BAIXA
    ===================
    
    Filtra apenas frequências BAIXAS (variações suaves de cor) e atenua
    frequências ALTAS (detalhes finos, ruído, bordas nítidas).
    
    Implementação: utilize o filtro Gaussiano (equivalente funcional).
    
    No domínio da frequência, a transformada de Fourier de um kernel
    Gaussiano é também uma Gaussiana — atenua suavemente as altas
    frequências sem gerar artefatos de "ringing" (ondulações).
    
    Referência: 2_Passa_Baixa.pptx
    "Isso absorve ruídos sem comprometer a estrutura base, pois todos
    os pontos participam com pesos equivalentes."
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if kernel_size % 2 == 0:
        kernel_size += 1
    blurred = cv2.GaussianBlur(img, (kernel_size, kernel_size), 0)
    _, encoded_img = cv2.imencode('.png', blurred)
    return encoded_img.tobytes()


def apply_highpass(image_bytes: bytes) -> bytes:
    """
    FILTRO PASSA-ALTA / DETECÇÃO DE BORDAS (Sobel)
    ================================================
    
    O filtro passa-alta extrai bordas e contornos calculando o GRADIENTE
    da imagem (taxa de variação das intensidades).
    
    Utiliza duas máscaras 3x3 de Sobel para calcular as derivadas parciais:
    
    Máscara Gx (gradiente horizontal):    Máscara Gy (gradiente vertical):
        [[-1,  0,  1],                       [[-1, -2, -1],
         [-2,  0,  2],                        [ 0,  0,  0],
         [-1,  0,  1]]                        [ 1,  2,  1]]
    
    O pixel central tem peso 0 — os pesos negativos de um lado anulam
    os positivos do outro SE as cores forem iguais (= zero, sem borda).
    Se há diferença (borda), os pesos se somam com valor elevado.
    
    Magnitude do gradiente (Teorema de Pitágoras):
        Magnitude = √(Gx² + Gy²)
    
    Referência: 1_Passa_Alta.pptx
    "O método mais comum de diferenciação é o gradiente. Os pesos são
    distribuídos de forma assimétrica em torno de um eixo hipotético."
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    # Sobel requer imagem em tons de cinza (1 canal)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE) 
    
    # Calcular derivada horizontal (Gx) e vertical (Gy)
    sobelx = cv2.Sobel(img, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(img, cv2.CV_64F, 0, 1, ksize=3)
    
    # Magnitude do gradiente: √(Gx² + Gy²)
    magnitude = cv2.magnitude(sobelx, sobely)
    # Converter de float64 para uint8 (0-255)
    magnitude = cv2.convertScaleAbs(magnitude)
    
    _, encoded_img = cv2.imencode('.png', magnitude)
    return encoded_img.tobytes()

