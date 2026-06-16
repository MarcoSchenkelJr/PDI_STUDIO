import cv2
import numpy as np

def solve_objects(image_bytes: bytes) -> bytes:
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        result = img.copy()

        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # Definição dos intervalos de cor em HSV
        color_ranges = {
            'Vermelho': [
                np.array([0, 70, 50]),
                np.array([10, 255, 255]),
                np.array([170, 70, 50]),
                np.array([180, 255, 255])
            ],
            'Verde': [
                np.array([35, 70, 50]),
                np.array([85, 255, 255])
            ],
            'Azul': [
                np.array([105, 100, 50]),
                np.array([125, 255, 255])
            ],
            'Amarelo': [
                np.array([20, 70, 50]),
                np.array([35, 255, 255])
            ]
        }

        total_objects = 0
        summary_lines = []
        all_objects = []  # (x, y, w, h, color_name)

        for color_name, ranges in color_ranges.items():
            mask = np.zeros(hsv.shape[:2], dtype=np.uint8)

            if len(ranges) == 4:
                mask1 = cv2.inRange(hsv, ranges[0], ranges[1])
                mask2 = cv2.inRange(hsv, ranges[2], ranges[3])
                mask = cv2.bitwise_or(mask1, mask2)
            else:
                mask = cv2.inRange(hsv, ranges[0], ranges[1])

            kernel = np.ones((5, 5), np.uint8)
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            circles = 0
            squares = 0

            for contour in contours:
                area = cv2.contourArea(contour)
                if area < 500:
                    continue

                perimeter = cv2.arcLength(contour, True)
                if perimeter == 0:
                    continue

                # Ignorar contornos muito alongados (artefato de sobreposição)
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = max(w, h) / min(w, h) if min(w, h) > 0 else 1
                if aspect_ratio > 2.0:
                    continue

                approx = cv2.approxPolyDP(contour, 0.04 * perimeter, True)
                corners = len(approx)

                # Quadrado: até 4 cantos | Círculo: mais de 4 cantos
                if corners <= 4:
                    squares += 1
                    label = "Q"
                else:
                    circles += 1
                    label = "C"

                total_objects += 1

                x, y, w, h = cv2.boundingRect(contour)
                all_objects.append((x, y, w, h, color_name))

                cx = x + w // 2
                cy = y + h // 2

                color_bgr = {
                    'Vermelho': (0, 0, 255),
                    'Verde': (0, 180, 0),
                    'Azul': (255, 100, 0),
                    'Amarelo': (0, 230, 230)
                }[color_name]

                cv2.circle(result, (cx, cy), max(w, h) // 2 + 10, color_bgr, 4)
                cv2.putText(result, label, (cx - 12, cy + 9),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.4, (0, 0, 0), 4, cv2.LINE_AA)

            if circles > 0 or squares > 0:
                parts = []
                if circles > 0:
                    parts.append(f"{circles} Circ")
                if squares > 0:
                    parts.append(f"{squares} Quad")
                summary_lines.append(f"{color_name}: {', '.join(parts)}")

        # Detectar sobreposição entre cores diferentes
        overlap_warning = False
        for i in range(len(all_objects)):
            x1, y1, w1, h1, c1 = all_objects[i]
            for j in range(i + 1, len(all_objects)):
                x2, y2, w2, h2, c2 = all_objects[j]
                if c1 == c2:
                    continue
                # Verificar interseção dos bounding boxes
                overlap_x = max(0, min(x1 + w1, x2 + w2) - max(x1, x2))
                overlap_y = max(0, min(y1 + h1, y2 + h2) - max(y1, y2))
                if overlap_x > 0 and overlap_y > 0:
                    overlap_area = overlap_x * overlap_y
                    min_area = min(w1 * h1, w2 * h2)
                    if overlap_area > min_area * 0.3:
                        overlap_warning = True
                        break
            if overlap_warning:
                break

        # Calcular altura do painel
        panel_lines = len(summary_lines) + 1
        panel_height = 90 + panel_lines * 55
        if overlap_warning:
            panel_height += 110  # 2 linhas de aviso

        # Desenha o resumo na imagem com transparência
        overlay = result.copy()
        cv2.rectangle(overlay, (10, 10), (600, panel_height), (0, 0, 0), -1)
        alpha = 0.7  # 70% opaco (30% transparente)
        cv2.addWeighted(overlay, alpha, result, 1 - alpha, 0, result)

        cv2.putText(result, f"TOTAL: {total_objects} objetos", (25, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.6, (255, 255, 255), 4, cv2.LINE_AA)

        for i, line in enumerate(summary_lines):
            cv2.putText(result, line, (25, 115 + i * 55),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (200, 200, 200), 3, cv2.LINE_AA)

        if overlap_warning:
            warning_y = 115 + len(summary_lines) * 55 + 40
            cv2.putText(result, "AVISO: Formas sobrepostas detectadas!", (25, warning_y),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 180, 255), 3, cv2.LINE_AA)
            cv2.putText(result, "A precisao da analise pode ser afetada.", (25, warning_y + 45),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 140, 200), 3, cv2.LINE_AA)

        _, final_buffer = cv2.imencode('.png', result)
        return final_buffer.tobytes()

    except Exception as e:
        print(f"ERRO NO DESAFIO DOS OBJETOS: {e}")
        return image_bytes
