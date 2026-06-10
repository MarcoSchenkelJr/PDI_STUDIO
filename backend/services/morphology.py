import cv2
import numpy as np

def apply_dilation(image_bytes: bytes, kernel_size: int, iterations: int = 1) -> bytes:
    """Aplica a Dilatação (expande as bordas claras)."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Cria o "elemento estruturante" (nossa matriz de carimbo)
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

def apply_thinning(image_bytes: bytes) -> bytes:
    import cv2
    import numpy as np

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
        
    _, img_bin = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)
    
    # Borda de segurança
    img_bin = cv2.copyMakeBorder(img_bin, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
    
    skeleton = np.zeros(img_bin.shape, np.uint8)
    element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
    
    # Trava Máxima: Se o loop rodar mais de 1000 vezes, ele para à força!
    safety_limit = 1000
    count = 0
    while True:
        count += 1
        if count > safety_limit:
            print("⚠️ LIMITE DE SEGURANÇA ATINGIDO NO AFINAMENTO!")
            break
            
        eroded = cv2.erode(img_bin, element)
        temp = cv2.dilate(eroded, element)
        temp = cv2.subtract(img_bin, temp)
        skeleton = cv2.bitwise_or(skeleton, temp)
        img_bin = eroded.copy()
        
        if cv2.countNonZero(img_bin) == 0:
            break
            
    skeleton = skeleton[1:-1, 1:-1]
    result = cv2.bitwise_not(skeleton)
    
    if len(img.shape) == 3:
        result = cv2.cvtColor(result, cv2.COLOR_GRAY2BGR)
        
    _, buffer = cv2.imencode('.png', result)
    return buffer.tobytes()