import cv2
import numpy as np

def solve_letters(image_bytes: bytes) -> bytes:
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        result = img.copy()

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        # ============================================
        # PASSO 1: THRESHOLD MANUAL (Python Puro)
        # ============================================
        binary = np.zeros((h, w), dtype=np.uint8)
        for y in range(h):
            for x in range(w):
                if gray[y, x] < 128:
                    binary[y, x] = 255

        # ============================================
        # PASSO 2: ENCONTRAR LETRAS POR FLOOD FILL
        # ============================================
        visited = np.zeros((h, w), dtype=bool)
        letters = []

        for y in range(h):
            for x in range(w):
                if binary[y, x] == 255 and not visited[y, x]:
                    min_x, max_x = x, x
                    min_y, max_y = y, y
                    stack = [(x, y)]
                    visited[y, x] = True
                    pixels = []

                    while stack:
                        cx, cy = stack.pop()
                        pixels.append((cx, cy))
                        min_x = min(min_x, cx)
                        max_x = max(max_x, cx)
                        min_y = min(min_y, cy)
                        max_y = max(max_y, cy)

                        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < w and 0 <= ny < h:
                                if binary[ny, nx] == 255 and not visited[ny, nx]:
                                    visited[ny, nx] = True
                                    stack.append((nx, ny))

                    bw = max_x - min_x
                    bh = max_y - min_y
                    if bw > 20 and bh > 20 and len(pixels) > 500:
                        letters.append((min_x, min_y, bw, bh, len(pixels), pixels))

        # ============================================
        # PASSO 3: DETECÇÃO DO A (1 BURACO TRIANGULAR)
        # ============================================
        def find_closed_holes(binary_img, letter_pixels, min_ratio=0.02):
            ys = [p[1] for p in letter_pixels]
            xs = [p[0] for p in letter_pixels]
            min_y, max_y = min(ys), max(ys)
            min_x, max_x = min(xs), max(xs)

            roi_h = max_y - min_y + 1
            roi_w = max_x - min_x + 1
            roi = np.zeros((roi_h, roi_w), dtype=bool)
            for px, py in letter_pixels:
                roi[py - min_y, px - min_x] = True

            external = np.zeros((roi_h, roi_w), dtype=bool)
            stack = [(0, 0)]
            external[0, 0] = True
            while stack:
                cx, cy = stack.pop()
                for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < roi_w and 0 <= ny < roi_h:
                        if not external[ny, nx] and not roi[ny, nx]:
                            external[ny, nx] = True
                            stack.append((nx, ny))

            letter_area = len(letter_pixels)
            min_size = letter_area * min_ratio
            visited_hole = np.zeros((roi_h, roi_w), dtype=bool)
            closed_holes = []

            for py in range(roi_h):
                for px in range(roi_w):
                    if not roi[py, px] and not external[py, px] and not visited_hole[py, px]:
                        hole_pixels = []
                        stack = [(px, py)]
                        visited_hole[py, px] = True
                        while stack:
                            cx, cy = stack.pop()
                            hole_pixels.append((cx, cy))
                            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                                nx, ny = cx + dx, cy + dy
                                if 0 <= nx < roi_w and 0 <= ny < roi_h:
                                    if not visited_hole[ny, nx] and not roi[ny, nx] and not external[ny, nx]:
                                        visited_hole[ny, nx] = True
                                        stack.append((nx, ny))

                        if len(hole_pixels) >= min_size:
                            touches_border = False
                            for hx, hy in hole_pixels:
                                if hx <= 1 or hx >= roi_w - 2 or hy <= 1 or hy >= roi_h - 2:
                                    touches_border = True
                                    break
                            if not touches_border:
                                closed_holes.append(hole_pixels)

            return closed_holes

        # ============================================
        # PASSO 4: CLASSIFICAR CADA LETRA
        # ============================================
        detected_letters = set()
        letter_positions = []

        for x, y, bw, bh, area, pixels in letters:
            closed_holes = find_closed_holes(binary, pixels)
            num_holes = len(closed_holes)

            letter = '?'

            # ==========================================
            # DETECÇÃO DO M: MUITO LARGO + MUITO PREENCHIDO
            # ==========================================
            roi_h_local = bh + 1
            roi_w_local = bw + 1
            roi_local = np.zeros((roi_h_local, roi_w_local), dtype=bool)
            for px, py in pixels:
                roi_local[py - y, px - x] = True

            roi_pixels = len(pixels)
            aspect = bw / bh if bh > 0 else 1
            fill = roi_pixels / (roi_w_local * roi_h_local) if (roi_w_local * roi_h_local) > 0 else 0

            third_w = max(roi_w_local // 3, 1)
            left = sum(1 for px in range(third_w) for py in range(roi_h_local) if roi_local[py, px]) / roi_pixels
            center = sum(1 for px in range(third_w, 2 * third_w) for py in range(roi_h_local) if roi_local[py, px]) / roi_pixels
            right = sum(1 for px in range(2 * third_w, roi_w_local) for py in range(roi_h_local) if roi_local[py, px]) / roi_pixels

            third_h = max(roi_h_local // 3, 1)
            top = sum(1 for py in range(third_h) for px in range(roi_w_local) if roi_local[py, px]) / roi_pixels
            mid = sum(1 for py in range(third_h, 2 * third_h) for px in range(roi_w_local) if roi_local[py, px]) / roi_pixels
            bot = sum(1 for py in range(2 * third_h, roi_h_local) for px in range(roi_w_local) if roi_local[py, px]) / roi_pixels

            # M: muito largo (aspect > 1.0) + muito preenchido (fill > 0.6)
            if aspect > 1.0 and fill > 0.6:
                letter = 'M'

            # ==========================================
            # DETECÇÃO DO A: 1 BURACO FECHADO TRIANGULAR
            # ==========================================
            if num_holes == 1:
                biggest = max(closed_holes, key=len)
                hs = [p[1] for p in biggest]
                ws = [p[0] for p in biggest]
                hole_w = max(ws) - min(ws) + 1
                hole_h = max(hs) - min(hs) + 1
                hole_aspect = hole_w / hole_h if hole_h > 0 else 1

                # A tem buraco triangular (aspect < 0.8)
                if hole_aspect < 0.8:
                    letter = 'A'

            # ==========================================
            # DETECÇÃO DO B: 2 BURACOS FECHADOS
            # ==========================================
            elif num_holes == 2:
                letter = 'B'

            # ==========================================
            # DETECÇÃO DO C E X: 0 BURACOS FECHADOS
            # ==========================================
            elif num_holes == 0:
                roi_h_local = bh + 1
                roi_w_local = bw + 1
                roi_local = np.zeros((roi_h_local, roi_w_local), dtype=bool)
                for px, py in pixels:
                    roi_local[py - y, px - x] = True

                roi_pixels = len(pixels)
                aspect = bw / bh if bh > 0 else 1

                third_w = max(roi_w_local // 3, 1)
                left = sum(1 for px in range(third_w) for py in range(roi_h_local) if roi_local[py, px]) / roi_pixels
                center = sum(1 for px in range(third_w, 2 * third_w) for py in range(roi_h_local) if roi_local[py, px]) / roi_pixels
                right = sum(1 for px in range(2 * third_w, roi_w_local) for py in range(roi_h_local) if roi_local[py, px]) / roi_pixels

                third_h = max(roi_h_local // 3, 1)
                top = sum(1 for py in range(third_h) for px in range(roi_w_local) if roi_local[py, px]) / roi_pixels
                bot = sum(1 for py in range(2 * third_h, roi_h_local) for px in range(roi_w_local) if roi_local[py, px]) / roi_pixels

                # C: forma circular + abertura à direita
                if 0.7 < aspect < 1.3 and left > right * 1.3:
                    letter = 'C'
                # Y: centro MUITO denso (center > 0.5) + top > bot (mais largo em cima)
                if 0.7 < aspect < 1.3 and center > 0.5 and top > bot:
                    letter = 'Y'
                # X: centro MUITO denso (densidade alta) + laterais abertas
                elif 0.7 < aspect < 1.3 and center > 0.4 and left < 0.3 and right < 0.3:
                    letter = 'X'
                # Z: centro moderado + laterais com mais pixels
                elif 0.7 < aspect < 1.3 and center > left and center > right:
                    letter = 'Z'

            if letter != '?':
                detected_letters.add(letter)
                letter_positions.append((letter, x, y, bw, bh))

        letters_str = ', '.join(sorted(detected_letters)) if detected_letters else 'Nenhuma letra detectada'

        overlay = result.copy()
        cv2.rectangle(overlay, (10, 10), (900, 130), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, result, 0.3, 0, result)

        cv2.putText(result, "LETRAS: " + letters_str, (25, 85),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.8, (255, 255, 255), 4, cv2.LINE_AA)

        for letter, x, y, w, h in letter_positions:
            cv2.rectangle(result, (x, y), (x + w, y + h), (0, 255, 0), 3)
            cv2.putText(result, letter, (x, y - 15),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 200, 0), 3, cv2.LINE_AA)

        _, final_buffer = cv2.imencode('.png', result)
        return final_buffer.tobytes()

    except Exception as e:
        print("ERRO: " + str(e))
        return image_bytes
