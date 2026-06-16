import cv2
import numpy as np

def apply_dilation(image_bytes: bytes, kernel_size: int, iterations: int = 1) -> bytes:
    """Aplica a Dilatação (expande as bordas claras)."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Cria o "elemento estruturante" (matriz de carimbo)
    kernel = np.ones((kernel_size, kernel_size), np.uint8)
    dilated = cv2.dilate(img, kernel, iterations=iterations)
    
    _, encoded_img = cv2.imencode('.png', dilated)
    return encoded_img.tobytes()

def apply_erosion(image_bytes: bytes, kernel_size: int, iterations: int = 1) -> bytes:
    """Aplica a Erosão (desgasta as bordas)."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    kernel = np.ones((kernel_size, kernel_size), np.uint8)
    eroded = cv2.erode(img, kernel, iterations=iterations)
    
    _, encoded_img = cv2.imencode('.png', eroded)
    return encoded_img.tobytes()

def apply_opening(image_bytes: bytes, kernel_size: int) -> bytes:
    """Aplica a Abertura (Erosão -> Dilatação). Limpa ruídos externos."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    kernel = np.ones((kernel_size, kernel_size), np.uint8)
    opening = cv2.morphologyEx(img, cv2.MORPH_OPEN, kernel)
    
    _, encoded_img = cv2.imencode('.png', opening)
    return encoded_img.tobytes()

def apply_closing(image_bytes: bytes, kernel_size: int) -> bytes:
    """Aplica o Fechamento (Dilatação -> Erosão). Preenche buracos."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    kernel = np.ones((kernel_size, kernel_size), np.uint8)
    closing = cv2.morphologyEx(img, cv2.MORPH_CLOSE, kernel)
    
    _, encoded_img = cv2.imencode('.png', closing)
    return encoded_img.tobytes()

def apply_thinning(image_bytes: bytes, method: str = 'steinfeld') -> bytes:
    """Aplica Afinamento usando o método especificado.
    
    Métodos disponíveis:
    - steinfeld: Afinamento morfológico básico (erosão iterativa)
    - zhang_suen: Algoritmo paralelo de Zhang-Suen
    - holt: Algoritmo simplificado de Holt
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()
        
    _, img_bin = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)
    
    if method == 'zhang_suen':
        skeleton = _thinning_zhang_suen(img_bin)
    elif method == 'holt':
        skeleton = _thinning_holt(img_bin)
    else:  # steinfeld (default)
        skeleton = _thinning_steinfeld(img_bin)
    
    result = cv2.bitwise_not(skeleton)
    
    if len(img.shape) == 3:
        result = cv2.cvtColor(result, cv2.COLOR_GRAY2BGR)
        
    _, buffer = cv2.imencode('.png', result)
    return buffer.tobytes()


def _thinning_steinfeld(img_bin):
    """Afinamento morfológico Steinfeld (erosão iterativa)."""
    img_bin = cv2.copyMakeBorder(img_bin, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
    
    skeleton = np.zeros(img_bin.shape, np.uint8)
    element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
    
    safety_limit = 1000
    count = 0
    while True:
        count += 1
        if count > safety_limit:
            break
            
        eroded = cv2.erode(img_bin, element)
        temp = cv2.dilate(eroded, element)
        temp = cv2.subtract(img_bin, temp)
        skeleton = cv2.bitwise_or(skeleton, temp)
        img_bin = eroded.copy()
        
        if cv2.countNonZero(img_bin) == 0:
            break
            
    return skeleton[1:-1, 1:-1]


def _thinning_zhang_suen(img_bin):
    """Algoritmo de Zhang-Suen para afinamento paralelo."""
    img_bin = img_bin.copy()
    h, w = img_bin.shape
    
    def get_neighbors(img, i, j):
        """Retorna os 8 vizinhos de um pixel."""
        return [
            img[i-1, j], img[i-1, j+1], img[i, j+1], img[i+1, j+1],
            img[i+1, j], img[i+1, j-1], img[i, j-1], img[i-1, j-1]
        ]
    
    def count_transitions(neighbors):
        """Conta transições de 0 para 1 nos vizinhos."""
        count = 0
        for k in range(len(neighbors)):
            if neighbors[k] == 0 and neighbors[(k+1) % 8] == 255:
                count += 1
        return count
    
    def count_non_zero(neighbors):
        """Conta pixels vizinhos não-zero."""
        return sum(1 for n in neighbors if n > 0)
    
    changed = True
    safety_limit = 100
    iteration = 0
    
    while changed and iteration < safety_limit:
        changed = False
        iteration += 1
        
        # Sub-iteração 1
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
            img_bin[i, j] = 255
            changed = True
        
        # Sub-iteração 2
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
    """Algoritmo de Holt - afinamento simplificado."""
    img_bin = img_bin.copy()
    h, w = img_bin.shape
    
    element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
    
    # Passo 1: Erosão seguida de dilatação
    eroded = cv2.erode(img_bin, element)
    dilated = cv2.dilate(eroded, element)
    
    # Passo 2: Subtrair para encontrar pixels removíveis
    diff = cv2.subtract(img_bin, dilated)
    
    # Passo 3: Iterar até estabilizar
    skeleton = np.zeros(img_bin.shape, np.uint8)
    current = img_bin.copy()
    
    safety_limit = 100
    count = 0
    while count < safety_limit:
        count += 1
        
        eroded = cv2.erode(current, element)
        temp = cv2.dilate(eroded, element)
        diff = cv2.subtract(current, temp)
        skeleton = cv2.bitwise_or(skeleton, diff)
        current = eroded.copy()
        
        if cv2.countNonZero(current) == 0:
            break
    
    return skeleton