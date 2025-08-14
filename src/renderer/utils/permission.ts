import { systemPreferences } from 'electron';

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
      if (
        systemPreferences.getMediaAccessStatus(mediaType) === 'not-determined'
      ) {
        console.log('main process request handler:' + mediaType);
        try {
          const result = await systemPreferences.askForMediaAccess(
            mediaType as any
          );
          results.push({
            mediaType,
            result,
          });
        } catch (error) {
          console.error('askMediaAccess error:', error);
        }
      }
    }
  }
  return results;
};
