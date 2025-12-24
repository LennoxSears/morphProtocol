# morphProtocol Documentation

Complete documentation for the morphProtocol network traffic obfuscation system.

## Quick Links

### Getting Started
- [Main README](../README.md) - Project overview and quick start
- [Build Guide](deployment/BUILD.md) - Building and packaging
- [Deployment Guide](deployment/DEPLOYMENT.md) - Production deployment
- [Log Rotation](deployment/LOG_ROTATION.md) - Async logging and log rotation setup

### Core Documentation
- [Architecture](architecture.md) - System architecture and design patterns
- [Security](SECURITY.md) - Security features and threat model

### Performance
- [Performance Optimization](performance/PERFORMANCE_OPTIMIZATION.md) - Complete performance tuning guide
- [Migration Guide](performance/MIGRATION_GUIDE.md) - Upgrading to optimized version
- [Log Level Analysis](performance/LOG_LEVEL_2_ANALYSIS.md) - Detailed overhead analysis
- [Code Changes](performance/CHANGES.md) - Optimization changes reference

### Mobile Development
- [Android Client](mobile/ANDROID_CLIENT.md) - Android implementation guide
- [iOS Implementation](mobile/IOS_IMPLEMENTATION_GUIDE.md) - iOS implementation guide
- [Capacitor Plugin](mobile/CAPACITOR_PLUGIN.md) - Plugin development guide
- [Cross-Platform Compatibility](mobile/CROSS_PLATFORM_COMPATIBILITY.md) - Platform compatibility

## Documentation Structure

```
docs/
├── README.md                    # This file
├── architecture.md              # System architecture
├── SECURITY.md                  # Security documentation
├── performance/                 # Performance optimization
│   ├── PERFORMANCE_OPTIMIZATION.md
│   ├── MIGRATION_GUIDE.md
│   ├── LOG_LEVEL_2_ANALYSIS.md
│   └── CHANGES.md
├── deployment/                  # Deployment guides
│   ├── BUILD.md
│   └── DEPLOYMENT.md
└── mobile/                      # Mobile platform docs
    ├── ANDROID_CLIENT.md
    ├── IOS_IMPLEMENTATION_GUIDE.md
    ├── CAPACITOR_PLUGIN.md
    └── CROSS_PLATFORM_COMPATIBILITY.md
```

## Key Topics

### Performance Optimization

The server has been optimized for production use with lazy evaluation and conditional logging:

- **8× faster throughput** (100 → 800 pkt/s)
- **8× lower latency** (10ms → 1.2ms)
- **3× lower CPU usage** (90% → 30%)
- **280× less log data** (14 GB/hr → 50 MB/hr)

See [Performance Optimization Guide](performance/PERFORMANCE_OPTIMIZATION.md) for details.

### Log Levels

```
0 = TRACE  - Test logs with hex dumps (SLOW - debugging only)
1 = DEBUG  - Detailed logs without expensive operations
2 = INFO   - Production recommended ⭐
3 = WARN   - Minimal logging
4 = ERROR  - Errors only
```

**Production**: Use `LOG_LEVEL=2` or `LOG_LEVEL=3`

### Architecture Overview

morphProtocol uses a multi-layer obfuscation approach:

1. **Obfuscation Engine** - 11 reversible transformation functions
2. **Encryption Layer** - AES-256-CBC with RSA key exchange
3. **Protocol Templates** - Mimic legitimate protocols (QUIC, KCP, Gaming)
4. **Transport Layer** - UDP with session management

See [Architecture Guide](architecture.md) for detailed design.

### Mobile Platforms

Full support for Android and iOS via Capacitor plugins:

- **Android**: Kotlin implementation with native UDP
- **iOS**: Swift implementation with native UDP
- **Cross-platform**: Shared obfuscation logic

See [Mobile Documentation](mobile/) for platform-specific guides.

## Contributing

When adding documentation:

1. Place files in appropriate subdirectory
2. Update this README with links
3. Use clear, concise language
4. Include code examples where helpful
5. Follow existing formatting conventions

## Support

For questions or issues:
- Open a GitHub issue
- Check existing documentation first
- Provide relevant logs and configuration
