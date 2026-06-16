import cv2
import numpy as np

def solve_plates(image_bytes: bytes) -> bytes:
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        result = img.copy()

        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # ============================================
        # PASSO 1: DETECÇÃO DA COR VERMELHA (HSV)
        # ============================================
        # Vermelho no HSV tem dois intervalos
        lower_red1 = np.array([0, 70, 50])
        upper_red1 = np.array([10, 255, 255])
        lower_red2 = np.array([170, 70, 50])
        upper_red2 = np.array([180, 255, 255])

        mask_red1 = cv2.inRange(hsv, lower_red1, upper_red1)
        mask_red2 = cv2.inRange(hsv, lower_red2, upper_red2)
        mask_red = cv2.bitwise_or(mask_red1, mask_red2)

        # Limpeza morfológica
        kernel = np.ones((5, 5), np.uint8)
        mask_red = cv2.morphologyEx(mask_red, cv2.MORPH_CLOSE, kernel)
        mask_red = cv2.morphologyEx(mask_red, cv2.MORPH_OPEN, kernel)

        # ============================================
        # PASSO 2: ENCONTRAR CONTORNOS DAS PLACAS
        # ============================================
        contours, _ = cv2.findContours(mask_red, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        detected_signs = []

        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 1000:  # Ignorar contornos pequenos
                continue

            # Aproximar polígono para contar lados
            perimeter = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.04 * perimeter, True)
            num_corners = len(approx)

            # Calcular circularidade
            circularity = 4 * np.pi * area / (perimeter * perimeter) if perimeter > 0 else 0

            # Bounding box
            x, y, w, h = cv2.boundingRect(contour)
            aspect = w / h if h > 0 else 1

            # ============================================
            # PASSO 3: CLASSIFICAR POR FORMA E CONTEÚDO
            # ============================================
            sign_type = "Desconhecido"

            # Analisar conteúdo interno
            roi = img[y:y+h, x:x+w]
            roi_hsv = hsv[y:y+h, x:x+w]

            # Verificar proporção de vermelho (Pare é preenchido, círculos são ocos)
            red_in_roi = cv2.bitwise_or(
                cv2.inRange(roi_hsv, lower_red1, upper_red1),
                cv2.inRange(roi_hsv, lower_red2, upper_red2)
            )
            red_ratio = cv2.countNonZero(red_in_roi) / (w * h) if (w * h) > 0 else 0

            # Verificar diagonal (linhas vermelhas cruzando)
            diag_pixels = 0
            total_diag = 0
            for i in range(min(w, h)):
                px = int(i * w / min(w, h))
                py = int(i * h / min(w, h))
                if 0 <= px < w and 0 <= py < h:
                    total_diag += 1
                    if red_in_roi[py, px] > 0:
                        diag_pixels += 1
            diag_ratio = diag_pixels / total_diag if total_diag > 0 else 0

            # PARE: muito vermelho (preenchido)
            if red_ratio > 0.5:
                sign_type = "Pare"

            # VELOCIDADE: círculo oco, sem diagonal
            elif diag_ratio < 0.2:
                sign_type = "Velocidade maxima"

            # SENTIDO/PROIBIDO: círculo com diagonal
            else:
                # Analisar conteúdo preto
                gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
                _, binary_roi = cv2.threshold(gray_roi, 100, 255, cv2.THRESH_BINARY_INV)
                
                # Contar picos na distribuição vertical (barras do E vs seta)
                heights = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
                widths = []
                for pct in heights:
                    row = int(h * pct)
                    row_pixels = np.sum(binary_roi[row, :]) / 255
                    widths.append(row_pixels)
                
                # Normalizar
                max_width = max(widths) if max(widths) > 0 else 1
                widths_norm = [ww / max_width for ww in widths]
                
                # Contar picos (locais maiores que vizinhos)
                peaks = 0
                for i in range(1, len(widths_norm) - 1):
                    if widths_norm[i] > widths_norm[i-1] and widths_norm[i] > widths_norm[i+1]:
                        peaks += 1
                
                # E tem 2-3 picos (barras), seta tem 1 pico
                if peaks >= 2:
                    sign_type = "Proibido estacionar"
                else:
                    sign_type = "Sentido obrigatorio"

            if sign_type != "Desconhecido":
                detected_signs.append((sign_type, x, y, w, h))

        # ============================================
        # PASSO 4: RENDERIZAR RESULTADO
        # ============================================
        signs_str = ', '.join([s[0] for s in detected_signs]) if detected_signs else 'Nenhuma placa detectada'

        overlay = result.copy()
        cv2.rectangle(overlay, (10, 10), (900, 130), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, result, 0.3, 0, result)

        cv2.putText(result, "PLACAS: " + signs_str, (25, 85),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.8, (255, 255, 255), 4, cv2.LINE_AA)

        for sign_type, x, y, w, h in detected_signs:
            cv2.rectangle(result, (x, y), (x + w, y + h), (0, 255, 0), 3)
            cv2.putText(result, sign_type, (x, y - 15),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 200, 0), 2, cv2.LINE_AA)

        _, final_buffer = cv2.imencode('.png', result)
        return final_buffer.tobytes()

    except Exception as e:
        print("ERRO NO DESAFIO DAS PLACAS: " + str(e))
        return image_bytes
