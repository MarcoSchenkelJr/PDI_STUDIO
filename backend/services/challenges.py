import cv2
import numpy as np
from services.morphology import apply_thinning

def solve_clock(image_bytes: bytes) -> bytes:
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)
        
        h, w = thresh.shape
        center = (w // 2, h // 2)
        radius = int(min(w, h) * 0.35) 
        
        mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(mask, center, radius, 255, -1)
        
        clock_hands = cv2.bitwise_and(thresh, mask)
        
        _, temp_buffer = cv2.imencode('.png', cv2.bitwise_not(clock_hands))
        thinned_bytes = apply_thinning(temp_buffer.tobytes())
        
        nparr_thin = np.frombuffer(thinned_bytes, np.uint8)
        result_bgr = cv2.imdecode(nparr_thin, cv2.IMREAD_COLOR)
        
        cv2.circle(result_bgr, center, radius, (0, 0, 255), 2)
        
        _, final_buffer = cv2.imencode('.png', result_bgr)
        return final_buffer.tobytes()
    except Exception as e:
        print(f"ERRO NO DESAFIO DO RELÓGIO: {e}")
        return image_bytes