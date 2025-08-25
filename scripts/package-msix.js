const { packageMSIX } = require('electron-windows-msix');
const path = require('path');
const fs = require('fs');

async function packageMSIXApp() {
  try {
    console.log('Starting MSIX packaging...');

    // Read package.json for version and app info
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const version = packageJson.version;
    const appName = packageJson.name;

    // Define paths
    const appDir = path.join(
      __dirname,
      '..',
      'dist-electron-builder',
      'win-unpacked'
    );
    const outputDir = path.join(__dirname, '..', 'dist-electron-builder');
    const assetsDir = path.join(__dirname, '..', 'assets', 'appx');

    // Check if the unpacked app exists
    if (!fs.existsSync(appDir)) {
      throw new Error(`App directory not found: ${appDir}`);
    }

    // Check if assets directory exists
    if (!fs.existsSync(assetsDir)) {
      console.warn(`Assets directory not found: ${assetsDir}, creating it...`);
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    console.log('App directory:', appDir);
    console.log('Output directory:', outputDir);
    console.log('Assets directory:', assetsDir);

    // MSIX packaging configuration
    const msixConfig = {
      appDir: appDir,
      outputDir: outputDir,
      packageAssets: assetsDir,
      manifestVariables: {
        publisher: 'CN=ALLEN CAREER INSTITUTE PRIVATE LIMITED',
        publisherDisplayName: 'ALLEN CAREER INSTITUTE PRIVATE LIMITED',
        packageIdentity: 'com.allencareerinstitute.astra-console',
        packageVersion: version,
        packageDisplayName: 'Astra Console',
        packageDescription:
          'Astra Console Electron App with WebView and Video Streaming',
        packageBackgroundColor: '#ffffff',
        appExecutable: 'AstraConsole.exe',
        appDisplayName: 'Astra',
        targetArch: 'x64',
        packageMinOSVersion: '10.0.19041.0',
        packageMaxOSVersionTested: '10.0.19041.0',
      },
      packageName: `${appName}-${version}.msix`,
      createPri: true,
      sign: false, // Set to true if you have a certificate
      logLevel: 'warn',
    };

    console.log('MSIX configuration:', JSON.stringify(msixConfig, null, 2));

    // Package the MSIX
    await packageMSIX(msixConfig);

    console.log('✅ MSIX packaging completed successfully!');
    console.log(
      `📦 MSIX file created: ${path.join(outputDir, msixConfig.packageName)}`
    );
  } catch (error) {
    console.error('❌ MSIX packaging failed:', error);
    process.exit(1);
  }
}

// Run the packaging
packageMSIXApp();
