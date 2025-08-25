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

    // MSIX requires version in format: major.minor.build.revision
    // Convert semantic version to MSIX format
    const versionParts = version.split('.');
    const msixVersion =
      versionParts.length >= 3
        ? `${versionParts[0]}.${versionParts[1]}.${versionParts[2]}.0`
        : `${version}.0.0.0`;

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
      console.error(`❌ App directory not found: ${appDir}`);
      console.log('📁 Available directories in dist-electron-builder:');
      const distDir = path.join(__dirname, '..', 'dist-electron-builder');
      if (fs.existsSync(distDir)) {
        const contents = fs.readdirSync(distDir);
        contents.forEach(item => {
          const itemPath = path.join(distDir, item);
          const stats = fs.statSync(itemPath);
          console.log(`  ${item} (${stats.isDirectory() ? 'dir' : 'file'})`);
        });
      } else {
        console.log('  dist-electron-builder directory does not exist');
      }
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

    // Check if the executable exists
    const executablePath = path.join(appDir, 'Astra Console.exe');
    if (!fs.existsSync(executablePath)) {
      console.error(`❌ Executable not found: ${executablePath}`);
      console.log('📁 Available files in app directory:');
      if (fs.existsSync(appDir)) {
        const contents = fs.readdirSync(appDir);
        contents.forEach(item => {
          const itemPath = path.join(appDir, item);
          const stats = fs.statSync(itemPath);
          console.log(`  ${item} (${stats.isDirectory() ? 'dir' : 'file'})`);
        });
      }
      throw new Error(`Executable not found: ${executablePath}`);
    }
    console.log('✅ Executable found:', executablePath);
    console.log('📦 Using MSIX version:', msixVersion);

    // MSIX packaging configuration
    const msixConfig = {
      appDir: appDir,
      outputDir: outputDir,
      packageAssets: assetsDir,
      manifestVariables: {
        publisher: 'CN=ALLEN CAREER INSTITUTE PRIVATE LIMITED',
        publisherDisplayName: 'ALLEN CAREER INSTITUTE PRIVATE LIMITED',
        packageIdentity: 'AllenCareerInstitute.AstraConsole',
        packageVersion: msixVersion,
        packageDisplayName: 'Astra Console',
        packageDescription:
          'Astra Console Electron App with WebView and Video Streaming',
        packageBackgroundColor: '#ffffff',
        appExecutable: 'Astra Console.exe',
        appDisplayName: 'Astra',
        targetArch: 'x64',
        packageMinOSVersion: '10.0.19041.0',
        packageMaxOSVersionTested: '10.0.19041.0',
      },
      packageName: `${appName}-${msixVersion}.msix`,
      createPri: true,
      sign: false, // Set to true if you have a certificate
      logLevel: 'warn',
      capabilities: ['internetClient', 'privateNetworkClientServer'],
      deviceCapabilities: ['microphone', 'webcam'],
    };

    console.log('MSIX configuration:', JSON.stringify(msixConfig, null, 2));

    // Package the MSIX
    await packageMSIX(msixConfig);

    // Verify the MSIX file was created
    const msixFilePath = path.join(outputDir, msixConfig.packageName);
    if (!fs.existsSync(msixFilePath)) {
      throw new Error(`MSIX file was not created: ${msixFilePath}`);
    }

    console.log('✅ MSIX packaging completed successfully!');
    console.log(`📦 MSIX file created: ${msixFilePath}`);
    console.log(
      `📊 File size: ${(fs.statSync(msixFilePath).size / 1024 / 1024).toFixed(2)} MB`
    );
  } catch (error) {
    console.error('❌ MSIX packaging failed:', error);
    process.exit(1);
  }
}

// Run the packaging
packageMSIXApp();
