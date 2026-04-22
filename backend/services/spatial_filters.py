import cv2
import numpy as np

def apply_mean_filter(image_bytes: bytes, kernel_size: int) -> bytes:
    """Aplica o Filtro da Média (suavização simples)."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # O kernel size deve ser um número ímpar (ex: 3, 5, 7...)
    if kernel_size % 2 == 0:
        kernel_size += 1
        
    blurred = cv2.blur(img, (kernel_size, kernel_size))
    
    _, encoded_img = cv2.imencode('.png', blurred)
    return encoded_img.tobytes()

def apply_median_filter(image_bytes: bytes, kernel_size: int) -> bytes:
    """Aplica o Filtro da Mediana (excelente para ruído sal e pimenta)."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if kernel_size % 2 == 0:
        kernel_size += 1
        
    median = cv2.medianBlur(img, kernel_size)
    
    _, encoded_img = cv2.imencode('.png', median)
    return encoded_img.tobytes()

def apply_gaussian_filter(image_bytes: bytes, kernel_size: int) -> bytes:
    """Aplica o Filtro Gaussiano (desfoque natural ponderado)."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if kernel_size % 2 == 0:
        kernel_size += 1
        
    # O 0 no final diz para o OpenCV calcular o desvio padrão automaticamente
    gaussian = cv2.GaussianBlur(img, (kernel_size, kernel_size), 0)
    
    _, encoded_img = cv2.imencode('.png', gaussian)
    return encoded_img.tobytes()

def apply_lowpass(image_bytes: bytes, kernel_size: int) -> bytes:
    """Aplica o Filtro Passa-Baixa (Suavização Gaussiana)."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if kernel_size % 2 == 0:
        kernel_size += 1
    blurred = cv2.GaussianBlur(img, (kernel_size, kernel_size), 0)
    _, encoded_img = cv2.imencode('.png', blurred)
    return encoded_img.tobytes()

def apply_highpass(image_bytes: bytes) -> bytes:
    """Aplica o Filtro Passa-Alta (Detecção de Bordas com Sobel)."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    # Já lê a imagem em tons de cinza, necessário para o Sobel
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE) 
    
    # Filtro de Sobel (X e Y)
    sobelx = cv2.Sobel(img, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(img, cv2.CV_64F, 0, 1, ksize=3)
    
    # Calcula a magnitude do vetor gradiente
    magnitude = cv2.magnitude(sobelx, sobely)
    magnitude = cv2.convertScaleAbs(magnitude) # Converte de volta para 8-bit (0-255)
    
    _, encoded_img = cv2.imencode('.png', magnitude)
    return encoded_img.tobytes()

