#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Allen UI Console Electron App...\n');

// Create config.js from example if it doesn't exist
const configExamplePath = path.join(__dirname, 'config.example.js');
const configPath = path.join(__dirname, 'config.js');

if (!fs.existsSync(configPath)) {
  console.log('📝 Creating config.js from example...');
  fs.copyFileSync(configExamplePath, configPath);
  console.log('✅ config.js created successfully');
} else {
  console.log('ℹ️  config.js already exists');
}

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  console.log('📁 Creating assets directory...');
  fs.mkdirSync(assetsDir, { recursive: true });
  console.log('✅ assets directory created');
} else {
  console.log('ℹ️  assets directory already exists');
}

// Check if icon files exist
const iconFiles = ['assets/icon.png', 'assets/icon.ico', 'assets/icon.icns'];

console.log('\n📋 Checking required files:');
iconFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - Please add your app icon`);
  }
});

// Check package.json
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log(`\n📦 Package: ${packageJson.name} v${packageJson.version}`);
} else {
  console.log('\n❌ package.json not found');
}

console.log('\n🎯 Next steps:');
console.log('1. Run: npm install');
console.log('2. Add your app icons to assets/ directory');
console.log('3. Update config.js with your settings');
console.log('4. Run: npm run dev');
console.log('\n📚 See README.md for detailed instructions');
