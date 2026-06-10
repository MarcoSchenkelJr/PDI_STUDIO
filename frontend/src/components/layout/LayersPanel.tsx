import React from 'react';
import { ChevronUp, ChevronDown, Eye, EyeOff, Trash2, Layers as LayersIcon } from 'lucide-react';

export interface Layer {
    id: string;
    toolId: string;
    name: string;
    params: any;
    visible: boolean;
}

interface LayersPanelProps {
    layers: Layer[];
    activeLayerId: string | null;
    onToggleVisibility: (id: string) => void;
    onDeleteLayer: (id: string) => void;
    onMoveLayerUp: (id: string) => void;
    onMoveLayerDown: (id: string) => void;
    onSelectLayer: (id: string) => void;
    onClearAll: () => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
    layers, activeLayerId, onToggleVisibility, onDeleteLayer, onMoveLayerUp, onMoveLayerDown, onSelectLayer, onClearAll
}) => {
    return (
        <div className="flex flex-col h-[65%] min-h-[250px] bg-panel text-textprimary border-t border-accent">
            {/* Cabeçalho Unificado */}
            <div className="p-4 border-b border-accent flex items-center justify-between bg-canvas">
                <div className="flex items-center space-x-3">
                    <LayersIcon size={18} className="text-textsecondary" />
                    <h3 className="text-xs font-bold text-textsecondary uppercase tracking-wider">CAMADAS</h3>
                </div>
                <button
                    onClick={onClearAll}
                    className="text-sm font-medium text-red-500/50 hover:text-red-500 transition-colors disabled:opacity-20"
                    disabled={layers.length === 0}
                >
                    Limpar Tudo
                </button>
            </div>

            <div className="flex flex-col gap-1 p-2 overflow-y-auto scrollbar-hide">
                {layers.map((layer, index) => (
                    <div
                        key={layer.id}
                        onClick={() => onSelectLayer(layer.id)}
                        className={`flex items-center justify-between p-2 rounded-md transition-colors cursor-pointer group border ${activeLayerId === layer.id ? 'bg-highlight/20 border-highlight' : 'bg-canvas border-transparent hover:bg-accent/30'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                                className={layer.visible ? "text-highlight hover:text-blue-400" : "text-textsecondary hover:text-white"}
                            >
                                {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            <span className={`text-sm font-medium flex items-center gap-2 ${layer.visible ? 'text-white' : 'text-textsecondary line-through'}`}>
                                <span className="text-[10px] text-textsecondary bg-accent px-1.5 py-0.5 rounded">
                                    {layers.length - index}
                                </span>
                                {layer.name}
                            </span>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={(e) => { e.stopPropagation(); onMoveLayerUp(layer.id); }} className="text-textsecondary hover:text-white transition-colors p-1" title="Mover para cima">
                                <ChevronUp size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onMoveLayerDown(layer.id); }} className="text-textsecondary hover:text-white transition-colors p-1" title="Mover para baixo">
                                <ChevronDown size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }} className="text-textsecondary hover:text-red-500 transition-colors p-1 ml-1" title="Excluir camada">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                <div className="flex items-center justify-between bg-canvas p-2 rounded-md border border-accent mt-2 opacity-80">
                    <div className="flex items-center gap-3">
                        <Eye size={16} className="text-textsecondary" />
                        <span className="text-sm font-medium text-textsecondary flex items-center gap-2">
                            <span className="text-[10px] text-textsecondary bg-accent px-1.5 py-0.5 rounded">0</span>
                            Imagem Original
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};