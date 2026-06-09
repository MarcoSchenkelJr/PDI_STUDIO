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
        <div className="flex flex-col h-1/3 min-h-[250px] bg-[#1A1A1A] text-gray-300 border-t border-gray-800">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LayersIcon size={16} className="text-gray-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Camadas</h3>
                </div>
                <button
                    onClick={onClearAll}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                    disabled={layers.length === 0}
                >
                    Limpar Tudo
                </button>
            </div>

            <div className="flex flex-col gap-1 p-2 overflow-y-auto scrollbar-hide">

                {/* Renderiza a Pilha Dinâmica de Camadas */}
                {layers.map((layer) => (
                    <div
                        key={layer.id}
                        onClick={() => onSelectLayer(layer.id)}
                        className={`flex items-center justify-between p-2 rounded-md transition-colors cursor-pointer group border ${activeLayerId === layer.id ? 'bg-[#333333] border-blue-500' : 'bg-[#2A2A2A] border-transparent hover:bg-[#333333]'
                            }`}
                    >
                        {/* PARTE ESQUERDA: Olhinho e Nome do Filtro */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                                className={layer.visible ? "text-blue-400 hover:text-blue-300" : "text-gray-600 hover:text-gray-400"}
                            >
                                {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            <span className={`text-sm font-medium ${layer.visible ? 'text-white' : 'text-gray-500 line-through'}`}>
                                {layer.name}
                            </span>
                        </div>

                        {/* PARTE DIREITA: Botões de Ação (Aparecem no Hover) */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                                onClick={(e) => { e.stopPropagation(); onMoveLayerUp(layer.id); }}
                                className="text-gray-500 hover:text-white transition-colors p-1"
                                title="Mover para cima"
                            >
                                <ChevronUp size={16} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onMoveLayerDown(layer.id); }}
                                className="text-gray-500 hover:text-white transition-colors p-1"
                                title="Mover para baixo"
                            >
                                <ChevronDown size={16} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }}
                                className="text-gray-500 hover:text-red-400 transition-colors p-1 ml-1"
                                title="Excluir camada"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Camada Base (Imagem Original no Fundo da Pilha) */}
                <div className="flex items-center justify-between bg-[#202020] p-2 rounded-md border border-transparent mt-2 opacity-80">
                    <div className="flex items-center gap-3">
                        <Eye size={16} className="text-gray-500" />
                        <span className="text-sm font-medium text-gray-400">Imagem Original</span>
                    </div>
                </div>

            </div>
        </div>
    );
};