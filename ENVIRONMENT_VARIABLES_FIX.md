# Environment Variables Fix

## Problem

The `CUSTOM_CONSOLE_URL` environment variable was being set in GitHub Actions but not accessible in the application as `process.env.CUSTOM_URL`.

## Root Cause

The issue was that webpack configurations were missing the `DefinePlugin` to inject environment variables into the build process. Environment variables set in GitHub Actions were not being passed through to the renderer process.

## Solution

### 1. Webpack Configuration Updates

#### Production Webpack (`webpack.config.prod.js`)

Added `DefinePlugin` to inject environment variables:

```javascript
const webpack = require('webpack');

// In plugins array:
new webpack.DefinePlugin({
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  'process.env.STAGE_URL': JSON.stringify(process.env.STAGE_URL),
  'process.env.PROD_URL': JSON.stringify(process.env.PROD_URL),
  'process.env.CUSTOM_URL': JSON.stringify(process.env.CUSTOM_URL),
  'process.env.DEV_URL': JSON.stringify(process.env.DEV_URL),
}),
```

#### Development Webpack (`webpack.config.js`)

Added the same `DefinePlugin` configuration for consistency.

### 2. Main Process Environment Loading

Enhanced `src/main.ts` to load environment variables from multiple sources:

```typescript
// Load environment variables
try {
  require('dotenv').config({ path: '.env.local' });
} catch (error) {
  console.log('No .env.local file found, trying .env');
}

try {
  require('dotenv').config({ path: '.env' });
} catch (error) {
  console.log('No .env file found, using default environment variables');
}

// Debug logging in development
if (process.env.NODE_ENV === 'development') {
  console.log('Environment variables loaded:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('STAGE_URL:', process.env.STAGE_URL);
  console.log('PROD_URL:', process.env.PROD_URL);
  console.log('CUSTOM_URL:', process.env.CUSTOM_URL);
}
```

### 3. Environment Variable Testing

Created `scripts/test-env.js` to verify environment variables are properly loaded:

```bash
yarn test:env
```

This script:

- Loads environment variables from `.env` and `.env.local`
- Tests for required environment variables
- Provides helpful debugging information
- Shows which files exist and current working directory

### 4. GitHub Actions Integration

Added environment variable testing to both workflows:

- **PR Build**: Tests environment variables before building
- **Release**: Tests environment variables before building

## Environment Variables

### Required Variables

| Variable     | Description                 | Example                              |
| ------------ | --------------------------- | ------------------------------------ |
| `NODE_ENV`   | Environment mode            | `development`, `stage`, `production` |
| `STAGE_URL`  | Staging environment URL     | `https://console.allen-stage.in`     |
| `PROD_URL`   | Production environment URL  | `https://astra.allen.in`             |
| `CUSTOM_URL` | Custom environment URL      | `https://custom.allen.in`            |
| `DEV_URL`    | Development environment URL | `http://localhost:3000`              |

### GitHub Secrets

The following secrets must be configured in GitHub:

- `STAGE_CONSOLE_URL`: Staging environment URL
- `PROD_CONSOLE_URL`: Production environment URL
- `CUSTOM_CONSOLE_URL`: Custom environment URL

## How It Works

### Build Process

1. **GitHub Actions**: Sets environment variables from secrets
2. **Webpack Build**: `DefinePlugin` injects environment variables into the bundle
3. **Main Process**: `dotenv` loads environment variables from files
4. **Renderer Process**: Environment variables available via `process.env`

### Runtime

1. **Application Start**: Main process loads environment variables
2. **Config Module**: `src/modules/config.ts` uses environment variables
3. **URL Selection**: Application selects appropriate URL based on environment

## Testing

### Local Testing

```bash
# Test environment variables
yarn test:env

# Build with environment variables
yarn dev:build
```

### GitHub Actions Testing

The workflows now include environment variable testing:

```yaml
- name: Test environment variables
  run: yarn test:env
  timeout-minutes: 2
```

## Troubleshooting

### Environment Variables Not Available

1. **Check GitHub Secrets**: Ensure secrets are properly configured
2. **Run Test Script**: `yarn test:env` to verify variables
3. **Check Webpack Build**: Ensure `DefinePlugin` is configured
4. **Verify File Loading**: Check if `.env` files exist and are loaded

### Build Issues

1. **Webpack Configuration**: Verify `DefinePlugin` is in both configs
2. **Environment Files**: Ensure `.env` files are in project root
3. **GitHub Secrets**: Check that secrets match expected variable names

### Runtime Issues

1. **Main Process**: Check console logs for environment variable loading
2. **Renderer Process**: Verify `process.env` variables in browser dev tools
3. **Config Module**: Ensure `src/modules/config.ts` is using correct variables

## Files Modified

- `webpack.config.js` - Added DefinePlugin for development
- `webpack.config.prod.js` - Added DefinePlugin for production
- `src/main.ts` - Enhanced environment variable loading
- `scripts/test-env.js` - Created environment variable test script
- `package.json` - Added test:env script
- `.github/workflows/pr-build.yml` - Added environment testing
- `.github/workflows/release.yml` - Added environment testing

## Benefits

- **Reliable**: Environment variables are properly injected at build time
- **Debuggable**: Test script provides clear feedback on variable status
- **Consistent**: Same configuration for development and production
- **Maintainable**: Clear documentation and testing procedures
- **CI/CD Ready**: GitHub Actions workflows include validation
