import json
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

# Importações limpas (Apenas o que temos certeza que existe!)
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
    return {"message": "Motor do PDI Studio rodando com sucesso!"}

@app.post("/api/process/pipeline")
async def process_pipeline_route(file: UploadFile = File(...), layers: str = Form(...)):
    current_bytes = await file.read()
    layers_data = json.loads(layers)
    
    print(f"\n--- INICIANDO PROCESSAMENTO DE {len(layers_data)} CAMADA(S) ---")
    
    errors = []
    
    for layer_data in layers_data:
        tool_id = layer_data.get("toolId")
        p = layer_data.get("params", {})
        
        print(f"⚙️ Aplicando: {tool_id}")
        
        try:
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
            elif tool_id == "thinning":
                current_bytes = apply_thinning(current_bytes, p.get("method", "steinfeld"))
            elif tool_id == "clock":
                current_bytes = solve_clock(current_bytes)
            elif tool_id == "objects":
                current_bytes = solve_objects(current_bytes)
            elif tool_id == "letters":
                current_bytes = solve_letters(current_bytes)
            elif tool_id == "plates":
                current_bytes = solve_plates(current_bytes)
            elif tool_id == "charts":
                current_bytes = solve_charts(current_bytes)
            elif tool_id == "lowpass":
                current_bytes = apply_lowpass(current_bytes, p.get("kernel_size", 3))
            elif tool_id == "highpass":
                current_bytes = apply_highpass(current_bytes)
            elif tool_id == "mirror-h":
                current_bytes = apply_mirror(current_bytes, 1)
            elif tool_id == "mirror-v":
                current_bytes = apply_mirror(current_bytes, 0)
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