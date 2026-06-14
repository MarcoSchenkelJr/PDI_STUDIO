const API_BASE_URL = 'http://127.0.0.1:8000/api/process';

// --- MOTOR DE PIPELINE (V2.0) ---
export const processPipeline = async (file: File, layers: any[]): Promise<{ url: string; errors: string[] }> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('layers', JSON.stringify(layers));

  const response = await fetch(`${API_BASE_URL}/pipeline`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Erro na API ao processar o Pipeline de Camadas');
  }

  const blob = await response.blob();
  const errorsHeader = response.headers.get('X-Pipeline-Errors');
  const errors = errorsHeader ? errorsHeader.split('; ') : [];

  return { url: URL.createObjectURL(blob), errors };
};
