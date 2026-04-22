import cv2
import numpy as np

def apply_translation(image_bytes: bytes, x_offset: int, y_offset: int) -> bytes:
    """Move a imagem nos eixos X e Y."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    rows, cols = img.shape[:2]
    
    # Matriz de translação
    M = np.float32([[1, 0, x_offset], [0, 1, y_offset]])
    translated = cv2.warpAffine(img, M, (cols, rows))
    
    _, encoded_img = cv2.imencode('.png', translated)
    return encoded_img.tobytes()

def apply_rotation(image_bytes: bytes, angle: float) -> bytes:
    """Rotaciona a imagem em graus a partir do centro."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    rows, cols = img.shape[:2]
    
    # Matriz de rotação
    center = (cols / 2, rows / 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(img, M, (cols, rows))
    
    _, encoded_img = cv2.imencode('.png', rotated)
    return encoded_img.tobytes()

def apply_scale(image_bytes: bytes, scale_factor: float) -> bytes:
    """Aumenta ou diminui o tamanho da imagem."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    scaled = cv2.resize(img, None, fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_LINEAR)
    
    _, encoded_img = cv2.imencode('.png', scaled)
    return encoded_img.tobytes()

def apply_mirror(image_bytes: bytes, flip_code: int) -> bytes:
    """Espelha a imagem. 1 = Horizontal, 0 = Vertical, -1 = Ambos."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    mirrored = cv2.flip(img, flip_code)
    
    _, encoded_img = cv2.imencode('.png', mirrored)
    return encoded_img.tobytes()