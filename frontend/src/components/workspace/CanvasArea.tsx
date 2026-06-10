import React, { useRef } from 'react'; // <-- Adicione useRef aqui
import { Image as ImageIcon } from 'lucide-react';

interface CanvasAreaProps {
  originalImage: string | null;
  processedImage: string | null;
  isProcessing: boolean;
  onImageUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void; // <-- Nova propriedade
}

export const CanvasArea = ({ originalImage, processedImage, isProcessing, onImageUpload }: CanvasAreaProps) => {
  // Cria uma referência para o input de arquivo invisível
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simula o clique no input apenas se não houver imagem
  const handleEmptyClick = () => {
    if (!originalImage && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <main className="flex-1 bg-canvas flex flex-col overflow-hidden relative">
      <div className="flex-1 overflow-auto p-8 flex items-center justify-center space-x-12">

        {/* Original Image Canvas */}
        <div className="flex flex-col items-center space-y-4">
          <span className="text-xs text-textprimary font-medium uppercase tracking-widest">Original</span>
          <div className="min-w-[400px] min-h-[400px] max-w-[45vw] bg-panel border-2 border-accent/20 rounded-xl relative overflow-hidden flex items-center justify-center">

            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" /* mantenha seu style do background aqui */></div>

            {/* O SEGREDO: Input de arquivo escondido */}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={onImageUpload}
              className="hidden"
            />

            {originalImage ? (
              <img src={originalImage} alt="Original" className="max-w-full max-h-[70vh] object-contain relative z-10" />
            ) : (
              // ÁREA CLICÁVEL (agora com cursor-pointer e hover)
              <div
                onClick={handleEmptyClick}
                className="text-center text-textsecondary flex flex-col items-center space-y-4 relative z-10 cursor-pointer hover:text-white transition-all p-10 rounded-xl hover:bg-white/5"
              >
                <ImageIcon size={48} strokeWidth={1.2} />
                <span className="text-sm border border-dashed border-accent py-1 px-3 rounded-full">
                  Clique aqui para abrir uma imagem
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Separator */}
        <div className="h-[400px] flex items-center">
          <div className="w-px h-24 bg-accent"></div>
        </div>

        {/* Processed Image Canvas */}
        <div className="flex flex-col items-center space-y-4">
          <span className="text-xs text-textprimary font-medium uppercase tracking-widest">Processada</span>
          <div className="min-w-[400px] min-h-[400px] max-w-[45vw] bg-panel border-2 border-accent rounded-xl shadow-xl flex items-center justify-center relative overflow-hidden transition-all group">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '10px 10px' }} />

            {isProcessing ? (
              <div className="text-center text-highlight flex flex-col items-center space-y-3 z-10 transition-transform animate-pulse">
                <ImageIcon size={48} strokeWidth={1.2} />
                <span className="text-sm">Processando...</span>
              </div>
            ) : processedImage ? (
              <img src={processedImage} alt="Processed" className="max-w-full max-h-[70vh] object-contain z-10 p-2" />
            ) : (
              <div className="text-center text-textsecondary flex flex-col items-center space-y-3 z-10 transition-transform group-hover:scale-110">
                <ImageIcon size={48} strokeWidth={1.2} />
                <span className="text-sm">Aguardando...</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
};
