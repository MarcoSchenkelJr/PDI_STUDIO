"""
TRANSFORMAÇÕES GEOMÉTRICAS (Remapeamento de Coordenadas)
=======================================================

As transformações geométricas alteram a POSIÇÃO dos pixels na imagem
sem modificar suas cores/valores. Cada pixel (x,y) da imagem de saída
é mapeado a partir de uma coordenada (x',y') da imagem de entrada.

Classificação:
    - RÍGIDAS: preservam formas e tamanhos (translação, rotação, espelhamento)
    - AFINS: preservam linhas retas e paralelismo (translação, rotação, escala)
    - PROJETIVAS: preservam apenas linhas retas (perspectiva)

Interpolação: Como as coordenadas mapeadas podem cair em posições
não-inteiras, é necessário interpolar (estimar) o valor do pixel.
    - Vizinho-mais-próximo: rápido, mas gera "escadinha"
    - Bilinear: suave, boa qualidade (usado por padrão)
    - Bicúbico: mais lento, máxima qualidade

Referência: P_D_I_Transformações_Geométricas.pdf
            Transformações_Geométricas.pdf
            9_Sistema_de_Processamento_Digital_de_Imagens.txt
"""

import cv2
import numpy as np


def apply_translation(image_bytes: bytes, x_offset: int, y_offset: int) -> bytes:
    """
    TRANSLAÇÃO (Deslocamento Espacial)
    ====================================
    
    Move cada pixel por uma quantidade fixa nos eixos X e Y.
    É a transformação geométrica mais simples.
    
    Matriz Afim 2x3 de Translação:
        [ x' ]   [ 1  0  tx ]   [ x ]
        [ y' ] = [ 0  1  ty ] × [ y ]
        [ 1  ]   [ 0  0   1 ]   [ 1 ]
    
    Onde tx e ty são os deslocamentos horizontal e vertical.
    
    Referência: 9_Sistema_de_Processamento_Digital_de_Imagens.txt
    "Translação Espacial: O processo de transladar um objeto consiste em
    deslocar ou somar a cada um dos pixels um determinado valor fixo."
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    rows, cols = img.shape[:2]
    
    # Matriz de translação 2x3
    M = np.float32([[1, 0, x_offset], [0, 1, y_offset]])
    translated = cv2.warpAffine(img, M, (cols, rows))
    
    _, encoded_img = cv2.imencode('.png', translated)
    return encoded_img.tobytes()


def apply_rotation(image_bytes: bytes, angle: float) -> bytes:
    """
    ROTAÇÃO (Giro ao Redor de um Pivô)
    ====================================
    
    Rotaciona a imagem ao redor de um ponto central (pivô) por um ângulo θ.
    
    Matriz de Rotação 2x2:
        [ x' ]   [ cos(θ)  -sin(θ) ]   [ x - xp ]
        [ y' ] = [ sin(θ)   cos(θ) ] × [ y - yp ]
    
    Onde:
        - θ = ângulo de rotação em graus (convertido para radianos)
        - (xp, yp) = centro de rotação (geralmente o centro da imagem)
    
    A interpolação backward (Novo → Antigo) mapeia cada pixel de saída
    para sua posição correspondente na entrada, evitando pixels "buracos".
    
    Referência: P_D_I_Transformações_Geométricas.pdf
    "Todas as transformações geométricas são resolvidas utilizando
    multiplicação de matrizes. A interpolação Backward evita pixels
    espúrios (aliasing) da grade."
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    rows, cols = img.shape[:2]
    
    center = (cols / 2, rows / 2)
    # getRotationMatrix2D gera a matriz 2x3 com seno/cosseno
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(img, M, (cols, rows))
    
    _, encoded_img = cv2.imencode('.png', rotated)
    return encoded_img.tobytes()


def apply_scale(image_bytes: bytes, scale_factor: float) -> bytes:
    """
    ESCALA (Redimensionamento)
    ===========================
    
    Altera o tamanho da imagem por um fator proporcional.
    
    Mapeamento de coordenadas:
        Para cada pixel (x', y') na imagem nova:
            x = x' / scale_factor
            y = y' / scale_factor
    
    Interpolação: Como as coordenadas mapeadas podem ser não-inteiras,
    o OpenCV usa interpolação BILINEAR (média ponderada dos 4 pixels
    vizinhos mais próximos) para suavizar a imagem resultante.
    
    Referência: P_D_I_Transformações_Geométricas.pdf
    "Escala: É a alteração do tamanho da imagem, deixando-a maior ou menor.
    O desenho no destino altera as distâncias através de remapeamento linear."
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # INTER_LINEAR = interpolação bilinear (boa qualidade + performance)
    scaled = cv2.resize(img, None, fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_LINEAR)
    
    _, encoded_img = cv2.imencode('.png', scaled)
    return encoded_img.tobytes()


def apply_mirror(image_bytes: bytes, flip_code: int) -> bytes:
    """
    ESPELHAMENTO (Reflexão / Flip)
    ===============================
    
    Inverte a imagem em um ou dois eixos. É uma operação de reflexão
    que inverte a ordem dos pixels ao longo do eixo especificado.
    
    Tipos de espelhamento:
        flip_code =  1 → Horizontal: I(x,y) = I(Largura-x, y)
        flip_code =  0 → Vertical:   I(x,y) = I(x, Altura-y)
        flip_code = -1 → Ambos:      I(x,y) = I(Largura-x, Altura-y)
    
    Referência: Transformações_Geométricas.pdf
    "O mapeamento direto determinístico preserva invariavelmente os
    agrupamentos luminosos, onde rebatemos o reflexo pela troca
    estrita da variável escalar de localização."
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # cv2.flip inverte os eixos conforme flip_code
    mirrored = cv2.flip(img, flip_code)
    
    _, encoded_img = cv2.imencode('.png', mirrored)
    return encoded_img.tobytes()