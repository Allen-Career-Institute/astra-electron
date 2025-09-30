import { ipcMain, systemPreferences } from 'electron';

export type mediaType = 'microphone' | 'camera' | 'screen';
export interface AskMediaAccessReturn {
  result: boolean;
  mediaType: mediaType;
}

/**
 * request media permission MACOS ONLY
 * If an access request was denied and later is changed through the System Preferences pane, a restart of the app will be required for the new permissions to take effect.
 * If access has already been requested and denied, it must be changed through the preference pane;
 * this fun will not call and the promise will resolve with the existing access status.
 * @param mediaTypes
 * @returns AskMediaAccessReturn[]
 */
export const askMediaAccess = async (
  mediaTypes: mediaType[]
): Promise<AskMediaAccessReturn[]> => {
  let results: AskMediaAccessReturn[] = [];
  if (process.platform === 'darwin') {
    for (const mediaType of mediaTypes) {
      let result: boolean = false;

      if (
        systemPreferences.getMediaAccessStatus(mediaType) === 'not-determined'
      ) {
        console.log(
          'main process request handler:' + JSON.stringify(mediaType)
        );
        try {
          result = await systemPreferences.askForMediaAccess(
            mediaType as 'microphone' | 'camera'
          );
        } catch (error) {
          result = false;
        } finally {
          results.push({
            mediaType,
            result,
          });
        }
      }
    }
  }
  return results;
};
