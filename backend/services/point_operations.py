import cv2
import numpy as np

def apply_threshold(image_bytes: bytes, threshold_value: int) -> bytes:
    """
    Aplica o algoritmo de Limiarização (Threshold).
    Converte a imagem para tons de cinza e depois para Preto e Branco
    com base no valor de corte.
    """
    # 1. Decodifica os bytes recebidos do React para uma matriz do OpenCV
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # 2. Converte para Grayscale (passo obrigatório para Threshold simples)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 3. Aplica a matemática do Threshold
    _, thresh_img = cv2.threshold(gray, threshold_value, 255, cv2.THRESH_BINARY)
    
    # 4. Codifica a matriz de volta para formato de imagem (JPEG/PNG) para enviar ao React
    _, encoded_img = cv2.imencode('.png', thresh_img)
    return encoded_img.tobytes()

def apply_brightness_contrast(image_bytes: bytes, brightness: int = 0, contrast: float = 1.0) -> bytes:
    """
    Aplica alterações de Brilho (adição escalar) e Contraste (multiplicação escalar).
    Fórmula: nova_imagem = imagem_original * contraste + brilho
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # cv2.convertScaleAbs previne que os valores passem de 255 ou fiquem abaixo de 0
    adjusted_img = cv2.convertScaleAbs(img, alpha=contrast, beta=brightness)
    
    _, encoded_img = cv2.imencode('.png', adjusted_img)
    return encoded_img.tobytes()

def apply_grayscale(image_bytes: bytes) -> bytes:
    """Converte a imagem para tons de cinza."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, encoded_img = cv2.imencode('.png', gray)
    return encoded_img.tobytes()

