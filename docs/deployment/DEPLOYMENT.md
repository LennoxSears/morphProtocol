# morphProtocol Server Deployment Guide

## Crash Prevention Features

The server now includes comprehensive crash prevention mechanisms:

### 1. Global Error Handlers
- **Uncaught Exceptions**: Logged but don't crash the server
- **Unhandled Promise Rejections**: Logged but don't crash the server
- **Signal Handlers**: Graceful shutdown on SIGTERM/SIGINT

### 2. UDP Server Error Handling
- Socket errors are caught and logged
- Server continues running even if individual packets fail
- All message handlers wrapped in try-catch

### 3. Graceful Shutdown
- Notifies all connected clients
- Closes all active sessions
- Cleans up resources (maps, sockets)
- 5-second timeout for forced shutdown

### 4. Health Check Endpoint
- HTTP server on port 8080 (configurable)
- `GET /health` - Returns server status
- `GET /metrics` - Returns uptime, memory, CPU usage

### 5. Session Management
- Automatic cleanup of inactive sessions
- Memory leak prevention
- Proper resource disposal

---

## Deployment Options

### Option 1: Direct Node.js (Development)

```bash
# Build
npm run build

# Start server
npm start

# Health check
curl http://localhost:8080/health
```

### Option 2: Process Monitor (Recommended for Production)

The monitor script automatically restarts the server if it becomes unresponsive:

```bash
# Start with monitor
./scripts/monitor.sh

# Configure via environment variables
HEALTH_CHECK_URL=http://localhost:8080/health \
CHECK_INTERVAL=30 \
MAX_FAILURES=3 \
LOG_FILE=/var/log/morphprotocol/monitor.log \
./scripts/monitor.sh
```

**Monitor Features**:
- Health checks every 30 seconds (configurable)
- Restarts server after 3 failed checks (configurable)
- Logs all events
- Graceful shutdown on SIGTERM/SIGINT

### Option 3: systemd Service (Production Linux)

```bash
# Copy service file
sudo cp scripts/morphprotocol.service /etc/systemd/system/

# Create user
sudo useradd -r -s /bin/false morphprotocol

# Create directories
sudo mkdir -p /opt/morphprotocol
sudo mkdir -p /var/log/morphprotocol
sudo chown morphprotocol:morphprotocol /var/log/morphprotocol

# Deploy application
sudo cp -r dist /opt/morphprotocol/
sudo cp package.json /opt/morphprotocol/
sudo chown -R morphprotocol:morphprotocol /opt/morphprotocol

# Install dependencies
cd /opt/morphprotocol && sudo -u morphprotocol npm install --production

# Enable and start service
sudo systemctl enable morphprotocol
sudo systemctl start morphprotocol

# Check status
sudo systemctl status morphprotocol

# View logs
sudo journalctl -u morphprotocol -f
```

**systemd Features**:
- Automatic restart on crash
- 10-second restart delay
- Security hardening (NoNewPrivileges, PrivateTmp, etc.)
- Resource limits (65536 file descriptors)
- Integrated with system logging

### Option 4: Docker (Containerized)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY dist ./dist

EXPOSE 3478/udp
EXPOSE 8080/tcp

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "dist/server.js"]
```

```bash
# Build
docker build -t morphprotocol .

# Run
docker run -d \
  --name morphprotocol \
  --restart unless-stopped \
  -p 3478:3478/udp \
  -p 8080:8080/tcp \
  morphprotocol

# Check health
docker exec morphprotocol wget -qO- http://localhost:8080/health
```

### Option 5: PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/server.js --name morphprotocol

# Configure auto-restart
pm2 startup
pm2 save

# Monitor
pm2 monit

# Logs
pm2 logs morphprotocol
```

---

## Monitoring

### Health Check

```bash
# Check if server is healthy
curl http://localhost:8080/health

# Response:
{
  "status": "healthy",
  "uptime": 3600.5,
  "memory": {
    "rss": 52428800,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1048576
  },
  "timestamp": "2025-11-28T03:00:00.000Z"
}
```

### Metrics

```bash
# Get server metrics
curl http://localhost:8080/metrics

# Response:
{
  "uptime": 3600.5,
  "memory": { ... },
  "cpu": {
    "user": 1000000,
    "system": 500000
  },
  "timestamp": "2025-11-28T03:00:00.000Z"
}
```

### Prometheus Integration (Optional)

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'morphprotocol'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics'
```

---

## Troubleshooting

### Server Won't Start

1. Check if port is already in use:
   ```bash
   sudo lsof -i :3478
   sudo lsof -i :8080
   ```

2. Check logs:
   ```bash
   # systemd
   sudo journalctl -u morphprotocol -n 100
   
   # PM2
   pm2 logs morphprotocol
   
   # Monitor script
   tail -f /var/log/morphprotocol/monitor.log
   ```

### Server Crashes

The server should NOT crash due to:
- Uncaught exceptions (logged and handled)
- Unhandled promise rejections (logged and handled)
- UDP socket errors (logged and handled)
- Invalid packets (caught in try-catch)

If crashes persist:
1. Check system resources (memory, CPU)
2. Review error logs
3. Ensure Node.js version is 18+ (recommended 20+)

### High Memory Usage

1. Check active sessions:
   ```bash
   # Add to health check endpoint if needed
   curl http://localhost:8080/metrics
   ```

2. Sessions are automatically cleaned up after inactivity
3. Restart server if memory leak suspected:
   ```bash
   sudo systemctl restart morphprotocol
   # or
   pm2 restart morphprotocol
   ```

---

## Security Recommendations

1. **Firewall**: Only expose UDP port 3478 and HTTP port 8080 (for health checks)
2. **Rate Limiting**: Already implemented in server
3. **DDoS Protection**: Use external DDoS protection service
4. **Updates**: Keep Node.js and dependencies updated
5. **Monitoring**: Set up alerts for health check failures

---

## Performance Tuning

### System Limits

```bash
# Increase file descriptor limit
ulimit -n 65536

# For systemd, already configured in service file
```

### Node.js Options

```bash
# Increase memory limit if needed
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

---

## Backup and Recovery

### Configuration Backup

```bash
# Backup .env and config files
tar -czf morphprotocol-config-$(date +%Y%m%d).tar.gz .env src/config/
```

### Database Backup (if applicable)

```bash
# Backup session data if persisted
# (Currently sessions are in-memory only)
```

---

## Conclusion

With these crash prevention features, the morphProtocol server is:
- ✅ Resilient to uncaught errors
- ✅ Self-healing with automatic restarts
- ✅ Monitorable via health checks
- ✅ Production-ready with multiple deployment options

Choose the deployment option that best fits your infrastructure.
