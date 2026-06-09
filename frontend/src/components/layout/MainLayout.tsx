import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Inspector, ToolParams } from './Inspector';
import { CanvasArea } from '../workspace/CanvasArea';
import { processPipeline } from '../../services/api';

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

  const moveLayerUp = (id: string) => {
    setLayers(prev => {
      const index = prev.findIndex(l => l.id === id);
      if (index <= 0) return prev; // Já está no topo
      const newLayers = [...prev];
      [newLayers[index - 1], newLayers[index]] = [newLayers[index], newLayers[index - 1]];
      return newLayers;
    });
  };

  const moveLayerDown = (id: string) => {
    setLayers(prev => {
      const index = prev.findIndex(l => l.id === id);
      if (index === -1 || index === prev.length - 1) return prev; // Já está no fundo
      const newLayers = [...prev];
      [newLayers[index + 1], newLayers[index]] = [newLayers[index], newLayers[index + 1]];
      return newLayers;
    });
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


  // --- MOTOR V2.0: PIPELINE DE CAMADAS (Dispara após 300ms de inatividade) ---
  useEffect(() => {
    if (!imageFile) return;

    // Se não houver camadas ou todas estiverem com o olhinho fechado, mostra só a original
    const hasVisibleLayers = layers.some(l => l.visible);
    if (!hasVisibleLayers || layers.length === 0) {
      setProcessedImageUrl(null);
      return;
    }

    const triggerApi = async () => {
      setIsProcessing(true);
      try {
        // A MÁGICA ACONTECE AQUI: Mandamos a imagem e a pilha inteira de uma só vez!
        const newUrl = await processPipeline(imageFile, layers);

        if (newUrl) {
          setProcessedImageUrl(prev => {
            if (prev) URL.revokeObjectURL(prev); // Limpa a memória antes de substituir
            return newUrl;
          });
        }
      } catch (error) {
        console.error('Erro no Motor de Pipeline:', error);
      } finally {
        setIsProcessing(false);
      }
    };

    if (debounceTimerUrl.current) clearTimeout(debounceTimerUrl.current);

    debounceTimerUrl.current = setTimeout(() => {
      triggerApi();
    }, 300);

    return () => {
      if (debounceTimerUrl.current) clearTimeout(debounceTimerUrl.current);
    };
  }, [imageFile, layers]); // O Cérebro agora reage a QUALQUER alteração na lista de camadas!

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
          onMoveLayerUp={moveLayerUp}
          onMoveLayerDown={moveLayerDown}
          onSelectLayer={selectLayer}
          onClearLayers={clearAllLayers}
        />
      </div>
    </div>
  );
};
