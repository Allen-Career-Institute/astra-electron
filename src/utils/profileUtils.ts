import settings from 'electron-settings';

import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { getLaunchArgs, relaunchWithArgs } from './relaunchUtil';

const getAllProfiles = async () => {
  return (await settings.get('profiles')) as Record<
    string,
    {
      name: string;
      id: string;
      color: string;
    }
  > | null;
};

const getProfile = async (id: string) => {
  return (await settings.get(`profiles.${id}`)) as string | null;
};

const getRandomColorHexCode = () => {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const createProfile = async ({ id, name }: { id: string; name: string }) => {
  if (!(await settings.has(`profiles`))) {
    await settings.set(`profiles`, {});
  }
  await settings.set(`profiles.${id}`, {
    name,
    color: getRandomColorHexCode(),
    id,
  });
  return { success: true, id, name };
};

const deleteProfile = async (id: string) => {
  return await settings.unset(`profiles.${id}`);
};

let activeProfile: string | null = null;

const setActiveProfile = async (id: null | string) => {
  activeProfile = id;
  if (id) {
    const baseDir = path.join(app.getPath('appData'), 'profiles');
    const profileDir = path.join(baseDir, id);

    fs.mkdirSync(profileDir, { recursive: true });

    app.setPath('userData', profileDir);
  }
  await settings.set('activeProfile', id);
};

const clearActiveProfile = async () => {
  activeProfile = null;
  await settings.unset('activeProfile');
};
const getActiveProfile = () => {
  return activeProfile;
};

const clearActiveProfileStorage = async () => {
  const activeProfile = getActiveProfile();
  // if (activeProfile) {
  //   const activeSession = session.fromPartition('persist:shared');
  //   await activeSession.clearStorageData();
  // }
  relaunchWithArgs(getLaunchArgs().filter(a => !a.startsWith('--profile=')));
};

export {
  getAllProfiles,
  getProfile,
  createProfile,
  setActiveProfile,
  clearActiveProfile,
  getActiveProfile,
  deleteProfile,
  clearActiveProfileStorage,
};
