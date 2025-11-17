# morphProtocol

A sophisticated network traffic obfuscation system designed to disguise and encrypt VPN traffic, making it resistant to deep packet inspection (DPI) and network censorship.

## Features

- **Multi-layer Obfuscation**: Apply 1-4 layers of cryptographic transformations
- **Dynamic Function Selection**: Unpredictable transformation patterns per packet
- **UDP Transport**: Fast, low-latency packet forwarding
- **IP Migration**: QUIC-style seamless IP address changes without reconnection
- **AES-256-CBC Encryption**: Strong encryption with RSA key exchange
- **Traffic Management**: Built-in bandwidth tracking and reporting
- **Session Persistence**: ClientID-based sessions survive network changes

## Architecture

```
WireGuard (51820) → Client Obfuscator → Encrypted Tunnel → Server Obfuscator → WireGuard (51820)
```

### Core Components

- **Obfuscation Engine**: 11 reversible transformation functions
- **Encryption Layer**: AES-256-CBC with RSA handshake
- **Transport Layer**: UDP tunneling
- **API Integration**: Backend traffic and user management

## Installation

```bash
npm install
```

## Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings:
- Server hostname and IP
- Port numbers for each protocol
- WireGuard connection details
- API endpoints and authentication
- Obfuscation parameters

## Usage

### Server

**Option 1: Run with Node.js**

```bash
npm run server
```

**Option 2: Run standalone executable**

```bash
# Linux
./bin/morphprotocol-server-linux

# Windows
bin\morphprotocol-server-win.exe
```

The executable will look for a `.env` file in the current directory. Make sure to create one based on `.env.example`.

### Client

Connect to a server:

```bash
npm run client <server_ip>:<port>:<user_id> <encryption_key>

# Example
npm run client 192.168.1.100:12301:user123 "base64key:base64iv"
```

**Note**: The encryption key is displayed by the server on startup and should be obtained from the server logs.

## Development

### Build

```bash
npm run build
```

### Build Standalone Executables

Create standalone executables for Linux and Windows (no Node.js required):

```bash
# Build both Linux and Windows executables
npm run build:exe

# Or build individually
npm run pkg:linux    # Creates bin/morphprotocol-server-linux
npm run pkg:win      # Creates bin/morphprotocol-server-win.exe
```

The executables will be created in the `bin/` directory:
- **Linux**: `bin/morphprotocol-server-linux` (~45MB)
- **Windows**: `bin/morphprotocol-server-win.exe` (~37MB)

These are self-contained binaries that include the Node.js runtime and all dependencies.

### Test

```bash
npm test
```

### Project Structure

```
morphProtocol/
├── src/                    # TypeScript server
│   ├── core/              # Obfuscation engine
│   ├── crypto/            # Encryption layer
│   ├── transport/udp/     # UDP protocol implementation
│   ├── api/               # Backend integration
│   ├── config/            # Configuration management
│   ├── utils/             # Utilities and logging
│   └── types/             # TypeScript types
├── tests/                 # Server tests
├── android/
│   ├── plugin/           # Android Capacitor plugin
│   └── demo-app/         # Android demo app
└── ios/
    ├── plugin/           # iOS Capacitor plugin
    └── demo-app/         # iOS demo app (symlink to android/demo-app)
```

## How It Works

### Handshake Process

1. Client generates random obfuscation parameters
2. Parameters sent to server via handshake
3. Server creates dedicated tunnel with matching configuration
4. Both sides use identical obfuscation settings

### Packet Obfuscation

Each packet undergoes:
1. Multiple layers of transformations (XOR, bit rotation, substitution, etc.)
2. Random padding addition (1-8 bytes)
3. 3-byte header with function combo index
4. AES-256-CBC encryption

### Dynamic Function Selection

- Header determines which transformation functions to apply
- Function combo = `(header[0] * header[1]) % totalCombinations`
- Creates unpredictable patterns that defeat traffic analysis

## Security Features

- Random padding prevents packet size analysis
- Dynamic function combinations prevent pattern recognition
- AES-256-CBC encryption for control channel
- RSA-2048 key exchange for handshake
- Heartbeat mechanism detects dead connections
- Automatic timeout and cleanup

## Use Cases

- **VPN Obfuscation**: Hide VPN traffic from DPI systems
- **Censorship Circumvention**: Bypass government firewalls
- **Traffic Disguise**: Make VPN traffic appear as random data
- **Protocol Tunneling**: Encapsulate any UDP traffic

## License

ISC

## Contributing

Contributions welcome! Please read the contributing guidelines first.

## Support

For issues and questions, please open a GitHub issue.
