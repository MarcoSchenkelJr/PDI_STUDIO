import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Inspector, ToolParams } from './Inspector';
import { CanvasArea } from '../workspace/CanvasArea';
import { processThreshold, processBrightnessContrast, processMeanFilter, processMedianFilter, processGaussianFilter, processTranslation, processRotation, processScale, processMirror, processDilation, processErosion, processOpening, processClosing, processGrayscale, processLowpass, processHighpass } from '../../services/api';

export const MainLayout = () => {
  const [activeTool, setActiveTool] = useState<string>('threshold');
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);

  // Imagem Base
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Parâmetros compartihados
  const [params, setParams] = useState<ToolParams>({
    threshold_value: 128,
    brightness: 0,
    contrast: 1.0,
    kernel_size: 3,
    x_offset: 0,
    y_offset: 0,
    angle: 0.0,
    scale_factor: 1.0,
    flip_code: 1,
    iterations: 1,
  });

  const debounceTimerUrl = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleParamChange = (paramName: keyof ToolParams, value: number) => {
    setParams(prev => ({ ...prev, [paramName]: value }));
  };

  const handleToolSelect = (toolId: string) => {
    if (activeTool === toolId) {
      setIsInspectorOpen(!isInspectorOpen);
    } else {
      setActiveTool(toolId);
      setIsInspectorOpen(true);
    }
  };

  const handleImageUpload = (file: File) => {
    setImageFile(file);
    if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
    setOriginalImageUrl(URL.createObjectURL(file));
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
        />

        <Inspector
          activeTool={activeTool}
          params={params}
          onParamChange={handleParamChange}
          isOpen={isInspectorOpen}
          onToggle={() => setIsInspectorOpen(!isInspectorOpen)}
        />
      </div>
    </div>
  );
};
