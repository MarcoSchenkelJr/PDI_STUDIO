"""
OPERAÇÕES PONTUAIS (Pixel a Pixel)
==================================

As operações pontuais são as mais fundamentais da PDI. Cada pixel da imagem
de saída é calculado EXCLUSIVAMENTE a partir do pixel correspondente na imagem
de entrada — sem considerar pixels vizinhos.

Fórmula geral: g(x,y) = T[f(x,y)]

Onde:
    - f(x,y) = pixel de entrada na posição (x,y)
    - g(x,y) = pixel de saída na posição (x,y)
    - T = transformação aplicada (threshold, brilho, contraste, etc.)

Referência: Processamento_De_Imagens=Metodos_E_Analises.pdf
            Grayscale_Brilho_Contraste.pdf
"""

import cv2
import numpy as np


def apply_threshold(image_bytes: bytes, threshold_value: int) -> bytes:
    """
    LIMIARIZAÇÃO (THRESHOLD / BINARIZAÇÃO)
    =======================================
    
    A limiarização separa objetos de interesse do fundo com base na intensidade
    dos pixels. É uma operação de segmentação que binariza a imagem.
    
    Fórmula matemática:
        g(x,y) = 255  se f(x,y) > T    (branco — objeto)
        g(x,y) = 0    se f(x,y) <= T   (preto — fundo)
    
    Onde T é o valor de limiar (threshold) definido pelo usuário.
    
    Referência: Processamento_De_Imagens=Metodos_E_Analises.pdf
    "Mudando o seu brilho e detectando bordas a partir do contraste analítico,
    o threshold mapeia para Preto e Branco."
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Passo 1: Converter para Grayscale (escala de cinza)
    # A limiarização requer imagem de um único canal
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Passo 2: Aplicar threshold binário
    # Tudo acima do limiar vira 255 (branco), abaixo vira 0 (preto)
    _, thresh_img = cv2.threshold(gray, threshold_value, 255, cv2.THRESH_BINARY)
    
    _, encoded_img = cv2.imencode('.png', thresh_img)
    return encoded_img.tobytes()


def apply_brightness_contrast(image_bytes: bytes, brightness: int = 0, contrast: float = 1.0) -> bytes:
    """
    BRILHO E CONTRASTE (Transformação Linear)
    ==========================================
    
    Operação pontual linear que ajusta a iluminação e o contraste da imagem.
    
    Fórmula da Transformação Linear Rápida:
        D(x,y) = C * f(x,y) + B
    
    Onde:
        - D(x,y) = imagem destino
        - f(x,y) = imagem origem
        - C = Contraste (escalar multiplicativo: C=1 sem contraste)
        - B = Brilho (constante aditiva: B=0 sem brilho)
    
    Efeito do Contraste:
        - C > 1: aumenta o contraste (estica o histograma)
        - C < 1: diminui o contraste (comprime o histograma)
        - C = 1: sem alteração
    
    Efeito do Brilho:
        - B > 0: clareia a imagem
        - B < 0: escurece a imagem
        - B = 0: sem alteração
    
    Referência: Grayscale_Brilho_Contraste.pdf
    "Grandes variações de iluminação podem causar baixo contraste em regiões...
    O ajuste é feito através da Equação da Transformação Linear Rápida."
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # cv2.convertScaleAbs aplica: nova = alpha * original + beta
    # E faz clamp automático: valores < 0 ficam 0, > 255 ficam 255
    adjusted_img = cv2.convertScaleAbs(img, alpha=contrast, beta=brightness)
    
    _, encoded_img = cv2.imencode('.png', adjusted_img)
    return encoded_img.tobytes()


def apply_grayscale(image_bytes: bytes) -> bytes:
    """
    CONVERSÃO PARA TONS DE CINZA (Grayscale)
    =========================================
    
    Converte imagem colorida (3 canais BGR) para escala de cinza (1 canal).
    Utiliza a fórmula de ponderação BT.601 que respeita a sensibilidade
    fisiológica do olho humano aos subcomprimentos de luz:
    
    Y = 0.299 * R + 0.587 * G + 0.114 * B
    
    Onde:
        - Y = luminância (intensidade percebida)
        - R, G, B = canais de cor (0-255)
    
    O canal Verde (G) tem o maior peso (0.587) porque o olho humano é
    mais sensível ao comprimento de onda verde (~555nm).
    
    Referência: Grayscale_Brilho_Contraste.pdf
    "Transformação Grayscale: Útil para etapas posteriores de processamento,
    pois o trabalho de análise é feito em relação a um só canal de cor uniforme."
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # cv2.cvtColor com COLOR_BGR2GRAY aplica internamente a fórmula BT.601
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    _, encoded_img = cv2.imencode('.png', gray)
    return encoded_img.tobytes()

