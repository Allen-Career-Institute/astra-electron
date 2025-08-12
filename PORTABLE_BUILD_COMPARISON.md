# Windows Portable Build Comparison

This project now supports building and comparing portable Windows packages using both **electron-forge** and **electron-builder** with comprehensive GitHub Actions integration.

## 🎯 **Overview**

### **What Are Portable Builds?**

- **No installation required**: Run directly from any location
- **Smaller size**: 25-40 MB smaller than installer builds
- **Faster distribution**: Single file download
- **Easy testing**: Quick deployment and testing
- **Fair comparison**: Equal footing for build system comparison

### **Build Systems Compared**

| Build System         | Output Format | Expected Size | Benefits                          |
| -------------------- | ------------- | ------------- | --------------------------------- |
| **Electron-Forge**   | `.zip`        | 80-110 MB     | Familiar format, good compression |
| **Electron-Builder** | `.exe`        | 70-100 MB     | Smaller size, direct execution    |

## 🚀 **Quick Start**

### **Local Testing**

```bash
# Build and compare both portable builds
yarn test:builds

# Individual builds
yarn build:win-forge      # Electron-Forge portable (.zip)
yarn build:win-builder    # Electron-Builder portable (.exe)

# Size analysis
yarn analyze:size
```

### **GitHub Actions**

- **Automatic**: Triggers on push to main/develop
- **Manual**: Use workflow dispatch with options
- **Comparison**: Detailed size analysis and recommendations

## ⚙️ **Configuration**

### **Electron-Forge Configuration**

```javascript
// forge.config.js & forge.config.dev.js
{
  name: '@electron-forge/maker-zip',
  platforms: ['win32'],
  config: {
    name: 'Allen Console Portable'
  }
}
```

### **Electron-Builder Configuration**

```json
// electron-builder.json
{
  "win": {
    "target": [
      {
        "target": "portable",
        "arch": ["x64"]
      }
    ]
  }
}
```

## 📊 **Size Analysis Features**

### **What Gets Analyzed**

- **File sizes**: Individual executable sizes
- **Directory sizes**: Total build directory sizes
- **Comparison**: Side-by-side size comparison
- **Recommendations**: Optimal build system suggestions
- **GitHub Actions output**: Structured data for CI/CD

### **Analysis Output Example**

```
🔍 PORTABLE BUILD SIZE ANALYSIS
================================

📁 Electron-Forge Portable Build Analysis:
  Files found:
    ✅ allen_ui_console_dev_portable-win32-x64.zip: 95.2 MB

📁 Electron-Builder Portable Build Analysis:
  Files found:
    ✅ Allen UI Console-1.0.0-portable.exe: 87.6 MB

📊 PORTABLE BUILD COMPARISON
============================
✅ Electron-Builder is 7.6 MB SMALLER

🔍 DETAILED ANALYSIS
=====================
Size Comparison:
  📦 Electron-Forge: 95.2 MB
  📦 Electron-Builder: 87.6 MB
  📦 Difference: -7.6 MB (-8.0%)

🏆 Electron-Builder wins by 7.6 MB
```

## 🌐 **GitHub Actions Integration**

### **Workflow Features**

- **Dual builds**: Both electron-forge and electron-builder
- **Size analysis**: Automated comparison and recommendations
- **Artifact upload**: Downloadable packages
- **Comparison report**: Detailed GitHub summary
- **Manual dispatch**: Choose build system

### **Workflow Outputs**

```yaml
outputs:
  forge_size: ${{ steps.size_analysis.outputs.forge_size }}
  builder_size: ${{ steps.size_analysis.outputs.builder_size }}
  size_difference: ${{ steps.size_analysis.outputs.size_difference }}
  percentage_difference: ${{ steps.size_analysis.outputs.percentage_difference }}
  winner: ${{ steps.size_analysis.outputs.winner }}
  recommendation: ${{ steps.size_analysis.outputs.recommendation }}
```

### **GitHub Summary Report**

The workflow generates a comprehensive summary in the GitHub Actions tab:

```markdown
## 📊 Portable Build Comparison Report

### Build Results

- **Electron-Forge Size**: 95.2 MB
- **Electron-Builder Size**: 87.6 MB
- **Size Difference**: -7.6 MB
- **Percentage Difference**: -8.0%

### Winner

🏆 **electron-builder**

### Recommendation

Use Electron-Builder for smaller builds
```

## 📈 **Expected Results**

### **Size Comparison**

| Metric            | Electron-Forge | Electron-Builder | Winner     |
| ----------------- | -------------- | ---------------- | ---------- |
| **Portable Size** | 80-110 MB      | 70-100 MB        | 🏆 Builder |
| **Build Speed**   | Slower         | Faster           | 🏆 Builder |
| **File Format**   | .zip           | .exe             | 🏆 Builder |
| **Ease of Use**   | Extract needed | Direct run       | 🏆 Builder |

### **Performance Benefits**

- **Smaller downloads**: 10-30% size reduction
- **Faster builds**: Electron-builder is typically faster
- **Better UX**: Direct executable vs zip extraction
- **Easier distribution**: Single file deployment

## 🎯 **Usage Recommendations**

### **For Development & Testing**

- **Use**: `yarn build:win-builder`
- **Reason**: Smaller size, faster builds
- **Format**: Direct .exe execution

### **For Distribution**

- **Use**: `yarn build:win-builder`
- **Reason**: Better user experience
- **Format**: Single executable file

### **For Size Optimization**

- **Use**: Electron-Builder portable
- **Reason**: Typically 10-30% smaller
- **Benefit**: Faster downloads, less storage

## 🔧 **Build Scripts**

### **Available Commands**

```bash
yarn build:win-forge      # Electron-Forge portable (.zip)
yarn build:win-builder    # Electron-Builder portable (.exe)
yarn test:builds          # Build both and compare
yarn analyze:size         # Analyze build sizes
```

### **Build Process**

1. **Clean**: Remove previous builds
2. **TypeScript**: Compile TypeScript code
3. **Renderer**: Build webpack bundle
4. **Package**: Create portable executable
5. **Analyze**: Compare sizes and provide recommendations

## 📁 **Output Locations**

### **Local Builds**

- **Electron-Forge**: `out/` directory (`.zip` files)
- **Electron-Builder**: `dist-electron-builder/` directory (`.exe` files)

### **GitHub Actions Artifacts**

- **Electron-Forge**: `electron-forge-portable` artifact
- **Electron-Builder**: `electron-builder-portable` artifact

## 🔍 **Monitoring & Maintenance**

### **Size Tracking**

```bash
# Regular size analysis
yarn analyze:size

# Monitor size trends
# Check GitHub Actions artifacts
# Review build logs for size changes
```

### **Optimization Tips**

1. **Regular analysis**: Run size analysis after dependency updates
2. **Monitor trends**: Track size changes over time
3. **Optimize dependencies**: Remove unused packages
4. **Update configurations**: Keep build configs optimized

## 🚀 **Next Steps**

1. **Test the setup**: Run `yarn test:builds`
2. **Compare sizes**: Review the analysis output
3. **Choose system**: Select optimal build system for your needs
4. **Set up monitoring**: Implement size tracking in CI/CD
5. **Optimize further**: Apply size optimization techniques

## 📋 **File Structure**

```
.github/workflows/
└── build-windows-portable.yml    # Portable build workflow

scripts/
├── analyze-size.sh               # Size analysis script
└── test-builds.sh               # Build comparison script

forge.config.js                   # Electron-Forge config
forge.config.dev.js              # Electron-Forge dev config
electron-builder.json            # Electron-Builder config

out/                              # Electron-Forge builds (.zip)
dist-electron-builder/           # Electron-Builder builds (.exe)
```

## 🎉 **Benefits**

- **Comprehensive comparison**: Side-by-side analysis
- **Automated workflow**: GitHub Actions integration
- **Detailed reporting**: Rich output and recommendations
- **Easy testing**: Simple commands for local testing
- **Size optimization**: Focus on smaller, faster builds

The setup is now complete and optimized for portable Windows builds with comprehensive size analysis and comparison capabilities through both local scripts and GitHub Actions automation.
