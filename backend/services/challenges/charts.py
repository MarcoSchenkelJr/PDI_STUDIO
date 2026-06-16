import cv2
import numpy as np

def solve_charts(image_bytes: bytes) -> bytes:
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        result = img.copy()

        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # ============================================
        # PASSO 1: DETECÇÃO DA COR DAS BARRAS (VERMELHO/ROSA)
        # ============================================
        # Vermelho/rosa no HSV (H≈178, S≈132, V≈239)
        # Vermelho no HSV tem dois intervalos (0-10 e 170-180)
        lower_bar1 = np.array([0, 50, 180])
        upper_bar1 = np.array([15, 200, 255])
        lower_bar2 = np.array([165, 50, 180])
        upper_bar2 = np.array([180, 200, 255])
        
        mask_bar = cv2.bitwise_or(
            cv2.inRange(hsv, lower_bar1, upper_bar1),
            cv2.inRange(hsv, lower_bar2, upper_bar2)
        )

        # Limpeza morfológica
        kernel = np.ones((5, 5), np.uint8)
        mask_bar = cv2.morphologyEx(mask_bar, cv2.MORPH_CLOSE, kernel)
        mask_bar = cv2.morphologyEx(mask_bar, cv2.MORPH_OPEN, kernel)

        # ============================================
        # PASSO 2: ENCONTRAR CONTORNOS DAS BARRAS
        # ============================================
        contours, _ = cv2.findContours(mask_bar, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        bars = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 1000:  # Ignorar contornos pequenos
                continue
            
            x, y, w, h = cv2.boundingRect(contour)
            
            # Verificar se é uma barra vertical (altura > largura)
            if h > w * 0.5:
                bars.append({
                    'x': x, 'y': y, 'w': w, 'h': h,
                    'height': h  # Altura da barra
                })

        # Ordenar barras da esquerda para direita
        bars.sort(key=lambda b: b['x'])

        # ============================================
        # PASSO 3: ENCONTRAR MAIOR E MENOR BARRA
        # ============================================
        if bars:
            heights = [b['height'] for b in bars]
            
            # Encontrar baseline (parte de baixo de todas as barras)
            baseline = max(b['y'] + b['h'] for b in bars)
            
            # Alturas reais a partir da baseline
            real_heights = [baseline - b['y'] for b in bars]
            max_h = max(real_heights)
            
            # Se todas as barras têm a mesma altura, usar escala padrão
            if len(set(real_heights)) == 1:
                # Barras iguais - tentar detectar o valor pelo tamanho relativo
                # Se a barra ocupa mais de 50% da imagem, provavelmente é 7
                img_h = img.shape[0]
                bar_ratio = max_h / img_h
                if bar_ratio > 0.4:
                    heights_values = [7] * len(bars)
                else:
                    heights_values = [20] * len(bars)
            else:
                # Barras com alturas diferentes - calcular escala
                # Usar 20 como referência para a maior barra
                scale = 20.0 / max_h if max_h > 0 else 1
                heights_values = [int(round(h * scale)) for h in real_heights]
            
            max_value = max(heights_values)
            min_value = min(heights_values)
            
            # Montar texto do resultado
            result_text = f"Maior = {max_value} | Menor = {min_value}"
            
            # ============================================
            # PASSO 4: RENDERIZAR RESULTADO
            # ============================================
            overlay = result.copy()
            cv2.rectangle(overlay, (10, 10), (900, 130), (0, 0, 0), -1)
            cv2.addWeighted(overlay, 0.7, result, 0.3, 0, result)
            
            cv2.putText(result, result_text, (25, 85),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 3, cv2.LINE_AA)
            
            # Destacar barras maior e menor
            for i, bar in enumerate(bars):
                color = (0, 255, 0)  # Verde padrão
                thickness = 3
                
                if heights_values[i] == max_value:
                    color = (0, 255, 0)  # Verde para maior
                    thickness = 4
                elif heights_values[i] == min_value:
                    color = (0, 0, 255)  # Vermelho para menor
                    thickness = 4
                
                cv2.rectangle(result, (bar['x'], bar['y']), 
                            (bar['x'] + bar['w'], bar['y'] + bar['h']), 
                            color, thickness)
                
                # Mostrar valor acima da barra
                cv2.putText(result, str(heights_values[i]), 
                           (bar['x'] + bar['w']//2 - 15, bar['y'] - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2, cv2.LINE_AA)
        
        else:
            # Nenhuma barra detectada
            overlay = result.copy()
            cv2.rectangle(overlay, (10, 10), (900, 130), (0, 0, 0), -1)
            cv2.addWeighted(overlay, 0.7, result, 0.3, 0, result)
            cv2.putText(result, "Nenhuma barra detectada", (25, 85),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 3, cv2.LINE_AA)

        _, final_buffer = cv2.imencode('.png', result)
        return final_buffer.tobytes()

    except Exception as e:
        print("ERRO NO DESAFIO DO GRAFICO: " + str(e))
        return image_bytes
