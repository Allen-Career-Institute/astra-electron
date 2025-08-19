#!/usr/bin/env node

/**
 * Test script to verify environment variables in the built application
 * This script simulates how the application would access environment variables
 */

console.log('🔍 Testing Environment Variables in Built Application');
console.log('==================================================');

// Simulate the webpack DefinePlugin behavior
const mockProcessEnv = {
  NODE_ENV: process.env.NODE_ENV,
  STAGE_URL: process.env.STAGE_URL,
  PROD_URL: process.env.PROD_URL,
  CUSTOM_URL: process.env.CUSTOM_URL,
  DEV_URL: process.env.DEV_URL,
};

console.log('📋 Environment Variables:');
console.log('NODE_ENV:', mockProcessEnv.NODE_ENV);
console.log('STAGE_URL:', mockProcessEnv.STAGE_URL);
console.log('PROD_URL:', mockProcessEnv.PROD_URL);
console.log('CUSTOM_URL:', mockProcessEnv.CUSTOM_URL);
console.log('DEV_URL:', mockProcessEnv.DEV_URL);

// Simulate the config.ts logic
const ENV = mockProcessEnv.NODE_ENV || 'development';

const URLS = {
  development: mockProcessEnv.DEV_URL || 'https://console.allen-stage.in/',
  stage:
    mockProcessEnv.CUSTOM_URL ||
    mockProcessEnv.STAGE_URL ||
    'https://console.allen-stage.in/',
  production: mockProcessEnv.PROD_URL || 'https://astra.allen.in/',
};

const DEFAULT_URL = URLS[ENV] || URLS.development;

console.log('\n🎯 Config Results:');
console.log('ENV:', ENV);
console.log('URLS:', URLS);
console.log('DEFAULT_URL:', DEFAULT_URL);

// Test URL selection logic
console.log('\n🧪 URL Selection Test:');
console.log('Development URL:', URLS.development);
console.log('Stage URL:', URLS.stage);
console.log('Production URL:', URLS.production);
console.log('Selected URL for current ENV:', DEFAULT_URL);

// Check if URLs are valid
const urlTests = [
  { name: 'STAGE_URL', url: mockProcessEnv.STAGE_URL },
  { name: 'PROD_URL', url: mockProcessEnv.PROD_URL },
  { name: 'CUSTOM_URL', url: mockProcessEnv.CUSTOM_URL },
  { name: 'DEV_URL', url: mockProcessEnv.DEV_URL },
];

console.log('\n✅ URL Validation:');
urlTests.forEach(({ name, url }) => {
  const isValid = url && url.startsWith('http');
  const status = isValid ? '✅' : '❌';
  console.log(`${status} ${name}: ${url || 'NOT SET'}`);
});

console.log('\n🎉 Environment variable test completed!');
console.log(
  'If you see any ❌ marks, those environment variables need to be set.'
);
