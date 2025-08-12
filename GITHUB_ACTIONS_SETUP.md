# GitHub Actions Setup Guide

This guide explains how to set up GitHub Actions for building and releasing the Allen UI Console
Electron app.

## Overview

The project includes two GitHub Actions workflows:

1. **PR Build** (`.github/workflows/pr-build.yml`)
   - Triggers on pull requests to `main` and `develop` branches
   - Builds for all platforms (macOS, Windows, Linux)
   - Creates artifacts for testing (no GitHub release)
   - Artifacts are retained for 30 days

2. **Release** (`.github/workflows/release.yml`)
   - Triggers on pushes to `main` branch
   - Builds for all platforms with code signing
   - Creates GitHub release with downloadable assets
   - Can be manually triggered with custom version

## Required GitHub Secrets

### For Code Signing (Release Workflow Only)

#### macOS Code Signing

- `APPLE_ID`: Your Apple Developer account email
- `APPLE_ID_PASS`: App-specific password for your Apple ID
- `APPLE_TEAM_ID`: Your Apple Developer Team ID
- `CSC_LINK`: Base64-encoded certificate file (Developer ID Application)
- `CSC_KEY_PASSWORD`: Password for the certificate

#### Windows Code Signing (Optional)

- `CSC_LINK`: Base64-encoded certificate file (.pfx)
- `CSC_KEY_PASSWORD`: Password for the certificate

### How to Set Up Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each secret

### Setting Up macOS Code Signing

#### 1. Get Apple Developer Account

- Sign up for Apple Developer Program ($99/year)
- Or use a free account (limited capabilities)

#### 2. Create App-Specific Password

1. Go to [Apple ID](https://appleid.apple.com)
2. Sign in with your Apple ID
3. Go to **Security** → **App-Specific Passwords**
4. Click **Generate Password**
5. Use this password for `APPLE_ID_PASS`

#### 3. Get Team ID

1. Go to [Apple Developer](https://developer.apple.com)
2. Sign in and go to **Membership**
3. Copy your **Team ID**

#### 4. Create Certificate

1. Go to [Certificates](https://developer.apple.com/account/resources/certificates/list)
2. Click **+** to add a new certificate
3. Select **Developer ID Application**
4. Follow the instructions to create and download the certificate
5. Convert to base64:
   ```bash
   base64 -i "path/to/certificate.p12" | pbcopy
   ```
6. Use this for `CSC_LINK`

### Setting Up Windows Code Signing (Optional)

#### 1. Get Code Signing Certificate

- Purchase from a Certificate Authority (DigiCert, Sectigo, etc.)
- Or use a self-signed certificate for testing

#### 2. Convert to Base64

```bash
base64 -i "path/to/certificate.pfx" | pbcopy
```

## Environment Variables

The workflows use these environment variables:

- `NODE_VERSION`: Node.js version (default: '18')
- `YARN_VERSION`: Yarn version (default: '4.9.2')
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions

## Workflow Triggers

### PR Build Workflow

- **Automatic**: On pull request to `main` or `develop`
- **Manual**: Not available (PR-specific)

### Release Workflow

- **Automatic**: On push to `main` branch
- **Manual**: Go to **Actions** → **Release** → **Run workflow**
  - Can specify custom version number

## Build Platforms

Both workflows build for:

- **macOS**: Intel (x64) and Apple Silicon (arm64)
- **Windows**: 64-bit (x64) and 32-bit (ia32)
- **Linux**: 64-bit (x64)

## Artifacts and Releases

### PR Build Artifacts

- Stored as GitHub Actions artifacts
- Available for download from the Actions tab
- Retained for 30 days
- Named: `allen-ui-console-{platform}-{arch}-pr-{pr-number}`

### Release Assets

- Published to GitHub Releases
- Available for public download
- Retained indefinitely
- Named: `allen-ui-console-{platform}-{arch}`

## Troubleshooting

### Common Issues

1. **Build Fails on macOS**
   - Check if `APPLE_ID` and `APPLE_ID_PASS` are correct
   - Verify `APPLE_TEAM_ID` is correct
   - Ensure certificate is valid and not expired

2. **Code Signing Fails**
   - Verify `CSC_LINK` is properly base64-encoded
   - Check `CSC_KEY_PASSWORD` is correct
   - Ensure certificate is not expired

3. **Release Creation Fails**
   - Check if `GITHUB_TOKEN` has sufficient permissions
   - Verify tag doesn't already exist
   - Ensure all build jobs completed successfully

### Debugging

1. Check the **Actions** tab in your repository
2. Click on the failed workflow run
3. Expand the failed job to see detailed logs
4. Look for specific error messages

## Security Best Practices

1. **Never commit secrets to the repository**
2. **Use app-specific passwords** for Apple ID
3. **Rotate certificates regularly**
4. **Limit repository access** to trusted contributors
5. **Review workflow permissions** regularly

## Customization

### Adding New Platforms

Edit the `matrix.include` section in both workflow files:

```yaml
include:
  - os: ubuntu-latest
    platform: linux
    arch: arm64 # Add new architecture
```

### Modifying Build Steps

The workflows use these npm scripts:

- `yarn build:ts`: Build TypeScript
- `yarn renderer:build`: Build React renderer
- `yarn make`: Build Electron app

### Changing Retention Periods

- PR artifacts: 30 days (in `pr-build.yml`)
- Release artifacts: 90 days (in `release.yml`)

## Support

For issues with:

- **GitHub Actions**: Check GitHub documentation
- **Code Signing**: Contact your certificate provider
- **Apple Developer**: Contact Apple Developer Support
- **Project-specific**: Create an issue in this repository
