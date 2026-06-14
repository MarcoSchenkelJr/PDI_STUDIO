import cv2
import numpy as np
import math

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
                np.array([100, 70, 50]),
                np.array([130, 255, 255])
            ],
            'Amarelo': [
                np.array([20, 70, 50]),
                np.array([35, 255, 255])
            ]
        }

        total_objects = 0
        summary_lines = []

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

                # Método robusto: aproximar polígono e contar cantos
                approx = cv2.approxPolyDP(contour, 0.04 * perimeter, True)
                corners = len(approx)

                # Quadrado: 4 cantos | Círculo: >6 cantos (aproximação poligonal)
                if corners <= 4:
                    squares += 1
                    label = "Q"
                else:
                    circles += 1
                    label = "C"

                total_objects += 1

                x, y, w, h = cv2.boundingRect(contour)
                cx = x + w // 2
                cy = y + h // 2

                color_bgr = {
                    'Vermelho': (0, 0, 255),
                    'Verde': (0, 180, 0),
                    'Azul': (255, 100, 0),
                    'Amarelo': (0, 230, 230)
                }[color_name]

                cv2.circle(result, (cx, cy), max(w, h) // 2 + 10, color_bgr, 2)
                cv2.putText(result, label, (cx - 8, cy + 5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color_bgr, 2, cv2.LINE_AA)

            if circles > 0 or squares > 0:
                parts = []
                if circles > 0:
                    parts.append(f"{circles} Circ")
                if squares > 0:
                    parts.append(f"{squares} Quad")
                summary_lines.append(f"{color_name}: {', '.join(parts)}")

        # Desenha o resumo na imagem
        cv2.rectangle(result, (10, 10), (350, 40 + len(summary_lines) * 25), (0, 0, 0), -1)
        cv2.putText(result, f"TOTAL: {total_objects} objetos", (20, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)

        for i, line in enumerate(summary_lines):
            cv2.putText(result, line, (20, 60 + i * 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1, cv2.LINE_AA)

        _, final_buffer = cv2.imencode('.png', result)
        return final_buffer.tobytes()

    except Exception as e:
        print(f"ERRO NO DESAFIO DOS OBJETOS: {e}")
        return image_bytes
