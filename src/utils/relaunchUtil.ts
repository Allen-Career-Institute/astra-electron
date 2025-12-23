import { app } from 'electron';
import { spawn } from 'child_process';

let launchArgs: string[] = [];

const getLaunchArgs = () => {
  return launchArgs;
};

const setLaunchArgs = (args: string[]) => {
  launchArgs = [...args];
};

const relaunchWithArgs = (args: string[]) => {
  if (app.isPackaged) {
    app.relaunch({ args });
    app.exit(0);
  } else {
    const electronBinary = process.execPath;
    spawn(electronBinary, args, {
      detached: true,
      stdio: 'ignore',
    }).unref();

    app.exit(0);
  }
};

export { getLaunchArgs, setLaunchArgs, relaunchWithArgs };
