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

    // Read electron-builder config for appId
    const electronBuilderConfig = JSON.parse(
      fs.readFileSync('electron-builder-appx.json', 'utf8')
    );
    const appId = electronBuilderConfig.appId;

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

    // Additional validation for electron-windows-msix
    console.log('🔍 Validating app directory structure...');
    const requiredFiles = ['Astra Console.exe', 'resources', 'locales'];

    for (const file of requiredFiles) {
      const filePath = path.join(appDir, file);
      if (fs.existsSync(filePath)) {
        console.log(`✅ Found: ${file}`);
      } else {
        console.warn(`⚠️  Missing: ${file}`);
      }
    }

    // List all files in the app directory for debugging
    console.log('📁 All files in app directory:');
    if (fs.existsSync(appDir)) {
      const allFiles = fs.readdirSync(appDir);
      allFiles.forEach(file => {
        const filePath = path.join(appDir, file);
        const stats = fs.statSync(filePath);
        console.log(
          `  ${file} (${stats.isDirectory() ? 'dir' : 'file'}) - ${stats.size} bytes`
        );
      });
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
      appDir: path.resolve(appDir), // Use absolute path
      outputDir: path.resolve(outputDir), // Use absolute path
      packageAssets: path.resolve(assetsDir), // Use absolute path
      manifestVariables: {
        publisher: 'CN=ALLEN CAREER INSTITUTE PRIVATE LIMITED',
        publisherDisplayName: 'ALLEN CAREER INSTITUTE PRIVATE LIMITED',
        packageIdentity: appId,
        packageVersion: msixVersion,
        packageDisplayName: 'Astra Console',
        packageDescription:
          'Astra Console Electron App with WebView and Video Streaming',
        packageBackgroundColor: '#ffffff',
        appExecutable: 'Astra Console.exe',
        appDisplayName: 'Astra Console',
        targetArch: 'x64',
        packageMinOSVersion: '10.0.19041.0',
        packageMaxOSVersionTested: '10.0.19041.0',
      },
      packageName: `${appName}-${msixVersion}.msix`,
      createPri: true,
      sign: false, // Set to true if you have a certificate
      logLevel: 'info', // Changed to info for more debugging
      capabilities: ['internetClient', 'privateNetworkClientServer'],
      deviceCapabilities: ['microphone', 'webcam'],
    };

    console.log('MSIX configuration:', JSON.stringify(msixConfig, null, 2));

    // Additional debugging
    console.log('🔍 Final validation before packaging:');
    console.log(`  App directory exists: ${fs.existsSync(msixConfig.appDir)}`);
    console.log(`  App directory path: ${msixConfig.appDir}`);
    console.log(
      `  Output directory exists: ${fs.existsSync(msixConfig.outputDir)}`
    );
    console.log(
      `  Assets directory exists: ${fs.existsSync(msixConfig.packageAssets)}`
    );

    // Try to access the directory to ensure it's readable
    try {
      const testRead = fs.readdirSync(msixConfig.appDir);
      console.log(
        `✅ Directory is readable, contains ${testRead.length} items`
      );
    } catch (error) {
      console.error(`❌ Directory access error: ${error.message}`);
      throw error;
    }

    // Package the MSIX
    console.log('🚀 Starting MSIX packaging...');
    try {
      await packageMSIX(msixConfig);
    } catch (error) {
      console.error('❌ MSIX packaging error details:');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }

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
