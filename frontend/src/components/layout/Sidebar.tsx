import React, { useState } from 'react';
// Adicionei ChevronDown e ChevronRight para as setinhas da sanfona!
import {
  Droplet, Aperture, Zap, Contrast, SunMedium, Grid, Wind, Move,
  RotateCw, Maximize, FlipHorizontal, FlipVertical, PlusCircle,
  MinusCircle, Maximize2, Minimize2, ChevronDown, ChevronRight, Folder
} from 'lucide-react';

interface SidebarProps {
  activeTool: string;
  onToolSelect: (toolId: string) => void;
}

// Nossa nova estrutura de dados agrupada
const menuGroups = [
  {
    title: 'Transformações Geométricas',
    items: [
      { id: 'translation', icon: Move, label: 'Translação' },
      { id: 'rotation', icon: RotateCw, label: 'Rotação' },
      { id: 'mirror-h', icon: FlipHorizontal, label: 'Espelhamento Horiz.' },
      { id: 'mirror-v', icon: FlipVertical, label: 'Espelhamento Vert.' },
      { id: 'scale-up', icon: Maximize, label: 'Aumentar Tamanho' },
      { id: 'scale-down', icon: Minimize2, label: 'Diminuir Tamanho' },
    ]
  },
  {
    title: 'Filtros',
    items: [
      { id: 'grayscale', icon: Droplet, label: 'Tons de Cinza' },
      { id: 'brightness-contrast', icon: SunMedium, label: 'Brilho/Contraste' },
      { id: 'lowpass', icon: Aperture, label: 'Passa Baixa' },
      { id: 'highpass', icon: Zap, label: 'Passa Alta' },
      { id: 'threshold', icon: Contrast, label: 'Threshold/Limiar.' },
      { id: 'mean-filter', icon: Droplet, label: 'Filtro Média' },
      { id: 'median-filter', icon: Grid, label: 'Filtro Mediana' },
      { id: 'gaussian-filter', icon: Wind, label: 'Filtro Gauss' },
    ]
  },
  {
    title: 'Morfologia Matemática',
    items: [
      { id: 'dilate', icon: PlusCircle, label: 'Dilatação' },
      { id: 'erode', icon: MinusCircle, label: 'Erosão' },
      { id: 'opening', icon: Maximize2, label: 'Abertura' },
      { id: 'closing', icon: Minimize2, label: 'Fechamento' },
      { id: 'thinning', icon: Zap, label: 'Afinamento' }, // Agrupará os 3 tipos depois
    ]
  },
  {
    title: 'Desafios (Exercícios)',
    items: [
      { id: 'ex1-clock', icon: Folder, label: 'Ex 1 - Relógio' },
      { id: 'ex2-objects', icon: Folder, label: 'Ex 2 - Objetos' },
      { id: 'ex3-letters', icon: Folder, label: 'Ex 3 - Letras' },
      { id: 'ex4-signs', icon: Folder, label: 'Ex 4 - Placas' },
      { id: 'ex5-charts', icon: Folder, label: 'Ex 5 - Gráfico' },
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTool, onToolSelect }) => {
  // Estado para controlar quais sanfonas estão abertas (iniciamos com Filtros aberto)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Filtros': true
  });

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <aside className="w-64 bg-[#1A1A1A] border-r border-gray-800 flex flex-col h-full overflow-y-auto scrollbar-hide">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Ferramentas</h2>
      </div>

      <div className="flex-1 py-2">
        {menuGroups.map((group) => (
          <div key={group.title} className="mb-2">
            {/* Cabeçalho da Sanfona */}
            <button
              onClick={() => toggleGroup(group.title)}
              className="w-full flex items-center justify-between px-4 py-2 text-gray-300 hover:text-white hover:bg-[#2A2A2A] transition-colors"
            >
              <span className="text-sm font-medium">{group.title}</span>
              {openGroups[group.title] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {/* Lista de Ferramentas (só aparece se a sanfona estiver aberta) */}
            {openGroups[group.title] && (
              <div className="mt-1 flex flex-col gap-1 px-2">
                {group.items.map((tool) => {
                  const Icon = tool.icon;
                  const isActive = activeTool === tool.id;

                  return (
                    <button
                      key={tool.id}
                      onClick={() => onToolSelect(tool.id)}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 w-full
                        ${isActive
                          ? 'bg-blue-600/20 text-blue-500 shadow-[inset_2px_0_0_0_#3b82f6]'
                          : 'text-gray-400 hover:bg-[#2A2A2A] hover:text-gray-200'
                        }
                      `}
                    >
                      <Icon size={18} className={isActive ? 'text-blue-500' : 'text-gray-500'} />
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
  );
};