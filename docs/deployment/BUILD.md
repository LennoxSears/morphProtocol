# Building MorphProtocol Executables

This guide explains how to build standalone executables for MorphProtocol server.

## Overview

MorphProtocol can be packaged into standalone executables that include:
- Node.js runtime (v18)
- All dependencies bundled
- No external Node.js installation required

## Prerequisites

- Node.js 18+ installed (for building only)
- npm or yarn

## Quick Start

```bash
# Install dependencies
npm install

# Build executables for both platforms
npm run build:exe
```

This creates:
- `bin/morphprotocol-server-linux` (~45MB) - Linux x64 executable
- `bin/morphprotocol-server-win.exe` (~37MB) - Windows x64 executable

## Build Commands

### Build All Platforms

```bash
npm run build:exe
```

Builds executables for both Linux and Windows.

### Build Individual Platforms

```bash
# Linux only
npm run pkg:linux

# Windows only
npm run pkg:win
```

### Bundle Only (No Packaging)

```bash
npm run bundle
```

Creates `dist/server.bundle.js` - a single bundled JavaScript file with all dependencies.

## Build Process

The build process consists of two steps:

### 1. Bundling with esbuild

```bash
npm run bundle
```

- Bundles all TypeScript/JavaScript files into a single file
- Resolves all imports and dependencies
- Optimizes for Node.js runtime
- Output: `dist/server.bundle.js`

### 2. Packaging with pkg

```bash
npm run pkg:all
```

- Takes the bundled JavaScript file
- Embeds it into a Node.js binary
- Creates platform-specific executables
- Output: `bin/morphprotocol-server-*`

## Running Executables

### Linux

```bash
# Make executable (if needed)
chmod +x bin/morphprotocol-server-linux

# Run
./bin/morphprotocol-server-linux
```

### Windows

```cmd
bin\morphprotocol-server-win.exe
```

### Configuration

The executable looks for `.env` file in the **current working directory** (not the executable's directory).

```bash
# Create .env file
cp .env.example .env

# Edit configuration
nano .env

# Run executable
./bin/morphprotocol-server-linux
```

## Distribution

The executables are self-contained and can be distributed without Node.js:

1. Copy the executable to target system
2. Create `.env` configuration file
3. Run the executable

**Example distribution package:**
```
morphprotocol-server/
├── morphprotocol-server-linux  (or .exe for Windows)
├── .env.example
└── README.txt
```

## Troubleshooting

### "Cannot find module" errors

If you see module errors, ensure you're using the bundled version:
```bash
npm run bundle
npm run pkg:linux
```

### Large file size

The executables include the full Node.js runtime (~40MB). This is normal and allows them to run without Node.js installed.

### Permission denied (Linux)

```bash
chmod +x bin/morphprotocol-server-linux
```

### .env not found

The executable looks for `.env` in the current directory:
```bash
cd /path/to/config
/path/to/bin/morphprotocol-server-linux
```

## Advanced Configuration

### Custom pkg Configuration

Edit `package.json` to customize pkg behavior:

```json
{
  "pkg": {
    "assets": [
      ".env.example"
    ],
    "scripts": [
      "dist/**/*.js"
    ],
    "outputPath": "bin"
  }
}
```

### Additional Platforms

To build for other platforms, modify the `--targets` flag:

```bash
# macOS
pkg dist/server.bundle.js --targets node18-macos-x64 --output bin/morphprotocol-server-macos

# Linux ARM
pkg dist/server.bundle.js --targets node18-linux-arm64 --output bin/morphprotocol-server-linux-arm64
```

Available targets:
- `node18-linux-x64`
- `node18-linux-arm64`
- `node18-macos-x64`
- `node18-macos-arm64`
- `node18-win-x64`
- `node18-win-arm64`

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build Executables

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run build:exe
      - uses: actions/upload-artifact@v3
        with:
          name: executables
          path: bin/
```

## Performance

- **Startup time**: ~1-2 seconds (includes Node.js initialization)
- **Memory usage**: Similar to running with Node.js directly
- **File size**: 
  - Linux: ~45MB
  - Windows: ~37MB

## Security

- Executables contain your source code in bytecode format
- Not fully obfuscated - determined users can extract code
- For production, consider additional obfuscation tools
- Always use HTTPS for API endpoints
- Never hardcode secrets in source code

## License

The executables include Node.js runtime, which is licensed under the MIT license.
