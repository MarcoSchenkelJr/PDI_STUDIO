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