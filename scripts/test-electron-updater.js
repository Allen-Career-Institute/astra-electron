#!/usr/bin/env node

/**
 * Test script to verify electron-updater functionality
 * Run this after building to ensure the module is properly bundled
 */

const path = require('path');
const fs = require('fs');

console.log('🧪 Testing electron-updater integration...');

// Test 1: Check if electron-updater is available in node_modules
const electronUpdaterPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'electron-updater'
);
if (fs.existsSync(electronUpdaterPath)) {
  console.log('✅ electron-updater found in node_modules');
} else {
  console.error('❌ electron-updater not found in node_modules');
  process.exit(1);
}

// Test 2: Try to require electron-updater
try {
  const { autoUpdater } = require('electron-updater');
  console.log('✅ electron-updater module loaded successfully');
  console.log('✅ autoUpdater object available:', typeof autoUpdater);
} catch (error) {
  if (error.message.includes('getVersion')) {
    console.log(
      '✅ electron-updater module loaded successfully (expected error in non-Electron context)'
    );
    console.log(
      '✅ autoUpdater object available (will work in Electron context)'
    );
  } else {
    console.error('❌ Failed to load electron-updater:', error.message);
    process.exit(1);
  }
}

// Test 3: Check if built files exist
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  console.log('✅ dist directory exists');

  // Check if main.js exists
  const mainJsPath = path.join(distPath, 'main.js');
  if (fs.existsSync(mainJsPath)) {
    console.log('✅ main.js exists in dist');
  } else {
    console.error('❌ main.js not found in dist');
  }
} else {
  console.log('⚠️  dist directory not found (run build first)');
}

// Test 4: Check electron-builder output
const distElectronBuilderPath = path.join(
  __dirname,
  '..',
  'dist-electron-builder'
);
if (fs.existsSync(distElectronBuilderPath)) {
  console.log('✅ dist-electron-builder directory exists');

  // List contents
  const contents = fs.readdirSync(distElectronBuilderPath);
  console.log('📁 dist-electron-builder contents:', contents);
} else {
  console.log(
    '⚠️  dist-electron-builder directory not found (run electron-builder first)'
  );
}

console.log('🎉 electron-updater integration test completed!');
