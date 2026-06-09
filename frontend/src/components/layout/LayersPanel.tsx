import React from 'react';
import { Eye, Trash2, Layers } from 'lucide-react';

export const LayersPanel: React.FC = () => {
    return (
        <div className="flex flex-col h-1/2 bg-[#1A1A1A] text-gray-300 border-t border-gray-800">
            {/* Cabeçalho do Painel de Camadas */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers size={16} className="text-gray-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Camadas (Layers)</h3>
                </div>
                {/* Botão para limpar tudo */}
                <button className="text-xs text-red-400 hover:text-red-300 transition-colors">
                    Limpar Tudo
                </button>
            </div>

            {/* Lista de Camadas */}
            <div className="flex flex-col gap-1 p-2 overflow-y-auto scrollbar-hide">

                {/* Mockup: Camada 2 (Filtro Aplicado) */}
                <div className="flex items-center justify-between bg-[#2A2A2A] p-2 rounded-md border border-blue-500/50 hover:bg-[#333333] transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                        <button className="text-blue-400 hover:text-blue-300">
                            <Eye size={16} />
                        </button>
                        <span className="text-sm font-medium text-white">Tons de Cinza</span>
                    </div>
                    <button className="text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all">
                        <Trash2 size={16} />
                    </button>
                </div>

                {/* Mockup: Camada 1 (Imagem Base) */}
                <div className="flex items-center justify-between bg-[#2A2A2A] p-2 rounded-md border border-transparent hover:bg-[#333333] transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                        <button className="text-gray-400 hover:text-white">
                            <Eye size={16} />
                        </button>
                        <span className="text-sm font-medium">Imagem Original</span>
                    </div>
                    {/* A imagem original não pode ser apagada na lixeira */}
                </div>

            </div>
        </div>
    );
};