// Definición de tipos para la API de Electron
interface ElectronAPI {
  printHTML: (htmlContent: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
