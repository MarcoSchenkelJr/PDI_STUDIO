"""
MORFOLOGIA MATEMÁTICA (Operações com Elemento Estruturante)
===========================================================

A morfologia matemática é um ramo da PDI que processa imagens baseado em
FORMATOS. Utiliza um "carimbo" chamado Elemento Estruturante (SE / Kernel)
que percorre a imagem binária para expandir, contrair ou analisar objetos.

Conceito fundamental:
    O Elemento Estruturante (geralmente 3x3 em cruz ou quadrado) é posicionado
    sobre cada pixel da imagem. O resultado depende de como os pixels do SE
    "encaixam" com os pixels da imagem.

Operações básicas:
    - DILATAÇÃO (X ⊕ S): MÁXIMO local — expande objetos brancos
    - EROSÃO (X ⊖ S): MÍNIMO local — contrai objetos brancos
    - ABERTURA (X ∘ S): Erosão + Dilatação — remove ruído branco
    - FECHAMENTO (X • S): Dilatação + Erosão — preenche buracos pretos
    - AFINAMENTO: Reduz ao esqueleto de 1 pixel (Steinfeld, Zhang-Suen, Holt)

Referência: 7_Morfologia_Matemática.docx
            Morfologia_Matematica.pptx
            Afinamento.pptx
            TCC_Algoritmos_Thinning_Suas_Aplicacoes.pdf
"""

import cv2
import numpy as np


def apply_dilation(image_bytes: bytes, kernel_size: int, iterations: int = 1) -> bytes:
    """
    DILATAÇÃO (Expansão de Objetos Brancos)
    =========================================
    
    Se QUALQUER pixel dentro do Elemento Estruturante for BRANCO (255),
    o pixel central se torna branco. "Incha" os objetos.
    
    Equação: (X ⊕ S)(x,y) = max{S(x+i, y+j)} para todos os (i,j) ∈ S
    
    Efeito visual:
        - Engorda bordas e contornos
        - Fecha buracos pequenos dentro dos objetos
        - Conecta pixels brancos próximos que estavam separados
    
    Referência: 7_Morfologia_Matemática.docx
    "O Elemento Estruturante é comparado à vizinhança a partir de sua origem
    na matriz focal. Se o pixel referenciado pela vizinhança na operação
    coincidir com a borda de proeminência, expande-se o objeto pelo MÁXIMO
    local, engordando formas organicamente e costurando pequenas falhas."
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Elemento estruturante quadrado de NxN (todos os pixels = 1)
    kernel = np.ones((kernel_size, kernel_size), np.uint8)
    dilated = cv2.dilate(img, kernel, iterations=iterations)
    
    _, encoded_img = cv2.imencode('.png', dilated)
    return encoded_img.tobytes()


def apply_erosion(image_bytes: bytes, kernel_size: int, iterations: int = 1) -> bytes:
    """
    EROSÃO (Contração de Objetos Brancos)
    =======================================
    
    SE TODOS os pixels dentro do Elemento Estruturante forem BRANCOS,
    o pixel central permanece branco. Caso contrário, vira preto.
    "Descasca" as bordas dos objetos.
    
    Equação: (X ⊖ S)(x,y) = min{S(x+i, y+j)} para todos os (i,j) ∈ S
    
    Efeito visual:
        - Afin bordas e contornos
        - Remove ruído branco solto (partículas pequenas)
        - Separa objetos que estavam encostados
    
    Referência: 7_Morfologia_Matemática.docx
    "Diferente da dilatação, na Erosão, usamos o Elemento Estruturante
    retirando áreas na fronteira pela lógica de que, se o pixel não
    englobar totalmente o S na vizinhança de área NxN, substitui-se
    o ponto central pelo MÍNIMO contido."
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    kernel = np.ones((kernel_size, kernel_size), np.uint8)
    eroded = cv2.erode(img, kernel, iterations=iterations)
    
    _, encoded_img = cv2.imencode('.png', eroded)
    return encoded_img.tobytes()


def apply_opening(image_bytes: bytes, kernel_size: int) -> bytes:
    """
    ABERTURA (Erosão → Dilatação)
    =============================
    
    Combinação sequencial: primeiro EROSÃO (remove ruído), depois DILATAÇÃO
    (restaura o tamanho original dos objetos grandes).
    
    Equação: X ∘ S = (X ⊖ S) ⊕ S
    
    Efeito: remove pequenos objetos brancos isolados (ruído) sem afetar
    significativamente o tamanho dos objetos grandes.
    
    Referência: Morfologia_Matematica.pptx
    "Morfologia com técnica de Abertura: Primeiro executa as varreduras
    do carimbo restritivo de Erosão total para limpar estrobos curtos
    no interior das formas. Após o limpo, projeta dinamicamente à
    Dilatação."
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    kernel = np.ones((kernel_size, kernel_size), np.uint8)
    opening = cv2.morphologyEx(img, cv2.MORPH_OPEN, kernel)
    
    _, encoded_img = cv2.imencode('.png', opening)
    return encoded_img.tobytes()


def apply_closing(image_bytes: bytes, kernel_size: int) -> bytes:
    """
    FECHAMENTO (Dilatação → Erosão)
    ================================
    
    Combinação sequencial: primeiro DILATAÇÃO (preenche buracos), depois
    EROSÃO (restaura o tamanho original das bordas externas).
    
    Equação: X • S = (X ⊕ S) ⊖ S
    
    Efeito: fecha buracos pequenos dentro dos objetos, costura fendas
    e gaps nas bordas.
    
    Referência: Morfologia_Matematica.pptx
    "O mecanismo investigativo da morfologia digital na configuração
    de fechamento aplica o espessamento Dilatador unificando pequenas
    falhas, cobrindo o microvazamento de bordas."
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    kernel = np.ones((kernel_size, kernel_size), np.uint8)
    closing = cv2.morphologyEx(img, cv2.MORPH_CLOSE, kernel)
    
    _, encoded_img = cv2.imencode('.png', closing)
    return encoded_img.tobytes()


def apply_thinning(image_bytes: bytes, method: str = 'steinfeld') -> bytes:
    """
    AFINAMENTO (Esqueletização / Skeletonization)
    ==============================================
    
    Reduz um objeto binário ao seu "esqueleto" — linhas de 1 pixel de
    espessura que representam a forma central do objeto, preservando
    a conectividade e topologia.
    
    Métodos implementados (todos em Python puro):
    
    1. STEINFELD (Erosão Iterativa):
       Fórmula: S_k(X) = (X ⊖ kS) - [(X ⊖ kS) ∘ S]
       Itera até não restar pixels brancos. Limite de segurança: 1000 iterações.
    
    2. ZHANG-SUEN (Paralelo):
       Duas sub-iterações por passo. Remove pixel P1 se:
       - 2 ≤ B(P1) ≤ 6 (nº de vizinhos brancos)
       - A(P1) = 1 (uma transição 0→1 ao redor)
       - Condições específicas para N/S e L/O
    
    3. HOLT (Simplificado):
       Variação do Steinfeld com lógica de parada simplificada.
       Itera erode→dilate→subtract→union. Limite: 100 iterações.
    
    Referência: Afinamento.pptx
    "O afinamento reduz objetos binários ao seu esqueleto de 1 pixel,
    preservando a conectividade e topologia. O algoritmo remove
    iterativamente pixels de borda que não são essenciais para a forma."
    
    Referência: TCC_Algoritmos_Thinning_Suas_Aplicacoes.pdf
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Converter para tons de cinza se necessário
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()
        
    # Binarizar com inversão: objeto=255, fundo=0
    _, img_bin = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)
    
    # Despachar para o método selecionado
    if method == 'zhang_suen':
        skeleton = _thinning_zhang_suen(img_bin)
    elif method == 'holt':
        skeleton = _thinning_holt(img_bin)
    else:  # steinfeld (default)
        skeleton = _thinning_steinfeld(img_bin)
    
    # Inverter resultado: esqueleto=255 no fundo preto
    result = cv2.bitwise_not(skeleton)
    
    if len(img.shape) == 3:
        result = cv2.cvtColor(result, cv2.COLOR_GRAY2BGR)
        
    _, buffer = cv2.imencode('.png', result)
    return buffer.tobytes()


def _thinning_steinfeld(img_bin):
    """
    STEINFELD: Afinamento por Erosão Iterativa
    ============================================
    
    A cada iteração:
    1. Erosão: remove pixels de borda que cabem no SE
    2. Dilatação: reconstrói os pixels removidos
    3. Subtração: identifica pixels que PODEM ser removidos permanentemente
    4. União: adiciona ao esqueleto os pixels removíveis
    
    Para quando não restam pixels brancos no objeto ou atinge 1000 iterações.
    
    Fórmula de Lantejoul:
        S_k(X) = (X ⊖ kS) - [(X ⊖ kS) ∘ S]
        S(X) = ⋃ S_k(X)
    """
    # Adicionar borda de zeros para evitar IndexError nas bordas
    img_bin = cv2.copyMakeBorder(img_bin, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
    
    skeleton = np.zeros(img_bin.shape, np.uint8)
    # Elemento estruturante em cruz (3x3)
    element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
    
    safety_limit = 1000  # Limite de segurança contra loops infinitos
    count = 0
    while True:
        count += 1
        if count > safety_limit:
            break
            
        # 1. Erosão: remove pixels de borda
        eroded = cv2.erode(img_bin, element)
        # 2. Dilatação: reconstrói a partir do erodido
        temp = cv2.dilate(eroded, element)
        # 3. Subtração: pixels que NÃO foram reconstruídos = removíveis
        temp = cv2.subtract(img_bin, temp)
        # 4. União com esqueleto
        skeleton = cv2.bitwise_or(skeleton, temp)
        # 5. Atualizar: o erodido vira a nova entrada
        img_bin = eroded.copy()
        
        # Parada: sem pixels brancos restantes
        if cv2.countNonZero(img_bin) == 0:
            break
            
    # Remover borda adicionada no início
    return skeleton[1:-1, 1:-1]


def _thinning_zhang_suen(img_bin):
    """
    ZHANG-SUEN: Afinamento Paralelo com Sub-Iterações
    ===================================================
    
    Algoritmo paralelo clássico. A cada passo, duas sub-iterações:
    
    Sub-iteração 1 (remove bordas Norte/Sul):
        Remove pixel P1 se:
        - 2 ≤ B(P1) ≤ 6 (número de vizinhos brancos)
        - A(P1) = 1 (uma transição preto→branco ao redor)
        - P2 × P4 × P6 = 0 (Norte × Leste × Sul = pelo menos um preto)
        - P4 × P6 × P8 = 0 (Leste × Sul × Oeste = pelo menos um preto)
    
    Sub-iteração 2 (remove bordas Leste/Oeste):
        Mesmas condições, mas:
        - P2 × P4 × P8 = 0
        - P2 × P6 × P8 = 0
    
    P1-P2-P3                    P1 = Norte, P2 = NE, P3 = Leste
    P8-P9-P4  onde P9 = pixel   P4 = SE, P5 = Sul, P6 = SW
    P7-P6-P5  central            P7 = Oeste, P8 = NW
    
    Para quando nenhuma sub-iteração remove pixels ou atinge 100 iterações.
    """
    img_bin = img_bin.copy()
    h, w = img_bin.shape
    
    def get_neighbors(img, i, j):
        """Retorna os 8 vizinhos de P1 em ordem: N, NE, E, SE, S, SW, W, NW."""
        return [
            img[i-1, j], img[i-1, j+1], img[i, j+1], img[i+1, j+1],
            img[i+1, j], img[i+1, j-1], img[i, j-1], img[i-1, j-1]
        ]
    
    def count_transitions(neighbors):
        """Conta transições de 0 para 255 ao redor do pixel (= A(P1))."""
        count = 0
        for k in range(len(neighbors)):
            if neighbors[k] == 0 and neighbors[(k+1) % 8] == 255:
                count += 1
        return count
    
    def count_non_zero(neighbors):
        """Conta pixels vizinhos brancos (= B(P1))."""
        return sum(1 for n in neighbors if n > 0)
    
    changed = True
    safety_limit = 100
    iteration = 0
    
    while changed and iteration < safety_limit:
        changed = False
        iteration += 1
        
        # Sub-iteração 1: condições para N/S
        to_remove = []
        for i in range(1, h-1):
            for j in range(1, w-1):
                if img_bin[i, j] == 0:
                    continue
                p = get_neighbors(img_bin, i, j)
                n = count_non_zero(p)
                s = count_transitions(p)
                
                if 2 <= n <= 6 and s == 1:
                    if int(p[0]) * int(p[2]) * int(p[4]) == 0 and int(p[2]) * int(p[4]) * int(p[6]) == 0:
                        to_remove.append((i, j))
        
        for i, j in to_remove:
            img_bin[i, j] = 255  # Marcar como "removido" (fundo)
            changed = True
        
        # Sub-iteração 2: condições para L/O
        to_remove = []
        for i in range(1, h-1):
            for j in range(1, w-1):
                if img_bin[i, j] == 0:
                    continue
                p = get_neighbors(img_bin, i, j)
                n = count_non_zero(p)
                s = count_transitions(p)
                
                if 2 <= n <= 6 and s == 1:
                    if int(p[2]) * int(p[4]) * int(p[6]) == 0 and int(p[0]) * int(p[4]) * int(p[6]) == 0:
                        to_remove.append((i, j))
        
        for i, j in to_remove:
            img_bin[i, j] = 255
            changed = True
    
    return img_bin


def _thinning_holt(img_bin):
    """
    HOLT: Afinamento Simplificado
    ==============================
    
    Variação simplificada do Steinfeld. A cada iteração:
    1. Erosão: remove pixels de borda
    2. Dilatação: reconstrói pixels interiores
    3. Subtração: pixels removíveis = original - reconstruído
    4. União com esqueleto
    
    Diferente do Steinfeld, Holt não adiciona borda de segurança
    e usa limite de 100 iterações.
    """
    img_bin = img_bin.copy()
    h, w = img_bin.shape
    
    element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
    
    skeleton = np.zeros(img_bin.shape, np.uint8)
    current = img_bin.copy()
    
    safety_limit = 100
    count = 0
    while count < safety_limit:
        count += 1
        
        # 1. Erosão
        eroded = cv2.erode(current, element)
        # 2. Dilatação
        temp = cv2.dilate(eroded, element)
        # 3. Subtração: pixels removíveis
        diff = cv2.subtract(current, temp)
        # 4. União com esqueleto
        skeleton = cv2.bitwise_or(skeleton, diff)
        # 5. Atualizar
        current = eroded.copy()
        
        if cv2.countNonZero(current) == 0:
            break
    
    return skeleton