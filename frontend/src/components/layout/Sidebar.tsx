import { Droplet, Aperture, Zap, Contrast, SunMedium, Grid, Wind, Move, RotateCw, Maximize, FlipHorizontal, PlusCircle, MinusCircle, Maximize2, Minimize2 } from 'lucide-react';

interface SidebarProps {
  activeTool: string;
  onToolSelect: (toolId: string) => void;
}

const tools = [
  { id: 'grayscale', icon: Droplet, label: 'Tons de Cinza' },
  { id: 'lowpass', icon: Aperture, label: 'Passa Baixa' },
  { id: 'highpass', icon: Zap, label: 'Passa Alta' },
  { id: 'threshold', icon: Contrast, label: 'Threshold/Limiarização' },
  { id: 'brightness-contrast', icon: SunMedium, label: 'Brilho/Contraste' },
  { id: 'mean-filter', icon: Droplet, label: 'Média (Blur)' },
  { id: 'median-filter', icon: Grid, label: 'Mediana' },
  { id: 'gaussian-filter', icon: Wind, label: 'Gaussiano' },
  { id: 'translation', icon: Move, label: 'Translação' },
  { id: 'rotation', icon: RotateCw, label: 'Rotação' },
  { id: 'scale', icon: Maximize, label: 'Escala' },
  { id: 'mirror', icon: FlipHorizontal, label: 'Espelhamento' },
  { id: 'dilate', icon: PlusCircle, label: 'Dilatação' },
  { id: 'erode', icon: MinusCircle, label: 'Erosão' },
  { id: 'opening', icon: Maximize2, label: 'Abertura' },
  { id: 'closing', icon: Minimize2, label: 'Fechamento' },
];

export const Sidebar = ({ activeTool, onToolSelect }: SidebarProps) => {

  return (
    <aside className="w-16 bg-panel border-r border-accent flex flex-col items-center py-4 space-y-4 overflow-y-auto py-4 scrollbar-hide">

      {/* Tool Buttons */}
      <div className="w-8 h-px bg-accent mb-4"></div>

      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;

        return (
          <button
            key={tool.id}
            title={tool.label}
            onClick={() => onToolSelect(tool.id)}
            className={`p-3 rounded-xl transition-all group relative ${isActive
              ? 'bg-highlight text-white'
              : 'text-textsecondary hover:bg-accent hover:text-white'
              }`}
          >
            <Icon size={24} strokeWidth={1.5} />
            <span className="absolute left-16 top-1/2 -translate-y-1/2 bg-black text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              {tool.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
};
