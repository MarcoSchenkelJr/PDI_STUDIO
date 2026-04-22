import { useState, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Info, Upload, Download, LogOut, Globe, Settings } from 'lucide-react';

const ALGORITHM_SOURCES: Record<string, string> = {
  'threshold': `def apply_threshold_pure(image_matrix: np.ndarray, threshold_value: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - LIMIARIZAÇÃO (THRESHOLD)]
    A limiarização é um processo de segmentação de imagem que separa os objetos de interesse 
    do fundo com base nas características de intensidade dos pixels. 
    A operação binariza a imagem transformando-a em tons de Preto (0) e Branco (255).
    
    [TRECHO DO MATERIAL DIDÁTICO: Processamento_De_Imagens=Metodos_E_Analises.pdf]
    "Mudando o seu brilho e detectando bordas a partir do contraste analítico, o threshold mapeia:
    Matematicamente, para cada pixel f(x, y), é gerado um pixel de saída g(x, y):
        g(x, y) = 255 se f(x, y) > Limiar (T)
        g(x, y) = 0   se f(x, y) <= Limiar (T)"
    """
    rows, cols = image_matrix.shape
    out_matrix = np.zeros((rows, cols), dtype=np.uint8)
    
    for y in range(rows):
        for x in range(cols):
            intensity = image_matrix[y, x]
            if intensity > threshold_value:
                out_matrix[y, x] = 255
            else:
                out_matrix[y, x] = 0
                
    return out_matrix`,

  'brightness-contrast': `def apply_brightness_contrast_pure(image_matrix: np.ndarray, brightness: int, contrast: float) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - OPERAÇÕES PONTUAIS DE BRILHO E CONTRASTE]
    As operações atuam pixel a pixel de forma linear. 

    [TRECHO DO MATERIAL DIDÁTICO: Grayscale_Brilho_Contraste.pdf]
    "Grandes variações de iluminação podem causar baixo contraste em regiões...
    O ajuste de brilho e contraste é feito através da Equação da Transformação Linear Rápida:
        D(x,y) = C * f(x,y) + B
    Onde D(x,y) é a Imagem destino, f(x,y) a imagem origem, C é o Contraste e B é o Brilho.
    (Se C = 1 não aplica Contraste, Se B = 0 não aplica Brilho)"
    """
    rows, cols, channels = image_matrix.shape
    out_matrix = np.zeros_like(image_matrix)
    
    for y in range(rows):
        for x in range(cols):
            for c in range(channels):
                val = (image_matrix[y, x, c] * contrast) + brightness
                if val > 255: val = 255
                elif val < 0: val = 0
                out_matrix[y, x, c] = int(val)
                
    return out_matrix`,

  'grayscale': `def apply_grayscale_pure(image_bgr: np.ndarray) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - CONVERSÃO PARA NÍVEIS DE CINZA]
    A conversão de um espaço (BGR/RGB) mapeia os sub-comprimentos da luz.

    [TRECHO DO MATERIAL DIDÁTICO: Grayscale_Brilho_Contraste.pdf]
    "Transformação Grayscale: Útil para etapas posteriores de processamento, pois o 
    trabalho de análise é feito em relação a um só canal de cor uniforme.
    A aproximação das frequências ópticas respeita a fisiologia do olho humano:
        Y = (Cor R * 0,299 + Cor G * 0,587 + Cor B * 0,114)
    Isso substitui o canal triplo por luz absoluta."
    """
    rows, cols, channels = image_bgr.shape
    out_matrix = np.zeros((rows, cols), dtype=np.uint8)
    
    for y in range(rows):
        for x in range(cols):
            b = image_bgr[y, x, 0]
            g = image_bgr[y, x, 1]
            r = image_bgr[y, x, 2]
            
            luminance = (0.299 * r) + (0.587 * g) + (0.114 * b)
            out_matrix[y, x] = int(luminance)
            
    return out_matrix`,

  'mean-filter': `def apply_mean_filter_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - FILTRO ESPACIAL PASSA-BAIXA (MÉDIA)]
    O filtro de média atua como um suavizador básico, atenuando altas frequências espaciais.

    [TRECHO DO MATERIAL DIDÁTICO: 2_Passa_Baixa.pptx]
    "O filtro da média atua suavizando as discrepâncias locais espaciais de pixel simulando óptica fora de foco. 
    Para um kernel 3x3, a matriz de convolução é expressa por pesos constantes:
        h = 1/9 * [1 1 1; 1 1 1; 1 1 1]
    Cada pixel toma o valor da média aritmética de sua vizinhança."
    """
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    offset = kernel_size // 2
    area = kernel_size * kernel_size
    
    for y in range(offset, rows - offset):
        for x in range(offset, cols - offset):
            soma_b, soma_g, soma_r = 0, 0, 0
            
            for ky in range(-offset, offset + 1):
                for kx in range(-offset, offset + 1):
                    b = image_matrix[y + ky, x + kx][0]
                    g = image_matrix[y + ky, x + kx][1]
                    r = image_matrix[y + ky, x + kx][2]
                    soma_b += b
                    soma_g += g
                    soma_r += r
                    
            out_matrix[y, x] = [soma_b // area, soma_g // area, soma_r // area]
            
    return out_matrix`,

  'median-filter': `def apply_median_filter_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - FILTRO NÃO-LINEAR DE ORDENAÇÃO (MEDIANA)]
    Diferentemente de matrizes lineares, a Mediana trabalha com ordenação de vizinhança topológica.

    [TRECHO DO MATERIAL DIDÁTICO: Transformações_Geométricas.pdf]
    "Operações Locais: Um pixel da imagem resultante depende de uma vizinhança do mesmo
    pixel na imagem original (no entorno de xi, yi).
    Na mediana remove-se componentes de Ruído Sal e Pimenta pela listagem das intensidades no 
    núcleo de amostragem NxN, e adota o percentil perfeito (50%) que fica imune a pixels extremos."
    """
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    offset = kernel_size // 2
    
    for y in range(offset, rows - offset):
        for x in range(offset, cols - offset):
            vizinhos_b = []
            vizinhos_g = []
            vizinhos_r = []
            
            for ky in range(-offset, offset + 1):
                for kx in range(-offset, offset + 1):
                    b = image_matrix[y + ky, x + kx][0]
                    g = image_matrix[y + ky, x + kx][1]
                    r = image_matrix[y + ky, x + kx][2]
                    vizinhos_b.append(b)
                    vizinhos_g.append(g)
                    vizinhos_r.append(r)
            
            vizinhos_b.sort()
            vizinhos_g.sort()
            vizinhos_r.sort()
            meio = len(vizinhos_b) // 2
            
            out_matrix[y, x] = [vizinhos_b[meio], vizinhos_g[meio], vizinhos_r[meio]]
            
    return out_matrix`,

  'gaussian-filter': `def apply_gaussian_filter_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - FILTRO GAUSSIANO]
    A suavização limita a perturbação baseada nas curvas normais para minimizar ringing artifacts.

    [TRECHO DO MATERIAL DIDÁTICO: 2_Passa_Baixa.pptx]
    "Aproximação no domínio espacial por núcleos Gaussianos atenuadores de frequências (Ruído Aditivo).
    A Equação de Gauss Invariante modela que os pesos tornam-se gravitacionais nos raios estritos:
        G(x,y) = (1 / (2*π*σ^2)) * e^(-(x^2 + y^2) / (2*σ^2))
    Gerando desfoque harmonioso com pesos assimétricos."
    """
    import math
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    offset = kernel_size // 2
    sigma = kernel_size / 6.0 
    
    kernel = np.zeros((kernel_size, kernel_size), dtype=np.float32)
    soma_pesos = 0.0
    for ky in range(-offset, offset + 1):
        for kx in range(-offset, offset + 1):
            peso = (1.0 / (2.0 * math.pi * (sigma**2))) * math.exp(-(kx**2 + ky**2) / (2 * (sigma**2)))
            kernel[ky + offset, kx + offset] = peso
            soma_pesos += peso
            
    kernel /= soma_pesos

    for y in range(offset, rows - offset):
        for x in range(offset, cols - offset):
            b_val, g_val, r_val = 0.0, 0.0, 0.0
            
            for ky in range(-offset, offset + 1):
                for kx in range(-offset, offset + 1):
                    peso = kernel[ky + offset, kx + offset]
                    b = float(image_matrix[y + ky, x + kx][0])
                    g = float(image_matrix[y + ky, x + kx][1])
                    r = float(image_matrix[y + ky, x + kx][2])
                    
                    b_val += b * peso
                    g_val += g * peso
                    r_val += r * peso
                    
            out_matrix[y, x] = [int(b_val), int(g_val), int(r_val)]
            
    return out_matrix`,

  'lowpass': `def apply_lowpass_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - FILTRO PASSA-BAIXA]
    Operações passa-baixa atenuam discrepâncias de curto alcance simulando óptica fora de foco.

    [TRECHO DO MATERIAL DIDÁTICO: 2_Passa_Baixa.pptx]
    "O filtro da média atua suavizando as discrepâncias locais espaciais de pixel simulando óptica fora de foco. 
    Para um kernel 3x3, a matriz de convolução é expressa da forma:
        h = 1/9 * [1 1 1; 1 1 1; 1 1 1]
    Isso absorve ruídos sem comprometer a estrutura base, pois todos os pontos participam com pesos equivalentes."
    """
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    offset = kernel_size // 2
    
    for y in range(offset, rows - offset):
        for x in range(offset, cols - offset):
            s_b, s_g, s_r = 0, 0, 0
            for ky in range(-offset, offset + 1):
                for kx in range(-offset, offset + 1):
                    b = image_matrix[y + ky, x + kx][0]
                    g = image_matrix[y + ky, x + kx][1]
                    r = image_matrix[y + ky, x + kx][2]
                    s_b += b; s_g += g; s_r += r
                    
            area = kernel_size * kernel_size
            out_matrix[y, x] = [s_b // area, s_g // area, s_r // area]
            
    return out_matrix`,

  'highpass': `def apply_highpass_pure(image_matrix_gray: np.ndarray) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - FILTRO PASSA-ALTA / DETECÇÃO DE BORDAS COM SOBEL]
    Extratores de alta-frequência acentuam limites agudos ou cristas topológicas (arestas vetoriais).

    [TRECHO DO MATERIAL DIDÁTICO: 1_Passa_Alta.pptx]
    "O método mais comum de diferenciação é o gradiente. Os pesos são distribuídos de forma
    assimétrica em torno de um eixo hipotético. A Matriz Bidimensional de Sobel executa as contas:
    Máscara Gx:                       Máscara Gy:
        [-1  0  1]                          [-1 -2 -1]
        [-2  0  2]                          [ 0  0  0]
        [-1  0  1]                          [ 1  2  1]
    
    A intensidade da aresta final obedece ao vetor euclidiano extraindo a Magnitude Ortogonal absoluta:
        Magnitude = √(Gx^2 + Gy^2)"
    """
    import math
    rows, cols = image_matrix_gray.shape
    out_matrix = np.zeros((rows, cols), dtype=np.uint8)
    
    Gx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])
    Gy = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]])
    
    for y in range(1, rows - 1):
        for x in range(1, cols - 1):
            soma_x = 0.0
            soma_y = 0.0
            
            for ky in range(-1, 2):
                for kx in range(-1, 2):
                    pixel = float(image_matrix_gray[y + ky, x + kx])
                    soma_x += pixel * Gx[ky + 1, kx + 1]
                    soma_y += pixel * Gy[ky + 1, kx + 1]
                    
            magnitude = math.sqrt((soma_x * soma_x) + (soma_y * soma_y))
            if magnitude > 255: magnitude = 255
            if magnitude < 0: magnitude = 0
            
            out_matrix[y, x] = int(magnitude)
            
    return out_matrix`,

  'translation': `def apply_translation_pure(image_matrix: np.ndarray, x_offset: int, y_offset: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - TRANSFORMAÇÃO GEOMÉTRICA DE TRANSLAÇÃO]
    Modifica posições de pixels varrendo e relocalizando posições Euclidianas.

    [TRECHO DO MATERIAL DIDÁTICO: 9_Sistema_de_Processamento_Digital_de_Imagens.txt]
    "Translação Espacial: O processo de transladar um objeto consiste em deslocar ou somar a
    cada um dos pixels da imagem um determinado valor fixo, expresso pela matriz 3x3 Afim:
        [ x' ]     [ 1  0  tx ]   [ x ]
        [ y' ]  =  [ 0  1  ty ] * [ y ]
        [ 1  ]     [ 0  0   1 ]   [ 1 ]
    Onde tx e ty definem o deslocamento da imagem para o plano destino."
    """
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    
    for y in range(rows):
        for x in range(cols):
            novo_x = x + x_offset
            novo_y = y + y_offset
            
            if 0 <= novo_x < cols and 0 <= novo_y < rows:
                out_matrix[novo_y, novo_x] = image_matrix[y, x]
                
    return out_matrix`,

  'rotation': `def apply_rotation_pure(image_matrix: np.ndarray, angle_degrees: float) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - TRANSFORMAÇÃO GEOMÉTRICA DE ROTAÇÃO]
    Um mapa Euleriano projetivo transacionando funções senoidais interconectadas a um pivô.

    [TRECHO DO MATERIAL DIDÁTICO: P_D_I_Transformações_Geométricas.pdf]
    "Todas as transformações geométricas são resolvidas utilizando multiplicação de matrizes.
    Para rotacionar o ponto originário no vértice central, as operações bidimensionais adotam a estrutura:
        [ x' ]     [ cos(θ)  -sin(θ) ]   [ x - xp ]
        [ y' ]  =  [ sin(θ)   cos(θ) ] * [ y - yp ]  + deslocamento extra
    A interpolação Backward (Novo para Antigo) evita pixels espúrios aliasing da grade."
    """
    import math
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    
    center_y, center_x = rows // 2, cols // 2
    theta = math.radians(angle_degrees)
    
    for y in range(rows):
        for x in range(cols):
            Y_c = y - center_y
            X_c = x - center_x
            
            old_x = int((X_c * math.cos(theta)) + (Y_c * math.sin(theta))) + center_x
            old_y = int(-(X_c * math.sin(theta)) + (Y_c * math.cos(theta))) + center_y
            
            if 0 <= old_x < cols and 0 <= old_y < rows:
                out_matrix[y, x] = image_matrix[old_y, old_x]
                
    return out_matrix`,

  'scale': `def apply_scale_pure(image_matrix: np.ndarray, scale_factor: float) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - TRANSFORMAÇÃO DE ESCALONAMENTO E INTERPOLAÇÃO]
    O fator numérico altera densidade de pixels original na proporção simétrica α.

    [TRECHO DO MATERIAL DIDÁTICO: P_D_I_Transformações_Geométricas.pdf]
    "Escala: É a alteração do tamanho da imagem, deixando-a maior ou menor.
    O desenho no destino altera as distâncias através de remapeamento linear da matriz (fx, fy).
    Para interpolar os abismos nos endereços alocados internamente no frame,
    o algoritmo adota Interpolação Vizinho-Mais-Próximo resolvendo a captura de arranjos."
    """
    rows, cols = image_matrix.shape[:2]
    channels = image_matrix.shape[2] if len(image_matrix.shape) > 2 else 1
    new_rows = int(rows * scale_factor)
    new_cols = int(cols * scale_factor)
    
    if channels > 1:
        out_matrix = np.zeros((new_rows, new_cols, channels), dtype=np.uint8)
    else:
        out_matrix = np.zeros((new_rows, new_cols), dtype=np.uint8)
    
    for y in range(new_rows):
        for x in range(new_cols):
            old_x = int(x / scale_factor)
            old_y = int(y / scale_factor)
            
            if old_x >= cols: old_x = cols - 1
            if old_y >= rows: old_y = rows - 1
            
            out_matrix[y, x] = image_matrix[old_y, old_x]
            
    return out_matrix`,

  'mirror': `def apply_mirror_pure(image_matrix: np.ndarray, flip_code: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - ESPELHAMENTO DE IMAGENS]
    Também classificado como operação geométrica Reflexiva, rearranjando colunas ou linhas opostas.

    [TRECHO DO MATERIAL DIDÁTICO: Transformações_Geométricas.pdf]
    "O mapeamento direto determinístico preserva invariavelmente os agrupamentos luminosos, 
    onde rebatemos o reflexo pela troca estrita da variável escalar de localização:
    - Espelho Horizontal (1): Resulta na aplicação de I_out(x, y) = I_in(Largura - x, y)
    - Espelho Vertical (0): Resulta na manipulação de I_out(x, y) = I_in(x, Altura - y)"
    """
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    
    for y in range(rows):
        for x in range(cols):
            novo_y = y
            novo_x = x
            
            if flip_code == 1:
                novo_x = (cols - 1) - x
            elif flip_code == 0:
                novo_y = (rows - 1) - y
            elif flip_code == -1:
                novo_x = (cols - 1) - x
                novo_y = (rows - 1) - y
                
            out_matrix[novo_y, novo_x] = image_matrix[y, x]
            
    return out_matrix`,

  'dilate': `def apply_dilation_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - MORFOLOGIA MATEMÁTICA: DILATAÇÃO]
    Tópicos não-lineares estruturais regidos pela união topológica (X ⊕ S).

    [TRECHO DO MATERIAL DIDÁTICO: 7_Morfologia_Matemática.docx]
    "O Elemento Estruturante é comparado à vizinhança a partir de sua origem na matriz focal. 
    Na dilatação, se o pixel referenciado pela vizinhança na operação (como o pixel central do 
    elemento constitutivo) coincidir com a borda de proeminência, expande-se o objeto pelo 
    MÁXIMO local, engordando formas organicamente e costurando pequenas falhas entre fendas escuras."
    """
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    offset = kernel_size // 2
    
    for y in range(offset, rows - offset):
        for x in range(offset, cols - offset):
            max_b, max_g, max_r = 0, 0, 0
            
            for ky in range(-offset, offset + 1):
                for kx in range(-offset, offset + 1):
                    b = image_matrix[y + ky, x + kx][0]
                    g = image_matrix[y + ky, x + kx][1]
                    r = image_matrix[y + ky, x + kx][2]
                    
                    if b > max_b: max_b = b
                    if g > max_g: max_g = g
                    if r > max_r: max_r = r
                    
            out_matrix[y, x] = [max_b, max_g, max_r]
            
    return out_matrix`,

  'erode': `def apply_erosion_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - MORFOLOGIA MATEMÁTICA: EROSÃO]
    Contraparte da dilatação baseada na intersecção em Mínimos (X ⊖ S).

    [TRECHO DO MATERIAL DIDÁTICO: 7_Morfologia_Matemática.docx]
    "Diferente do caso da vizinhança positiva, na Erosão, usamos o Elemento Estruturante 
    retirando áreas na fronteira pela lógica de que, se o pixel não englobar totalmente
    o S na vizinhança de área NxN, substitui-se o ponto central pelo MÍNIMO contido.
    Isso serve eficientemente para diminuir, arrancar e esfoliar artefatos ruidosos."
    """
    rows, cols = image_matrix.shape[:2]
    out_matrix = np.zeros_like(image_matrix)
    offset = kernel_size // 2
    
    for y in range(offset, rows - offset):
        for x in range(offset, cols - offset):
            min_b, min_g, min_r = 255, 255, 255
            
            for ky in range(-offset, offset + 1):
                for kx in range(-offset, offset + 1):
                    b = image_matrix[y + ky, x + kx][0]
                    g = image_matrix[y + ky, x + kx][1]
                    r = image_matrix[y + ky, x + kx][2]
                    
                    if b < min_b: min_b = b
                    if g < min_g: min_g = g
                    if r < min_r: min_r = r
                    
            out_matrix[y, x] = [min_b, min_g, min_r]
            
    return out_matrix`,

  'opening': `def apply_opening_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - MORFOLOGIA COMPOSTA: ABERTURA]
    Técnica idempotente com aplicações sequenciais: X ∘ S = (X ⊖ S) ⊕ S.

    [TRECHO DO MATERIAL DIDÁTICO: Morfologia_Matematica.pptx]
    "Morfologia com técnica de Abertura: Primeiro executa as varreduras do carimbo restritivo de 
    Erosão total para limpar estrobos curtos no interior das formas. Após o limpo, projeta 
    dinamicamente à Dilatação. Como resultado ataca ruídos mantendo tamanhos e geometrias raiz."
    """
    import copy
    img_erodida = apply_erosion_pure(image_matrix, kernel_size)
    img_aberta = apply_dilation_pure(img_erodida, kernel_size)
    
    return img_aberta`,

  'closing': `def apply_closing_pure(image_matrix: np.ndarray, kernel_size: int) -> np.ndarray:
    """
    [FUNDAMENTAÇÃO TEÓRICA - MORFOLOGIA COMPOSTA: FECHAMENTO]
    Lógica de lacramento da estrutura exterior: X • S = (X ⊕ S) ⊖ S.

    [TRECHO DO MATERIAL DIDÁTICO: Morfologia_Matematica.pptx]
    "O mecanismo investigativo da morfologia digital na configuração de fechamento aplica
    o espessamento Dilatador unificando pequenas falhas, cobrindo o microvazamento de bordas.
    Em prol não estender o invólucro do modelo central além do tamanho real, 
    a Erosão em refluxo sela os pixels inflados."
    """
    import copy
    img_dilatada = apply_dilation_pure(image_matrix, kernel_size)
    img_fechada = apply_erosion_pure(img_dilatada, kernel_size)
    
    return img_fechada`
};

interface HeaderProps {
  authorName: string;
  activeTool: string;
  originalImageUrl: string | null;
  processedImageUrl: string | null;
  onImageUpload: (file: File) => void;
  onClearImages: () => void;
}

export const Header = ({ authorName, activeTool, originalImageUrl, processedImageUrl, onImageUpload, onClearImages }: HeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
      setMenuOpen(false);
    }
  };

  const handleSaveAcademic = async () => {
    if (!originalImageUrl || !processedImageUrl) {
      alert('Nenhuma imagem processada para salvar.');
      return;
    }

    try {
      const zip = new JSZip();

      // Fetch original image
      const origRes = await fetch(originalImageUrl);
      const origBlob = await origRes.blob();
      zip.file('original_image.png', origBlob);

      // Fetch processed image
      const procRes = await fetch(processedImageUrl);
      const procBlob = await procRes.blob();
      zip.file('processed_image.png', procBlob);

      // Create algoritmo_utilizado.py
      const pythonSource = ALGORITHM_SOURCES[activeTool] || '# Código fonte não encontrado para esta ferramenta.';
      const pythonHeader = "import cv2\nimport numpy as np\n\n# --- Arquivo Exportado pelo PDI Studio ---\n# Ferramenta Utilizada: " + activeTool + "\n\n" + pythonSource + "\n";
      zip.file('algoritmo_utilizado.py', pythonHeader);

      // Generate Zip and save
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, 'pdi_academico.zip');
    } catch (error) {
      console.error('Erro ao salvar o arquivo acadêmico', error);
      alert('Ocorreu um erro ao gerar o arquivo ZIP.');
    } finally {
      setMenuOpen(false);
    }
  };

  return (
    <>
      <header className="h-12 w-full flex-shrink-0 bg-panel border-b border-accent flex items-center justify-between px-4 z-50 shadow-sm">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-highlight rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs" style={{ fontFamily: 'monospace' }}>PDI</span>
            </div>
            <h1 className="text-sm font-bold tracking-widest text-textprimary">STUDIO</h1>
          </div>

          {/* Menus */}
          <div className="relative">
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className={`flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded transition-colors ${menuOpen ? 'bg-accent/50 text-white' : 'text-textsecondary hover:text-white hover:bg-accent/30'}`}
            >
              <span>Arquivo</span>
            </button>
            
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}></div>
                <div className="absolute top-9 left-0 w-48 bg-panel border border-accent rounded-lg shadow-xl z-50 py-1 flex flex-col">
                  
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-3 px-4 py-2.5 text-xs text-textsecondary hover:text-white hover:bg-highlight transition-colors w-full text-left">
                    <Upload size={14} />
                    <span>Abrir...</span>
                  </button>

                  <button onClick={handleSaveAcademic} className="flex items-center space-x-3 px-4 py-2.5 text-xs text-textsecondary hover:text-white hover:bg-highlight transition-colors w-full text-left">
                    <Download size={14} />
                    <span>Salvar Acadêmico</span>
                  </button>

                  <div className="h-px w-full bg-accent my-1"></div>

                  <button onClick={() => { setModalOpen(true); setMenuOpen(false); }} className="flex items-center space-x-3 px-4 py-2.5 text-xs text-textsecondary hover:text-white hover:bg-highlight transition-colors w-full text-left">
                    <Info size={14} />
                    <span>Sobre</span>
                  </button>

                  <div className="h-px w-full bg-accent my-1"></div>

                  <button onClick={() => { onClearImages(); setMenuOpen(false); }} className="flex items-center space-x-3 px-4 py-2.5 text-xs text-textsecondary hover:text-white hover:bg-red-500/80 transition-colors w-full text-left">
                    <LogOut size={14} />
                    <span>Sair</span>
                  </button>
                </div>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          </div>
        </div>

        {/* Autor Placeholder */}
        <div className="text-xs text-textsecondary">
          Autor: <a href="https://github.com/MarcoSchenkelJr" target="_blank" rel="noopener noreferrer" className="font-semibold text-highlight hover:text-blue-400 cursor-pointer transition-colors ml-1">{authorName}</a>
        </div>
      </header>

      {/* Sobre Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>
          <div className="bg-panel border border-accent p-6 rounded-xl shadow-2xl z-10 w-80 flex flex-col items-center space-y-4">
             <div className="w-12 h-12 bg-accent/30 rounded-full flex items-center justify-center text-highlight mb-2">
               <Settings size={24} />
             </div>
             <h2 className="text-lg font-bold text-textprimary">PDI Studio</h2>
             <p className="text-xs text-textsecondary text-center leading-relaxed">
               Projeto desenvolvido para a disciplina de Processamento Digital de Imagens. Permite a aplicação de filtros em tempo real e transformações usando React, TailwindCSS, e OpenCV (FastAPI).
             </p>
             <a href="https://github.com/MarcoSchenkelJr/projeto_pdi.git" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 px-4 py-2 bg-highlight/20 text-highlight hover:bg-highlight hover:text-white rounded-lg transition-colors text-xs font-semibold w-full justify-center mt-2">
               <Globe size={14} />
               <span>Ver no GitHub</span>
             </a>
             <button onClick={() => setModalOpen(false)} className="px-4 py-2 border border-accent text-textsecondary hover:text-white hover:bg-accent rounded-lg transition-colors text-xs font-semibold w-full">
               Fechar
             </button>
          </div>
        </div>
      )}
    </>
  );
};
