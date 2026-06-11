import React, { useState } from 'react';
import {
  Move,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  ZoomIn,
  ZoomOut,
  Eye,
  Sun,
  Aperture,
  Zap,
  Contrast,
  Sliders,
  Grid,
  Wind,
  PlusCircle,
  MinusCircle,
  Sparkles,
  Lock,
  Scissors,
  Clock,
  Box,
  Type,
  Tag,
  BarChart2,
  Wrench,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeTool: string;
  onToolSelect: (toolId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const menuGroups = [
  {
    title: 'Transformações Geométricas',
    items: [
      { id: 'translation', icon: Move, label: 'Translação' },
      { id: 'rotation', icon: RotateCw, label: 'Rotação' },
      { id: 'mirror-h', icon: FlipHorizontal, label: 'Espelhamento Horiz.' },
      { id: 'mirror-v', icon: FlipVertical, label: 'Espelhamento Vert.' },
      { id: 'scale-up', icon: ZoomIn, label: 'Aumentar Tamanho' },
      { id: 'scale-down', icon: ZoomOut, label: 'Diminuir Tamanho' }
    ]
  },
  {
    title: 'Filtros',
    items: [
      { id: 'grayscale', icon: Eye, label: 'Tons de Cinza' },
      { id: 'brightness-contrast', icon: Sun, label: 'Brilho/Contraste' },
      { id: 'lowpass', icon: Aperture, label: 'Passa Baixa' },
      { id: 'highpass', icon: Zap, label: 'Passa Alta' },
      { id: 'threshold', icon: Contrast, label: 'Threshold/Limiar.' },
      { id: 'mean-filter', icon: Sliders, label: 'Filtro Média' },
      { id: 'median-filter', icon: Grid, label: 'Filtro Mediana' },
      { id: 'gaussian-filter', icon: Wind, label: 'Filtro Gauss' }
    ]
  },
  {
    title: 'Morfologia Matemática',
    items: [
      { id: 'dilate', icon: PlusCircle, label: 'Dilatação' },
      { id: 'erode', icon: MinusCircle, label: 'Erosão' },
      { id: 'opening', icon: Sparkles, label: 'Abertura' },
      { id: 'closing', icon: Lock, label: 'Fechamento' },
      { id: 'thinning', icon: Scissors, label: 'Afinamento' }
    ]
  },
  {
    title: 'Desafios (Exercícios)',
    items: [
      { id: 'clock', icon: Clock, label: 'Relógio' },
      { id: 'objects', icon: Box, label: 'Objetos' },
      { id: 'letters', icon: Type, label: 'Letras' },
      { id: 'signs', icon: Tag, label: 'Placas' },
      { id: 'charts', icon: BarChart2, label: 'Gráfico' }
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTool, onToolSelect, isOpen, onToggle }) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ 'Filtros': true });
  const toggleGroup = (title: string) => setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));

  return (
    <>
      {!isOpen && (
        <button onClick={onToggle} className="absolute left-0 top-0 bg-canvas border-b border-r border-accent p-4 rounded-br-xl shadow-lg z-30 text-textsecondary hover:text-highlight transition-colors group flex items-center space-x-3">
          <Wrench size={18} />
          <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap hidden group-hover:block transition-all">FERRAMENTAS</span>
        </button>
      )}
      <aside className={`bg-panel border-r border-accent flex flex-col h-full flex-shrink-0 shadow-2xl z-20 transition-all duration-300 ease-in-out ${isOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0 border-r-0 overflow-hidden'}`}>
        <div onClick={onToggle} className="p-4 border-b border-accent flex items-center justify-center gap-2 bg-canvas cursor-pointer hover:bg-white/5 transition-colors group" title="Ocultar Painel">
          <h2 className="text-xs font-bold text-textsecondary group-hover:text-highlight uppercase tracking-wider transition-colors">FERRAMENTAS</h2>
          <Wrench size={18} className="text-textsecondary group-hover:text-highlight transition-colors" />
        </div>
        <div className="flex-1 py-2 overflow-y-auto scrollbar-hide">
          {menuGroups.map((group) => (
            <div key={group.title} className="mb-2">
              <button onClick={() => toggleGroup(group.title)} className="w-full flex items-center justify-between px-4 py-2 text-textsecondary hover:text-white hover:bg-accent/30 transition-colors whitespace-nowrap">
                <span className="text-sm font-medium">{group.title}</span>
                {openGroups[group.title] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {openGroups[group.title] && (
                <div className="mt-1 flex flex-col gap-1 px-2">
                  {group.items.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeTool === tool.id;
                    return (
                      <button key={tool.id} onClick={() => onToolSelect(tool.id)} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all w-full ${isActive ? 'bg-highlight/20 text-highlight shadow-[inset_2px_0_0_0_currentColor]' : 'text-textsecondary hover:bg-accent/50 hover:text-white'}`}>
                        <Icon size={18} />
                        <span className="text-sm font-medium">{tool.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};