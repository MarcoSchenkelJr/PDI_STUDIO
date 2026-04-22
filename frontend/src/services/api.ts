const API_BASE_URL = 'https://pdi-studio-api.onrender.com/api/process';

export const processThreshold = async (file: File, thresholdValue: number): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('threshold_value', thresholdValue.toString());

  const response = await fetch(`${API_BASE_URL}/threshold`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Erro na API ao processar o Threshold');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const processBrightnessContrast = async (file: File, brightness: number, contrast: number): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('brightness', brightness.toString());
  formData.append('contrast', contrast.toString());

  const response = await fetch(`${API_BASE_URL}/brightness-contrast`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Erro na API ao processar Brilho e Contraste');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const processMeanFilter = async (file: File, kernelSize: number): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('kernel_size', kernelSize.toString());

  const response = await fetch(`${API_BASE_URL}/filter/mean`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Erro na API ao processar Filtro da Média');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const processMedianFilter = async (file: File, kernelSize: number): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('kernel_size', kernelSize.toString());

  const response = await fetch(`${API_BASE_URL}/filter/median`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Erro na API ao processar Filtro da Mediana');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const processGaussianFilter = async (file: File, kernelSize: number): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('kernel_size', kernelSize.toString());

  const response = await fetch(`${API_BASE_URL}/filter/gaussian`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Erro na API ao processar Filtro Gaussiano');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const processTranslation = async (file: File, xOffset: number, yOffset: number): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('x_offset', xOffset.toString());
  formData.append('y_offset', yOffset.toString());

  const response = await fetch(`${API_BASE_URL}/geometric/translate`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Erro na API ao processar Translação');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const processRotation = async (file: File, angle: number): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('angle', angle.toString());

  const response = await fetch(`${API_BASE_URL}/geometric/rotate`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Erro na API ao processar Rotação');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const processScale = async (file: File, scaleFactor: number): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('scale_factor', scaleFactor.toString());

  const response = await fetch(`${API_BASE_URL}/geometric/scale`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Erro na API ao processar Escala');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const processMirror = async (file: File, flipCode: number): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('flip_code', flipCode.toString());

  const response = await fetch(`${API_BASE_URL}/geometric/mirror`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Erro na API ao processar Espelhamento');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const processDilation = async (file: File, kernelSize: number, iterations: number): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('kernel_size', kernelSize.toString());
  formData.append('iterations', iterations.toString());

  const response = await fetch(`${API_BASE_URL}/morphology/dilate`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Erro na API ao processar Dilatação');

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const processErosion = async (file: File, kernelSize: number, iterations: number): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('kernel_size', kernelSize.toString());
  formData.append('iterations', iterations.toString());

  const response = await fetch(`${API_BASE_URL}/morphology/erode`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Erro na API ao processar Erosão');

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const processOpening = async (file: File, kernelSize: number): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('kernel_size', kernelSize.toString());

  const response = await fetch(`${API_BASE_URL}/morphology/open`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Erro na API ao processar Abertura');

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const processClosing = async (file: File, kernelSize: number): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('kernel_size', kernelSize.toString());

  const response = await fetch(`${API_BASE_URL}/morphology/close`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Erro na API ao processar Fechamento');

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const processGrayscale = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE_URL}/grayscale`, { method: 'POST', body: formData });
  if (!response.ok) throw new Error('Erro na API ao processar Grayscale');
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const processLowpass = async (file: File, kernelSize: number): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('kernel_size', kernelSize.toString());
  const response = await fetch(`${API_BASE_URL}/filter/lowpass`, { method: 'POST', body: formData });
  if (!response.ok) throw new Error('Erro na API ao processar Lowpass');
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const processHighpass = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE_URL}/filter/highpass`, { method: 'POST', body: formData });
  if (!response.ok) throw new Error('Erro na API ao processar Highpass');
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};