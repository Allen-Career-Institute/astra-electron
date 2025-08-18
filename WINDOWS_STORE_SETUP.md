# Windows Store AppX Setup Guide

This guide explains how to set up Windows Store AppX builds and publishing using GitHub Actions.

## Overview

The project now supports building AppX packages for Windows Store publishing. Two workflows are available:

1. **`appx-build.yml`** - Dedicated AppX build workflow
2. **`release.yml`** - Updated to include AppX builds with regular releases

## GitHub Actions Secrets

To enable AppX builds and Windows Store publishing, you need to configure the following secrets in your GitHub repository:

### Required Secrets

#### For AppX Code Signing

- `WINDOWS_APPX_CERTIFICATE_BASE64` - Base64 encoded PFX certificate for AppX signing
- `CSC_KEY_PASSWORD` - Password for the certificate

#### For Windows Store Publishing (Optional)

- `WINDOWS_STORE_CLIENT_ID` - Azure AD application client ID
- `WINDOWS_STORE_CLIENT_SECRET` - Azure AD application client secret
- `WINDOWS_STORE_TENANT_ID` - Azure AD tenant ID

### Environment Variables

- `STAGE_CONSOLE_URL` - Stage environment URL
- `PROD_CONSOLE_URL` - Production environment URL
- `CUSTOM_CONSOLE_URL` - Custom environment URL

## Setting Up Windows Store Publishing

### 1. Create Azure AD Application

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to Azure Active Directory > App registrations
3. Click "New registration"
4. Fill in the details:
   - Name: "Allen Console Windows Store"
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI: Web > https://localhost
5. Note down the Application (client) ID and Directory (tenant) ID

### 2. Create Client Secret

1. In your Azure AD app, go to "Certificates & secrets"
2. Click "New client secret"
3. Add a description and choose expiration
4. Copy the secret value immediately (you won't see it again)

### 3. Configure API Permissions

1. Go to "API permissions"
2. Click "Add a permission"
3. Select "Microsoft Store" > "Application permissions"
4. Add the following permissions:
   - `Manage applications`
   - `Manage submissions`
   - `Read applications`
   - `Read submissions`

### 4. Grant Admin Consent

1. Click "Grant admin consent for [Your Organization]"
2. Confirm the permissions

## Creating AppX Certificate

### Option 1: Self-Signed Certificate (for testing)

```powershell
# Create a self-signed certificate
New-SelfSignedCertificate -Type Custom -Subject "CN=AllenDigital" -KeyUsage DigitalSignature -FriendlyName "Allen Console AppX" -CertStoreLocation "Cert:\CurrentUser\My" -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}")

# Export to PFX
$cert = Get-ChildItem -Path "Cert:\CurrentUser\My" | Where-Object {$_.Subject -eq "CN=AllenDigital"}
$password = ConvertTo-SecureString -String "YourPassword" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "allen-console-appx.pfx" -Password $password
```

### Option 2: Code Signing Certificate (for production)

Purchase a code signing certificate from a trusted Certificate Authority (CA) like:

- DigiCert
- Sectigo
- GlobalSign
- Comodo

## Converting Certificate to Base64

```bash
# Convert PFX to Base64
base64 -i allen-console-appx.pfx | tr -d '\n' > certificate_base64.txt
```

Copy the content of `certificate_base64.txt` to the `WINDOWS_APPX_CERTIFICATE_BASE64` secret.

## Workflow Usage

### Manual AppX Build

1. Go to Actions > "Build AppX for Windows Store"
2. Click "Run workflow"
3. Choose branch and options:
   - Version: Leave empty for current version
   - Publish to Store: Check if you want to publish (requires store credentials)

### Automatic AppX Build

- **On tags**: Creates AppX packages automatically
- **On main branch**: Builds AppX for testing
- **On releases**: Includes AppX packages with regular releases

## AppX Assets (Optional)

For better Windows Store presentation, add these assets to `assets/appx/`:

- `StoreLogo.png` (50x50)
- `Square150x150Logo.png` (150x150)
- `Square44x44Logo.png` (44x44)
- `Wide310x150Logo.png` (310x150)
- `BadgeLogo.png` (24x24) - Optional
- `LargeTile.png` (310x310) - Optional
- `SmallTile.png` (71x71) - Optional
- `SplashScreen.png` (620x300) - Optional

If not provided, default assets will be generated from your app icon.

## Testing AppX Packages

1. Download the AppX file from GitHub releases
2. On Windows 10/11, right-click the AppX file
3. Select "Install" (requires developer mode or trusted certificate)
4. Or use PowerShell: `Add-AppxPackage -Path "path\to\app.appx"`

## Windows Store Submission

1. Go to [Partner Center](https://partner.microsoft.com/dashboard)
2. Create a new app submission
3. Upload the AppX package
4. Fill in store listing details
5. Submit for review

## Troubleshooting

### Common Issues

1. **Certificate errors**: Ensure the certificate is valid and properly encoded
2. **Permission errors**: Check Azure AD app permissions and admin consent
3. **Build failures**: Verify all secrets are properly configured
4. **AppX installation fails**: Check if developer mode is enabled or certificate is trusted

### Debug Commands

```bash
# Check certificate validity
openssl pkcs12 -info -in certificate.pfx -noout

# Verify AppX package
Get-AppxPackageManifest -Path "app.appx"
```

## References

- [Electron Builder AppX Documentation](https://www.electron.build/appx)
- [Windows Store Developer Documentation](https://docs.microsoft.com/en-us/windows/uwp/publish/)
- [Azure AD App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
