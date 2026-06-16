import cv2
import numpy as np
import math
from services.morphology import apply_thinning

def solve_clock(image_bytes: bytes) -> bytes:
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # 1. Tons de Cinza e Limiarização Invertida
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)

        h, w = thresh.shape

        # CENTRALIZAÇÃO: DETECÇÃO DINÂMICA DO RELÓGIO
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            (exact_x, exact_y), full_radius = cv2.minEnclosingCircle(largest_contour)
            center = (int(exact_x), int(exact_y))
            mask_radius = int(full_radius * 0.60)
        else:
            center = (w // 2, h // 2)
            full_radius = min(w, h) * 0.45
            mask_radius = int(full_radius * 0.60)

        # 2. Criação da Máscara Circular Interna de Segurança
        mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(mask, center, mask_radius, 255, -1)

        # 3. Isolamento dos ponteiros centralizados
        clock_hands = cv2.bitwise_and(thresh, mask)

        # 4. Afinamento Morfológico
        _, temp_buffer = cv2.imencode('.png', cv2.bitwise_not(clock_hands))
        thinned_bytes = apply_thinning(temp_buffer.tobytes())

        nparr_thin = np.frombuffer(thinned_bytes, np.uint8)
        result_bgr = cv2.imdecode(nparr_thin, cv2.IMREAD_COLOR)

        # Desenha o círculo vermelho circulando o relógio por fora perfeitamente!
        cv2.circle(result_bgr, center, int(full_radius), (0, 0, 255), 2)

        # 5. VARREDURA VIA LAÇOS FOR
        cx, cy = center[0], center[1]
        ponteiros = []

        for y in range(h):
            for x in range(w):
                if result_bgr[y, x, 0] < 50 and result_bgr[y, x, 2] < 50:
                    if ((x - cx)**2 + (y - cy)**2) > 15**2:
                        ponteiros.append((x, y))

        hours_val = 12
        minutes_val = 0

        # 6. SEPARAÇÃO E TRIGONOMETRIA REAL DOS DOIS PONTEIROS
        if len(ponteiros) > 5:
            p1 = max(ponteiros, key=lambda p: (p[0] - cx)**2 + (p[1] - cy)**2)
            a1 = math.atan2(p1[1] - cy, p1[0] - cx)

            p2 = None
            max_d2 = 0
            for p in ponteiros:
                a = math.atan2(p[1] - cy, p[0] - cx)
                diff = abs(a - a1)
                if diff > math.pi:
                    diff = 2 * math.pi - diff
                if diff > math.radians(25):
                    d = (p[0] - cx)**2 + (p[1] - cy)**2
                    if d > max_d2:
                        max_d2 = d
                        p2 = p

            def decolar_unidade_tempo(p_tip, is_hour=False):
                ang = math.degrees(math.atan2(p_tip[1] - cy, p_tip[0] - cx))
                clock_ang = ang + 90
                if clock_ang < 0:
                    clock_ang += 360
                if is_hour:
                    return clock_ang / 30.0
                else:
                    return int(round(clock_ang / 6.0)) % 60

            if p1 and p2:
                minutes_val = decolar_unidade_tempo(p1, is_hour=False)
                exact_hours = decolar_unidade_tempo(p2, is_hour=True)

                # FILTRO DE ROBUSTEZ CONTRA RUÍDO DE TRUNCAMENTO DE HORA
                hours_val = int(exact_hours)
                frac_hour = exact_hours - hours_val

                if minutes_val < 20 and frac_hour > 0.85:
                    hours_val += 1
                elif minutes_val > 40 and frac_hour < 0.15:
                    hours_val -= 1

                if hours_val == 0:
                    hours_val = 12
                elif hours_val > 12:
                    hours_val = hours_val % 12
                    if hours_val == 0: hours_val = 12
            elif p1:
                minutes_val = decolar_unidade_tempo(p1, is_hour=False)

        # =========================================================================
        # QUANTIZAÇÃO MAGNÉTICA DOS MINUTOS (SNAP TO 5)
        # =========================================================================
        resto_minuto = minutes_val % 5
        if resto_minuto == 1:
            minutes_val -= 1
        elif resto_minuto == 4:
            minutes_val = (minutes_val + 1) % 60
        # =========================================================================

                # 7. DESIGN VISUAL
        digital_text = f"HORA LIDA: {hours_val:02d}:{minutes_val:02d}"

        # REFINAMENTO: Calcula a largura exata do texto em pixels
        (text_w, text_h), _ = cv2.getTextSize(digital_text, cv2.FONT_HERSHEY_SIMPLEX, 2, 2)

        # Define a largura da caixinha com base no texto + margens de respiro (padding)
        box_width = text_w + 130  # 20px de margem esquerda + tamanho do texto + 20px de margem direita

        # Desenha o retângulo preto limitado APENAS ao tamanho necessário
        cv2.rectangle(result_bgr, (80, 40), (box_width, 120), (15, 15, 15), -1)

        # Cria a faixa preta sólida no topo para eliminar qualquer inclinação visual torta
        #cv2.rectangle(result_bgr, (30, 30), (w, 120), (15, 15, 15), -1)

        # Renderiza o relógio digital centralizado, em tamanho grande e com suavização anti-aliasing (LINE_AA)
        cv2.putText(result_bgr, digital_text, (100, 100),
                    cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 255, 0), 2, cv2.LINE_AA)

        _, final_buffer = cv2.imencode('.png', result_bgr)
        return final_buffer.tobytes()

    except Exception as e:
        print(f"ERRO NO DESAFIO DO RELÓGIO: {e}")
        return image_bytes
