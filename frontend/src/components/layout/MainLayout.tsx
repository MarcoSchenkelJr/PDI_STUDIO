import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Inspector, ToolParams } from './Inspector';
import { CanvasArea } from '../workspace/CanvasArea';
import { processThreshold, processBrightnessContrast, processMeanFilter, processMedianFilter, processGaussianFilter, processTranslation, processRotation, processScale, processMirror, processDilation, processErosion, processOpening, processClosing, processGrayscale, processLowpass, processHighpass } from '../../services/api';

// --- 1. NOVA ESTRUTURA DE DADOS (A anatomia de uma camada) ---
export interface Layer {
  id: string;
  toolId: string;
  name: string;
  params: ToolParams;
  visible: boolean;
}

// Valores padrão para quando uma nova ferramenta for clicada
const defaultParams: ToolParams = {
  threshold_value: 128, brightness: 0, contrast: 1.0, kernel_size: 3,
  x_offset: 0, y_offset: 0, angle: 0.0, scale_factor: 1.0, flip_code: 1, iterations: 1,
};

// Dicionário para dar nomes bonitos às camadas no painel
const getToolName = (toolId: string) => {
  const names: Record<string, string> = {
    'threshold': 'Threshold', 'brightness-contrast': 'Brilho/Contraste', 'translation': 'Translação',
    'rotation': 'Rotação', 'scale': 'Escala', 'mirror': 'Espelhamento', 'grayscale': 'Tons de Cinza',
    'mean-filter': 'Filtro Média', 'median-filter': 'Filtro Mediana', 'gaussian-filter': 'Filtro Gauss',
    'dilate': 'Dilatação', 'erode': 'Erosão', 'opening': 'Abertura', 'closing': 'Fechamento',
    'lowpass': 'Passa Baixa', 'highpass': 'Passa Alta'
  };
  return names[toolId] || toolId;
};

export const MainLayout = () => {
  // --- 2. O NOVO CÉREBRO V2.0 (Lista de Camadas) ---
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);

  // Variáveis "Fantasmas" (Elas leem a camada ativa para o Inspector não quebrar)
  const activeLayer = layers.find(l => l.id === activeLayerId);
  const activeTool = activeLayer ? activeLayer.toolId : '';
  const params = activeLayer ? activeLayer.params : defaultParams;

  // Imagens
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const debounceTimerUrl = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- 3. NOVA LÓGICA DE INTERAÇÃO ---

  // Quando mexer no slider, atualiza APENAS os parâmetros da camada selecionada
  const handleParamChange = (paramName: keyof ToolParams, value: number) => {
    if (!activeLayerId) return;

    setLayers(prevLayers =>
      prevLayers.map(layer =>
        layer.id === activeLayerId
          ? { ...layer, params: { ...layer.params, [paramName]: value } }
          : layer
      )
    );
  };

  // Quando clicar na Sidebar, CRIA uma nova camada no topo da pilha!
  const handleToolSelect = (toolId: string) => {
    const newLayer: Layer = {
      id: Date.now().toString(), // Cria um ID único baseado na hora exata
      toolId: toolId,
      name: getToolName(toolId),
      params: { ...defaultParams }, // Injeta os parâmetros zerados
      visible: true,
    };

    setLayers(prev => [newLayer, ...prev]); // Coloca a nova camada em cima das outras
    setActiveLayerId(newLayer.id); // Foca nela para o Inspector mostrar as barrinhas
    setIsInspectorOpen(true);
  };

  const toggleLayerVisibility = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const deleteLayer = (id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    if (activeLayerId === id) setActiveLayerId(null);
  };

  const selectLayer = (id: string) => {
    setActiveLayerId(id);
    setIsInspectorOpen(true);
  };

  const clearAllLayers = () => {
    setLayers([]);
    setActiveLayerId(null);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setOriginalImageUrl(URL.createObjectURL(file));
      setProcessedImageUrl(null);
      setLayers([]); // Limpa as camadas ao carregar foto nova
      setActiveLayerId(null);
    }
  };

  const clearImages = () => {
    setImageFile(null);
    if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
    if (processedImageUrl) URL.revokeObjectURL(processedImageUrl);
    setOriginalImageUrl(null);
    setProcessedImageUrl(null);
  };

  // Motor Principal via DEBOUNCE (Dispara chamadas após 300ms de inatividade)
  useEffect(() => {
    if (!imageFile) return;

    if (activeTool !== 'threshold' && activeTool !== 'brightness-contrast' && !['mean-filter', 'median-filter', 'gaussian-filter', 'translation', 'rotation', 'scale', 'mirror', 'dilate', 'erode', 'opening', 'closing', 'grayscale', 'lowpass', 'highpass'].includes(activeTool)) {
      setProcessedImageUrl(null);
      return;
    }

    const triggerApi = async () => {
      setIsProcessing(true);
      try {
        let newUrl = null;
        if (activeTool === 'threshold') {
          newUrl = await processThreshold(imageFile, params.threshold_value);
        } else if (activeTool === 'brightness-contrast') {
          newUrl = await processBrightnessContrast(imageFile, params.brightness, params.contrast);
        } else if (activeTool === 'mean-filter') {
          newUrl = await processMeanFilter(imageFile, params.kernel_size);
        } else if (activeTool === 'median-filter') {
          newUrl = await processMedianFilter(imageFile, params.kernel_size);
        } else if (activeTool === 'gaussian-filter') {
          newUrl = await processGaussianFilter(imageFile, params.kernel_size);
        } else if (activeTool === 'translation') {
          newUrl = await processTranslation(imageFile, params.x_offset, params.y_offset);
        } else if (activeTool === 'rotation') {
          newUrl = await processRotation(imageFile, params.angle);
        } else if (activeTool === 'scale') {
          newUrl = await processScale(imageFile, params.scale_factor);
        } else if (activeTool === 'mirror') {
          newUrl = await processMirror(imageFile, params.flip_code);
        } else if (activeTool === 'dilate') {
          newUrl = await processDilation(imageFile, params.kernel_size, params.iterations);
        } else if (activeTool === 'erode') {
          newUrl = await processErosion(imageFile, params.kernel_size, params.iterations);
        } else if (activeTool === 'opening') {
          newUrl = await processOpening(imageFile, params.kernel_size);
        } else if (activeTool === 'closing') {
          newUrl = await processClosing(imageFile, params.kernel_size);
        } else if (activeTool === 'grayscale') {
          newUrl = await processGrayscale(imageFile);
        } else if (activeTool === 'lowpass') {
          newUrl = await processLowpass(imageFile, params.kernel_size);
        } else if (activeTool === 'highpass') {
          newUrl = await processHighpass(imageFile);
        }

        if (newUrl) {
          setProcessedImageUrl(prev => {
            if (prev) URL.revokeObjectURL(prev); // clean memory before replacing state
            return newUrl;
          });
        }
      } catch (error) {
        console.error('Erro na API:', error);
      } finally {
        setIsProcessing(false);
      }
    };

    if (debounceTimerUrl.current) clearTimeout(debounceTimerUrl.current);

    debounceTimerUrl.current = setTimeout(() => {
      triggerApi();
    }, 200);

    return () => {
      if (debounceTimerUrl.current) clearTimeout(debounceTimerUrl.current);
    };
  }, [imageFile, activeTool, params]); // dependências reativas

  return (
    <div className="flex flex-col w-screen h-screen bg-canvas overflow-hidden font-sans text-textprimary selection:bg-highlight selection:text-white">
      <Header
        authorName="Marco Schenkel Jr."
        activeTool={activeTool}
        originalImageUrl={originalImageUrl}
        processedImageUrl={processedImageUrl}
        onImageUpload={handleImageUpload}
        onClearImages={clearImages}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          activeTool={activeTool}
          onToolSelect={handleToolSelect}
        />

        <CanvasArea
          originalImage={originalImageUrl}
          processedImage={processedImageUrl}
          isProcessing={isProcessing}
          onImageUpload={handleImageUpload} // <-- A mágica da conexão acontece aqui!
        />

        <Inspector
          activeTool={activeTool}
          params={params}
          onParamChange={handleParamChange}
          isOpen={isInspectorOpen}
          onToggle={() => setIsInspectorOpen(!isInspectorOpen)}
          // --- NOVAS PROPS AQUI ---
          layers={layers}
          activeLayerId={activeLayerId}
          onToggleLayerVisibility={toggleLayerVisibility}
          onDeleteLayer={deleteLayer}
          onSelectLayer={selectLayer}
          onClearLayers={clearAllLayers}
        />
      </div>
    </div>
  );
};
