"""
PDI Studio — Motor de Processamento Digital de Imagens
=====================================================

Este arquivo contém a API REST (FastAPI) que recebe imagens do frontend,
aplica as operações de PDI encadeadas em pipeline e retorna o resultado.

ARQUITETURA DO PIPELINE:
    A imagem entra como bytes (PNG), passa por cada camada (layer) sequencialmente,
    e sai como bytes (PNG). Cada camada recebe bytes de entrada e devolve bytes de saída.
    
    Fluxo: Input_bytes → [Camada 1] → [Camada 2] → ... → [Camada N] → Output_bytes

MÓDULOS DE PDI:
    - point_operations: Operações pontuais (pixel a pixel)
    - spatial_filters: Filtros espaciais (convolução com kernel)
    - geometric: Transformações geométricas (remapeamento de coordenadas)
    - morphology: Morfologia matemática (elemento estruturante)
    - challenges: Desafios práticos de PDI (relógio, objetos, letras, placas, gráficos)

Nota: Este backend utiliza OpenCV (biblioteca otimizada em C++) para performance
em produção. As implementações didáticas em Python Puro estão disponíveis no
código exportado pelo "Salvar Acadêmico" (ALGORITHM_SOURCES no frontend).
"""

import json
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from services.point_operations import apply_threshold, apply_brightness_contrast, apply_grayscale
from services.spatial_filters import apply_mean_filter, apply_median_filter, apply_gaussian_filter, apply_lowpass, apply_highpass
from services.geometric import apply_translation, apply_rotation, apply_scale, apply_mirror
from services.morphology import apply_dilation, apply_erosion, apply_opening, apply_closing, apply_thinning
from services.challenges.clock import solve_clock
from services.challenges.objects import solve_objects
from services.challenges.letters import solve_letters
from services.challenges.plates import solve_plates
from services.challenges.charts import solve_charts

app = FastAPI(title="PDI Studio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    """Endpoint de health-check. Verifica se a API está operacional."""
    return {"message": "Motor do PDI Studio rodando com sucesso!"}


@app.post("/api/process/pipeline")
async def process_pipeline_route(file: UploadFile = File(...), layers: str = Form(...)):
    """
    Endpoint principal de processamento de imagens.
    
    Recebe uma imagem (bytes PNG) e uma lista JSON de camadas (layers).
    Cada camada contém um toolId (qual operação PDI aplicar) e params
    (parâmetros da operação, como tamanho do kernel ou valor de limiar).
    
    A imagem passa por cada camada sequencialmente — o resultado de uma
    camada é a entrada da próxima. Isso permite encadear operações como:
        Grayscale → Threshold → Erosão → Dilatação
    
    Retorna a imagem resultante como bytes PNG, com header X-Pipeline-Errors
    se alguma camada falhou.
    """
    current_bytes = await file.read()
    layers_data = json.loads(layers)
    
    print(f"\n--- INICIANDO PROCESSAMENTO DE {len(layers_data)} CAMADA(S) ---")
    
    errors = []
    
    for layer_data in layers_data:
        tool_id = layer_data.get("toolId")
        p = layer_data.get("params", {})
        
        print(f"⚙️ Aplicando: {tool_id}")
        
        try:
            # =============================================
            # OPERAÇÕES PONTUAIS (pixel a pixel)
            # =============================================
            if tool_id == "threshold":
                # Limiarização: binariza a imagem com base em um valor de corte T.
                # g(x,y) = 255 se f(x,y) > T, senão g(x,y) = 0
                # Referência: Processamento_De_Imagens=Metodos_E_Analises.pdf
                current_bytes = apply_threshold(current_bytes, p.get("threshold_value", 128))
                
            elif tool_id == "brightness-contrast":
                # Brilho e Contraste: transformação linear D(x,y) = C * f(x,y) + B
                # C = contraste (escalar), B = brilho (constante aditiva)
                # Referência: Grayscale_Brilho_Contraste.pdf
                current_bytes = apply_brightness_contrast(current_bytes, p.get("brightness", 0), p.get("contrast", 1.0))
            
            # =============================================
            # FILTROS ESPACIAIS (convolução com kernel)
            # =============================================
            elif tool_id == "mean-filter":
                # Filtro de Média: suaviza a imagem substituindo cada pixel
                # pela média aritmética dos vizinhos no kernel NxN.
                # h = 1/N² * [[1,1,1],[1,1,1],[1,1,1]] para kernel 3x3
                # Referência: 2_Passa_Baixa.pptx
                current_bytes = apply_mean_filter(current_bytes, p.get("kernel_size", 3))
                
            elif tool_id == "median-filter":
                # Filtro de Mediana: ordena os pixels vizinhos e seleciona
                # o valor central (50º percentil). Excelente para ruído sal-e-pimenta.
                # Referência: Transformações_Geométricas.pdf
                current_bytes = apply_median_filter(current_bytes, p.get("kernel_size", 3))
                
            elif tool_id == "gaussian-filter":
                # Filtro Gaussiano: pesos proporcionais à distribuição normal (Gaussiana).
                # G(x,y) = (1/2πσ²) * e^(-(x²+y²)/2σ²)
                # Referência: 2_Passa_Baixa.pptx
                current_bytes = apply_gaussian_filter(current_bytes, p.get("kernel_size", 3))
            
            elif tool_id == "lowpass":
                # Passa-Baixa: atenua altas frequências (detalhes finos/ruído).
                # Equivalente ao filtro Gaussiano — preserva estrutura base.
                # Referência: 2_Passa_Baixa.pptx
                current_bytes = apply_lowpass(current_bytes, p.get("kernel_size", 3))
            
            elif tool_id == "highpass":
                # Passa-Alta (Sobel): detecta bordas calculando o gradiente da imagem.
                # Gx: [-1,0,1; -2,0,2; -1,0,1]  Gy: [-1,-2,-1; 0,0,0; 1,2,1]
                # Magnitude = √(Gx² + Gy²)
                # Referência: 1_Passa_Alta.pptx
                current_bytes = apply_highpass(current_bytes)
            
            # =============================================
            # TRANSFORMAÇÕES GEOMÉTRICAS (remapeamento)
            # =============================================
            elif tool_id == "translation":
                # Translação: desloca pixels por offsets (tx, ty).
                # Matriz afim: [x'] = [1,0,tx] * [x]
                #               [y']   [0,1,ty]   [y]
                # Referência: 9_Sistema_de_Processamento_Digital_de_Imagens.txt
                current_bytes = apply_translation(current_bytes, p.get("x_offset", 0), p.get("y_offset", 0))
                
            elif tool_id == "rotation":
                # Rotação: gira a imagem ao redor de um pivô central.
                # Matriz: [cos(θ), -sin(θ); sin(θ), cos(θ)]
                # Referência: P_D_I_Transformações_Geométricas.pdf
                current_bytes = apply_rotation(current_bytes, p.get("angle", 0.0))
                
            elif tool_id == "scale":
                # Escala: redimensiona a imagem por um fator.
                # Interpolação Vizinho-Mais-Próximo mapeia coordenadas.
                # Referência: P_D_I_Transformações_Geométricas.pdf
                current_bytes = apply_scale(current_bytes, p.get("scale_factor", 1.0))
                
            elif tool_id == "mirror":
                # Espelhamento: inverte eixo X (horizontal), Y (vertical) ou ambos.
                # I_out(x,y) = I_in(Largura-x, y) para horizontal
                # Referência: Transformações_Geométricas.pdf
                current_bytes = apply_mirror(current_bytes, p.get("flip_code", 1))
            
            # =============================================
            # MORFOLOGIA MATEMÁTICA (elemento estruturante)
            # =============================================
            elif tool_id == "dilate":
                # Dilatação: se QUALQUER pixel do kernel toca branco, o pixel fica branco.
                # Expande objetos, engorda bordas, fecha buracos.
                # Referência: 7_Morfologia_Matemática.docx
                current_bytes = apply_dilation(current_bytes, p.get("kernel_size", 3), p.get("iterations", 1))
                
            elif tool_id == "erode":
                # Erosão: SE TODOS os pixels do kernel são brancos, o pixel fica branco.
                # Contrai objetos, remove ruído, afin bordas.
                # Referência: 7_Morfologia_Matemática.docx
                current_bytes = apply_erosion(current_bytes, p.get("kernel_size", 3), p.get("iterations", 1))
                
            elif tool_id == "opening":
                # Abertura = Erosão + Dilatação: remove ruído branco preservando formas.
                # X o S = (X ⊖ S) ⊕ S
                # Referência: Morfologia_Matematica.pptx
                current_bytes = apply_opening(current_bytes, p.get("kernel_size", 3))
                
            elif tool_id == "closing":
                # Fechamento = Dilatação + Erosão: preenche buracos, costura fendas.
                # X • S = (X ⊕ S) ⊖ S
                # Referência: Morfologia_Matematica.pptx
                current_bytes = apply_closing(current_bytes, p.get("kernel_size", 3))
            
            # =============================================
            # OPERAÇÕES ESPECIAIS
            # =============================================
            elif tool_id == "grayscale":
                # Conversão para tons de cinza: Y = 0.299R + 0.587G + 0.114B
                # Ponderação baseada na sensibilidade fisiológica do olho humano.
                # Referência: Grayscale_Brilho_Contraste.pdf
                current_bytes = apply_grayscale(current_bytes)
                
            elif tool_id == "thinning":
                # Afinamento (Esqueletização): reduz objetos ao esqueleto de 1 pixel.
                # 3 métodos: Steinfeld (erosão iterativa), Zhang-Suen (paralelo),
                # Holt (simplificado). Preserva conectividade e topologia.
                # Referência: Afinamento.pptx, TCC_Algoritmos_Thinning_Suas_Aplicacoes.pdf
                current_bytes = apply_thinning(current_bytes, p.get("method", "steinfeld"))
            
            # =============================================
            # DESAFIOS DE PDI (exercícios práticos)
            # =============================================
            elif tool_id == "clock":
                # Desafio 1: Relógio Analógico
                # Pipeline: binarização → máscara circular → afinamento → atan2
                current_bytes = solve_clock(current_bytes)
                
            elif tool_id == "objects":
                # Desafio 2: Detecção de Objetos Coloridos
                # Pipeline: HSV → máscara por cor → morfologia → contornos → classificação
                current_bytes = solve_objects(current_bytes)
                
            elif tool_id == "letters":
                # Desafio 3: Reconhecimento de Letras
                # Pipeline: binarização → componentes conectados → análise topológica
                current_bytes = solve_letters(current_bytes)
                
            elif tool_id == "plates":
                # Desafio 4: Identificação de Placas de Trânsito
                # Pipeline: HSV → detecção vermelha → morfologia → classificação
                current_bytes = solve_plates(current_bytes)
                
            elif tool_id == "charts":
                # Desafio 5: Análise de Gráfico de Barras
                # Pipeline: HSV → detecção de barras → medição de altura → escalonamento
                current_bytes = solve_charts(current_bytes)
            
            # =============================================
            # ATALHOS DE UI (IDs separados para o frontend)
            # =============================================
            elif tool_id == "mirror-h":
                current_bytes = apply_mirror(current_bytes, 1)   # Espelho horizontal
            elif tool_id == "mirror-v":
                current_bytes = apply_mirror(current_bytes, 0)   # Espelho vertical
            elif tool_id == "scale-up":
                current_bytes = apply_scale(current_bytes, p.get("scale_factor", 1.5))
            elif tool_id == "scale-down":
                current_bytes = apply_scale(current_bytes, p.get("scale_factor", 0.5))
            else:
                msg = f"Filtro '{tool_id}' ignorado (Não mapeado)."
                print(f"⚠️ Aviso: {msg}")
                errors.append(msg)
                
        except Exception as e:
            msg = f"Erro no filtro '{tool_id}': {str(e)}"
            print(f"❌ ERRO CRÍTICO: {msg}")
            errors.append(msg)

    print("✅ Processamento concluído! Devolvendo imagem.\n")
    
    headers = {}
    if errors:
        headers["X-Pipeline-Errors"] = "; ".join(errors)
    
    return Response(content=current_bytes, media_type="image/png", headers=headers)