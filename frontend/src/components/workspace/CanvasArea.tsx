import { Image as ImageIcon } from 'lucide-react';

interface CanvasAreaProps {
  originalImage: string | null;
  processedImage: string | null;
  isProcessing: boolean;
}

export const CanvasArea = ({ originalImage, processedImage, isProcessing }: CanvasAreaProps) => {
  return (
    <main className="flex-1 bg-canvas flex flex-col overflow-hidden relative">


      <div className="flex-1 overflow-auto p-8 flex items-center justify-center space-x-12">

        {/* Original Image Canvas */}
        <div className="flex flex-col items-center space-y-4">
          <span className="text-xs text-textprimary font-medium uppercase tracking-widest">Original</span>
          <div className="min-w-[400px] min-h-[400px] max-w-[45vw] bg-panel border-2 border-accent rounded-xl shadow-xl flex items-center justify-center relative overflow-hidden transition-all hover:border-highlight group">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '10px 10px' }} />

            {originalImage ? (
              <img src={originalImage} alt="Original" className="max-w-full max-h-[70vh] object-contain z-10 p-2" />
            ) : (
              <div className="text-center text-textsecondary flex flex-col items-center space-y-3 z-10 transition-transform group-hover:scale-110">
                <ImageIcon size={48} strokeWidth={1.2} />
                <span className="text-sm border border-dashed border-accent py-1 px-3 rounded-lg text-xs mt-2">Faça o upload de uma imagem em Arquivo - Abrir</span>
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
          <span className="text-xs text-highlight font-bold uppercase tracking-widest drop-shadow-md">Processada</span>
          <div className="min-w-[400px] min-h-[400px] max-w-[45vw] bg-panel border-2 border-accent rounded-xl shadow-xl flex items-center justify-center relative overflow-hidden transition-all hover:border-highlight group">
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
