import { useState, useCallback } from 'react';
import { useElectronAPI } from './useElectronAPI';

export const useRecording = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const { startRecording, stopRecording } = useElectronAPI();

  const handleStartRecording = useCallback(
    async (options: any) => {
      try {
        await startRecording(options);
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    },
    [startRecording]
  );

  const handleStopRecording = useCallback(async () => {
    try {
      await stopRecording();
      setIsRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }, [stopRecording]);

  return {
    isRecording,
    startRecording: handleStartRecording,
    stopRecording: handleStopRecording,
  };
};
