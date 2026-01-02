import { contextBridge, ipcRenderer } from 'electron';
try {
  contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    getAllProfiles: (): Promise<any> => ipcRenderer.invoke('get-all-profiles'),
    setActiveProfile: (id: string): Promise<any> =>
      ipcRenderer.invoke('set-active-profile', id),
    createProfile: (id: string, name: string): Promise<any> =>
      ipcRenderer.invoke('create-profile', id, name),
    deleteProfile: (id: string): Promise<any> =>
      ipcRenderer.invoke('delete-profile', id),
  });

  console.log('Successfully exposed electronAPI to renderer process');
} catch (error) {
  console.error('Failed to expose electronAPI:', error);
}
