#!/usr/bin/env node

// Test script to verify environment variables are properly loaded
const path = require('path');

// Load dotenv
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

console.log('🔍 Environment Variables Test');
console.log('=============================');
console.log('');

// Test environment variables
const envVars = ['NODE_ENV', 'STAGE_URL', 'PROD_URL', 'CUSTOM_URL', 'DEV_URL'];

let allPresent = true;

envVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  console.log(`${status} ${varName}: ${value || 'NOT SET'}`);

  if (!value) {
    allPresent = false;
  }
});

console.log('');
console.log('📋 Summary:');
if (allPresent) {
  console.log('✅ All environment variables are properly set!');
} else {
  console.log('❌ Some environment variables are missing.');
  console.log('');
  console.log('💡 To fix this:');
  console.log('1. Create a .env file in the project root');
  console.log('2. Add the missing environment variables');
  console.log('3. For GitHub Actions, ensure secrets are properly configured');
}

console.log('');
console.log('🔧 Current working directory:', process.cwd());
console.log('📁 .env file exists:', require('fs').existsSync('.env'));
console.log(
  '📁 .env.local file exists:',
  require('fs').existsSync('.env.local')
);
