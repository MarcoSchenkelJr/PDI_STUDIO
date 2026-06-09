import json
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from services.morphology import apply_dilation, apply_erosion, apply_opening, apply_closing
from services.point_operations import apply_threshold, apply_brightness_contrast, apply_grayscale
from services.spatial_filters import apply_mean_filter, apply_median_filter, apply_gaussian_filter, apply_lowpass, apply_highpass



# Importações dos nossos serviços
from services.point_operations import apply_threshold, apply_brightness_contrast
from services.spatial_filters import apply_mean_filter, apply_median_filter, apply_gaussian_filter
from services.geometric import apply_translation, apply_rotation, apply_scale, apply_mirror

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
    return {"message": "Motor do PDI Studio rodando com sucesso!"}

# --- OPERAÇÕES PONTUAIS ---
@app.post("/api/process/threshold")
async def process_threshold(file: UploadFile = File(...), threshold_value: int = Form(...)):
    image_bytes = await file.read()
    processed_bytes = apply_threshold(image_bytes, threshold_value)
    return Response(content=processed_bytes, media_type="image/png")

@app.post("/api/process/brightness-contrast")
async def process_brightness(file: UploadFile = File(...), brightness: int = Form(0), contrast: float = Form(1.0)):
    image_bytes = await file.read()
    processed_bytes = apply_brightness_contrast(image_bytes, brightness, contrast)
    return Response(content=processed_bytes, media_type="image/png")

# --- FILTROS ESPACIAIS ---
@app.post("/api/process/filter/mean")
async def process_mean_filter(file: UploadFile = File(...), kernel_size: int = Form(3)):
    image_bytes = await file.read()
    processed_bytes = apply_mean_filter(image_bytes, kernel_size)
    return Response(content=processed_bytes, media_type="image/png")

@app.post("/api/process/filter/median")
async def process_median_filter(file: UploadFile = File(...), kernel_size: int = Form(3)):
    image_bytes = await file.read()
    processed_bytes = apply_median_filter(image_bytes, kernel_size)
    return Response(content=processed_bytes, media_type="image/png")

@app.post("/api/process/filter/gaussian")
async def process_gaussian_filter(file: UploadFile = File(...), kernel_size: int = Form(3)):
    image_bytes = await file.read()
    processed_bytes = apply_gaussian_filter(image_bytes, kernel_size)
    return Response(content=processed_bytes, media_type="image/png")

# --- TRANSFORMAÇÕES GEOMÉTRICAS ---
@app.post("/api/process/geometric/translate")
async def process_translation(file: UploadFile = File(...), x_offset: int = Form(0), y_offset: int = Form(0)):
    image_bytes = await file.read()
    processed_bytes = apply_translation(image_bytes, x_offset, y_offset)
    return Response(content=processed_bytes, media_type="image/png")

@app.post("/api/process/geometric/rotate")
async def process_rotation(file: UploadFile = File(...), angle: float = Form(0.0)):
    image_bytes = await file.read()
    processed_bytes = apply_rotation(image_bytes, angle)
    return Response(content=processed_bytes, media_type="image/png")

@app.post("/api/process/geometric/scale")
async def process_scale(file: UploadFile = File(...), scale_factor: float = Form(1.0)):
    image_bytes = await file.read()
    processed_bytes = apply_scale(image_bytes, scale_factor)
    return Response(content=processed_bytes, media_type="image/png")

@app.post("/api/process/geometric/mirror")
async def process_mirror(file: UploadFile = File(...), flip_code: int = Form(1)):
    image_bytes = await file.read()
    processed_bytes = apply_mirror(image_bytes, flip_code)
    return Response(content=processed_bytes, media_type="image/png")

# --- MORFOLOGIA MATEMÁTICA ---
@app.post("/api/process/morphology/dilate")
async def process_dilation(file: UploadFile = File(...), kernel_size: int = Form(3), iterations: int = Form(1)):
    image_bytes = await file.read()
    processed_bytes = apply_dilation(image_bytes, kernel_size, iterations)
    return Response(content=processed_bytes, media_type="image/png")

@app.post("/api/process/morphology/erode")
async def process_erosion(file: UploadFile = File(...), kernel_size: int = Form(3), iterations: int = Form(1)):
    image_bytes = await file.read()
    processed_bytes = apply_erosion(image_bytes, kernel_size, iterations)
    return Response(content=processed_bytes, media_type="image/png")

@app.post("/api/process/morphology/open")
async def process_opening(file: UploadFile = File(...), kernel_size: int = Form(3)):
    image_bytes = await file.read()
    processed_bytes = apply_opening(image_bytes, kernel_size)
    return Response(content=processed_bytes, media_type="image/png")

@app.post("/api/process/morphology/close")
async def process_closing(file: UploadFile = File(...), kernel_size: int = Form(3)):
    image_bytes = await file.read()
    processed_bytes = apply_closing(image_bytes, kernel_size)
    return Response(content=processed_bytes, media_type="image/png")

# --- NOVAS FERRAMENTAS BASE ---
@app.post("/api/process/grayscale")
async def process_grayscale(file: UploadFile = File(...)):
    image_bytes = await file.read()
    processed_bytes = apply_grayscale(image_bytes)
    return Response(content=processed_bytes, media_type="image/png")

@app.post("/api/process/filter/lowpass")
async def process_lowpass(file: UploadFile = File(...), kernel_size: int = Form(3)):
    image_bytes = await file.read()
    processed_bytes = apply_lowpass(image_bytes, kernel_size)
    return Response(content=processed_bytes, media_type="image/png")

@app.post("/api/process/filter/highpass")
async def process_highpass(file: UploadFile = File(...)):
    image_bytes = await file.read()
    processed_bytes = apply_highpass(image_bytes)
    return Response(content=processed_bytes, media_type="image/png")



# --- MOTOR DE PIPELINE (V2.0) ---
@app.post("/api/process/pipeline")
async def process_pipeline(file: UploadFile = File(...), layers: str = Form(...)):
    # 1. Lê a imagem original
    current_bytes = await file.read()
    
    # 2. Converte o 'bilhete' (String JSON) em uma lista de dicionários Python
    layers_data = json.loads(layers)
    
    # IMPORTANTE: No React, a camada mais nova entra no topo (índice 0).
    # Para o processamento da imagem, precisamos aplicar da mais velha (base) para a mais nova (topo).
    # Então, nós invertemos a lista
    layers_data.reverse()
    
    # 3. Loop do Motor: Aplica cada filtro na sequência
    for layer in layers_data:
        # Se o "olhinho" da camada estiver fechado no frontend, pula ela
        if not layer.get("visible", True):
            continue
            
        tool_id = layer.get("toolId")
        p = layer.get("params", {})
        
        # Mapeamento do Cérebro
        if tool_id == "threshold":
            current_bytes = apply_threshold(current_bytes, p.get("threshold_value", 128))
        elif tool_id == "brightness-contrast":
            current_bytes = apply_brightness_contrast(current_bytes, p.get("brightness", 0), p.get("contrast", 1.0))
        elif tool_id == "mean-filter":
            current_bytes = apply_mean_filter(current_bytes, p.get("kernel_size", 3))
        elif tool_id == "median-filter":
            current_bytes = apply_median_filter(current_bytes, p.get("kernel_size", 3))
        elif tool_id == "gaussian-filter":
            current_bytes = apply_gaussian_filter(current_bytes, p.get("kernel_size", 3))
        elif tool_id == "translation":
            current_bytes = apply_translation(current_bytes, p.get("x_offset", 0), p.get("y_offset", 0))
        elif tool_id == "rotation":
            current_bytes = apply_rotation(current_bytes, p.get("angle", 0.0))
        elif tool_id == "scale":
            current_bytes = apply_scale(current_bytes, p.get("scale_factor", 1.0))
        elif tool_id == "mirror":
            current_bytes = apply_mirror(current_bytes, p.get("flip_code", 1))
        elif tool_id == "dilate":
            current_bytes = apply_dilation(current_bytes, p.get("kernel_size", 3), p.get("iterations", 1))
        elif tool_id == "erode":
            current_bytes = apply_erosion(current_bytes, p.get("kernel_size", 3), p.get("iterations", 1))
        elif tool_id == "opening":
            current_bytes = apply_opening(current_bytes, p.get("kernel_size", 3))
        elif tool_id == "closing":
            current_bytes = apply_closing(current_bytes, p.get("kernel_size", 3))
        elif tool_id == "grayscale":
            current_bytes = apply_grayscale(current_bytes)
        elif tool_id == "lowpass":
            current_bytes = apply_lowpass(current_bytes, p.get("kernel_size", 3))
        elif tool_id == "highpass":
            current_bytes = apply_highpass(current_bytes)

    # 4. Devolve a imagem final, com todos os efeitos somados!
    return Response(content=current_bytes, media_type="image/png")