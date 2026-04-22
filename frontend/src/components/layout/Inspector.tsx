import { SlidersHorizontal } from 'lucide-react';

export interface ToolParams {
  threshold_value: number;
  brightness: number;
  contrast: number;
  kernel_size: number;
  x_offset: number;
  y_offset: number;
  angle: number;
  scale_factor: number;
  flip_code: number;
  iterations: number;
}

interface InspectorProps {
  activeTool: string;
  params: ToolParams;
  onParamChange: (paramName: keyof ToolParams, value: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Inspector = ({ activeTool, params, onParamChange, isOpen, onToggle }: InspectorProps) => {
  return (
    <>
      {!isOpen && (
        <button
          onClick={onToggle}
          className="absolute right-0 top-0 bg-canvas border-b border-l border-accent p-4 rounded-bl-xl shadow-lg z-30 text-textsecondary hover:text-highlight transition-colors group flex items-center space-x-3"
          title="Abrir Propriedades"
        >
          <SlidersHorizontal size={18} />
          <span className="text-sm font-semibold tracking-wide whitespace-nowrap hidden group-hover:block transition-all">Propriedades</span>
        </button>
      )}

      <aside
        className={`bg-panel border-l border-accent flex flex-col flex-shrink-0 shadow-2xl z-20 transition-all duration-300 ease-in-out ${isOpen ? 'w-72 translate-x-0' : 'w-0 translate-x-full opacity-0 border-l-0 overflow-hidden'
          }`}
      >
        <div
          onClick={onToggle}
          className="p-4 border-b border-accent flex items-center space-x-3 bg-canvas cursor-pointer hover:bg-white/5 transition-colors"
          title="Ocultar Painel"
        >
          <SlidersHorizontal size={18} className="text-highlight" />
          <h2 className="text-sm font-semibold text-textprimary tracking-wide whitespace-nowrap">Propriedades</h2>
        </div>

        <div className="p-5 space-y-8">

          {activeTool === 'threshold' && (
            <div className="space-y-4">
              <label className="text-xs text-textsecondary flex justify-between font-medium">
                <span>Nível de Threshold (Limiar)</span>
                <span className="text-highlight font-bold">{params.threshold_value}</span>
              </label>
              <input
                title="Threshold"
                type="range"
                min="0"
                max="255"
                value={params.threshold_value}
                onChange={(e) => onParamChange('threshold_value', Number(e.target.value))}
                className="w-full h-1.5 bg-accent rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}

          {activeTool === 'brightness-contrast' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-xs text-textsecondary flex justify-between font-medium">
                  <span>Brilho</span>
                  <span className="text-highlight font-bold">{params.brightness}</span>
                </label>
                <input
                  title="Brilho"
                  type="range"
                  min="-100"
                  max="100"
                  value={params.brightness}
                  onChange={(e) => onParamChange('brightness', Number(e.target.value))}
                  className="w-full h-1.5 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-4">
                <label className="text-xs text-textsecondary flex justify-between font-medium">
                  <span>Contraste</span>
                  <span className="text-highlight font-bold">{params.contrast.toFixed(1)}</span>
                </label>
                <input
                  title="Contraste"
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={params.contrast}
                  onChange={(e) => onParamChange('contrast', Number(e.target.value))}
                  className="w-full h-1.5 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}

          {['mean-filter', 'median-filter', 'gaussian-filter', 'dilate', 'erode', 'opening', 'closing', 'lowpass'].includes(activeTool) && (
            <div className="space-y-4">
              <label className="text-xs text-textsecondary flex justify-between font-medium">
                <span>Tamanho do Kernel</span>
                <span className="text-highlight font-bold">{params.kernel_size}</span>
              </label>
              <input
                title="Kernel Size"
                type="range"
                min="3"
                max="151"
                step="2"
                value={params.kernel_size}
                onChange={(e) => onParamChange('kernel_size', Number(e.target.value))}
                className="w-full h-1.5 bg-accent rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}

          {activeTool === 'translation' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-xs text-textsecondary flex justify-between font-medium">
                  <span>Eixo X (Offset)</span>
                  <span className="text-highlight font-bold">{params.x_offset}px</span>
                </label>
                <input
                  title="X Offset"
                  type="range" min="-2000" max="2000"
                  value={params.x_offset}
                  onChange={(e) => onParamChange('x_offset', Number(e.target.value))}
                  className="w-full h-1.5 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="space-y-4">
                <label className="text-xs text-textsecondary flex justify-between font-medium">
                  <span>Eixo Y (Offset)</span>
                  <span className="text-highlight font-bold">{params.y_offset}px</span>
                </label>
                <input
                  title="Y Offset"
                  type="range" min="-2000" max="2000"
                  value={params.y_offset}
                  onChange={(e) => onParamChange('y_offset', Number(e.target.value))}
                  className="w-full h-1.5 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTool === 'rotation' && (
            <div className="space-y-4">
              <label className="text-xs text-textsecondary flex justify-between font-medium">
                <span>Ângulo (Rotação)</span>
                <span className="text-highlight font-bold">{params.angle}º</span>
              </label>
              <input
                title="Rotation Angle"
                type="range" min="-180" max="180"
                value={params.angle}
                onChange={(e) => onParamChange('angle', Number(e.target.value))}
                className="w-full h-1.5 bg-accent rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}

          {activeTool === 'scale' && (
            <div className="space-y-4">
              <label className="text-xs text-textsecondary flex justify-between font-medium">
                <span>Fator de Escala</span>
                <span className="text-highlight font-bold">{params.scale_factor.toFixed(1)}x</span>
              </label>
              <input
                title="Scale Factor"
                type="range" min="0.1" max="3.0" step="0.1"
                value={params.scale_factor}
                onChange={(e) => onParamChange('scale_factor', Number(e.target.value))}
                className="w-full h-1.5 bg-accent rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}

          {activeTool === 'mirror' && (
            <div className="space-y-4">
              <label className="text-xs text-textsecondary flex font-medium">
                <span>Direção</span>
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => onParamChange('flip_code', 1)}
                  className={`flex-1 py-2 text-xs rounded-md border border-accent transition-colors ${params.flip_code === 1 ? 'bg-highlight text-white' : 'text-textsecondary hover:bg-accent'}`}
                >
                  Horizontal
                </button>
                <button
                  onClick={() => onParamChange('flip_code', 0)}
                  className={`flex-1 py-2 text-xs rounded-md border border-accent transition-colors ${params.flip_code === 0 ? 'bg-highlight text-white' : 'text-textsecondary hover:bg-accent'}`}
                >
                  Vertical
                </button>
                <button
                  onClick={() => onParamChange('flip_code', -1)}
                  className={`flex-1 py-2 text-xs rounded-md border border-accent transition-colors ${params.flip_code === -1 ? 'bg-highlight text-white' : 'text-textsecondary hover:bg-accent'}`}
                >
                  Ambos
                </button>
              </div>
            </div>
          )}

          {['dilate', 'erode'].includes(activeTool) && (
            <div className="space-y-4">
              <label className="text-xs text-textsecondary flex justify-between font-medium">
                <span>Iterações</span>
                <span className="text-highlight font-bold">{params.iterations}</span>
              </label>
              <input
                title="Iterations"
                type="range" min="1" max="10" step="1"
                value={params.iterations}
                onChange={(e) => onParamChange('iterations', Number(e.target.value))}
                className="w-full h-1.5 bg-accent rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}

          {['grayscale', 'highpass'].includes(activeTool) && (
            <div className="space-y-4">
              <span className="text-xs text-textsecondary italic leading-relaxed">
                Este filtro é aplicado diretamente e não possui opções customizáveis nesta versão.
              </span>
            </div>
          )}

          {activeTool !== 'threshold' && activeTool !== 'brightness-contrast' && !['mean-filter', 'median-filter', 'gaussian-filter', 'translation', 'rotation', 'scale', 'mirror', 'dilate', 'erode', 'opening', 'closing', 'grayscale', 'lowpass', 'highpass'].includes(activeTool) && (
            <div className="flex h-32 items-center justify-center text-center">
              <span className="text-xs text-textsecondary italic leading-relaxed">
                O backend para a ferramenta <br /> <strong className="text-textprimary">'{activeTool}'</strong> <br /> ainda não foi implementado.
              </span>
            </div>
          )}

        </div>
      </aside>
    </>
  );
};
