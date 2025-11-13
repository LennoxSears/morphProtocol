<template>
  <div class="container">
    <div class="header">
      <h1>🔒 MorphProtocol VPN</h1>
      <p>Secure VPN with Advanced Obfuscation</p>
    </div>

    <!-- Status Card -->
    <div class="card">
      <div :class="['status-indicator', statusClass]">
        <div :class="['status-dot', statusClass]"></div>
        <span>{{ statusText }}</span>
      </div>

      <div v-if="connected" class="info-grid">
        <div class="info-item">
          <label>Client ID</label>
          <value>{{ clientId || 'N/A' }}</value>
        </div>
        <div class="info-item">
          <label>Server Port</label>
          <value>{{ serverPort || 'N/A' }}</value>
        </div>
      </div>
    </div>

    <!-- Connection Form -->
    <div class="card">
      <h2>Connection Settings</h2>

      <div class="form-group">
        <label>Server Address</label>
        <input
          v-model="config.remoteAddress"
          type="text"
          placeholder="vpn.example.com"
          :disabled="connected || connecting"
        />
        <small>Server hostname or IP address</small>
      </div>

      <div class="form-group">
        <label>Server Port</label>
        <input
          v-model.number="config.remotePort"
          type="number"
          placeholder="12301"
          :disabled="connected || connecting"
        />
        <small>Server handshake port</small>
      </div>

      <div class="form-group">
        <label>User ID</label>
        <input
          v-model="config.userId"
          type="text"
          placeholder="user123"
          :disabled="connected || connecting"
        />
        <small>Your user identifier</small>
      </div>

      <div class="form-group">
        <label>Encryption Key</label>
        <input
          v-model="config.encryptionKey"
          type="text"
          placeholder="base64key:base64iv"
          :disabled="connected || connecting"
        />
        <small>Encryption key from server (format: base64key:base64iv)</small>
      </div>

      <!-- Advanced Settings -->
      <div class="advanced-settings">
        <div class="advanced-toggle" @click="showAdvanced = !showAdvanced">
          <span>Advanced Settings</span>
          <span>{{ showAdvanced ? '▼' : '▶' }}</span>
        </div>

        <div v-if="showAdvanced" class="advanced-content">
          <div class="preset-buttons">
            <button class="btn-secondary" @click="applyPreset('default')" :disabled="connected || connecting">
              Default
            </button>
            <button class="btn-secondary" @click="applyPreset('highSecurity')" :disabled="connected || connecting">
              High Security
            </button>
            <button class="btn-secondary" @click="applyPreset('lowLatency')" :disabled="connected || connecting">
              Low Latency
            </button>
          </div>

          <div class="form-group">
            <label>Obfuscation Layers (1-4)</label>
            <input
              v-model.number="config.obfuscationLayer"
              type="number"
              min="1"
              max="4"
              :disabled="connected || connecting"
            />
            <small>More layers = better obfuscation, slightly higher latency</small>
          </div>

          <div class="form-group">
            <label>Padding Length (1-8)</label>
            <input
              v-model.number="config.paddingLength"
              type="number"
              min="1"
              max="8"
              :disabled="connected || connecting"
            />
            <small>Random padding to prevent packet size analysis</small>
          </div>

          <div class="form-group">
            <label>Heartbeat Interval (ms)</label>
            <input
              v-model.number="config.heartbeatInterval"
              type="number"
              :disabled="connected || connecting"
            />
            <small>How often to send heartbeat packets (default: 120000ms / 2 minutes)</small>
          </div>

          <div class="form-group">
            <label>Inactivity Timeout (ms)</label>
            <input
              v-model.number="config.inactivityTimeout"
              type="number"
              :disabled="connected || connecting"
            />
            <small>Reconnect if no data received (default: 30000ms / 30 seconds)</small>
          </div>

          <div class="form-group">
            <label>Local WireGuard Address</label>
            <input
              v-model="config.localWgAddress"
              type="text"
              :disabled="connected || connecting"
            />
          </div>

          <div class="form-group">
            <label>Local WireGuard Port</label>
            <input
              v-model.number="config.localWgPort"
              type="number"
              :disabled="connected || connecting"
            />
          </div>
        </div>
      </div>

      <div class="button-group">
        <button
          class="btn-primary"
          @click="connect"
          :disabled="connected || connecting || !isConfigValid"
        >
          {{ connecting ? 'Connecting...' : 'Connect' }}
        </button>
        <button
          class="btn-danger"
          @click="disconnect"
          :disabled="!connected && !connecting"
        >
          Disconnect
        </button>
        <button
          class="btn-secondary"
          @click="refreshStatus"
        >
          Refresh
        </button>
      </div>
    </div>

    <!-- Logs Card -->
    <div class="card">
      <h2>Connection Logs</h2>
      <div class="logs">
        <div
          v-for="(log, index) in logs"
          :key="index"
          :class="['log-entry', log.type]"
        >
          <span class="log-time">{{ log.time }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
        <div v-if="logs.length === 0" class="log-entry">
          <span class="log-message">No logs yet...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { vpnService, VpnConfig } from './services/vpn.service';

// State
const connected = ref(false);
const connecting = ref(false);
const clientId = ref<string | null>(null);
const serverPort = ref<number | null>(null);
const showAdvanced = ref(false);

// Configuration
const config = ref<VpnConfig>({
  remoteAddress: '',
  remotePort: 12301,
  userId: '',
  encryptionKey: '',
  localWgAddress: '127.0.0.1',
  localWgPort: 51820,
  obfuscationLayer: 3,
  paddingLength: 8,
  heartbeatInterval: 120000,
  inactivityTimeout: 30000,
  maxRetries: 10,
  handshakeInterval: 5000,
  password: 'bumoyu123',
});

// Logs
interface Log {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

const logs = ref<Log[]>([]);

// Computed
const statusClass = computed(() => {
  if (connecting.value) return 'connecting';
  return connected.value ? 'connected' : 'disconnected';
});

const statusText = computed(() => {
  if (connecting.value) return 'Connecting...';
  return connected.value ? 'Connected' : 'Disconnected';
});

const isConfigValid = computed(() => {
  return (
    config.value.remoteAddress.length > 0 &&
    config.value.remotePort > 0 &&
    config.value.userId.length > 0 &&
    config.value.encryptionKey.length > 0
  );
});

// Methods
function addLog(message: string, type: Log['type'] = 'info') {
  const time = new Date().toLocaleTimeString();
  logs.value.push({ time, message, type });
  
  // Keep only last 50 logs
  if (logs.value.length > 50) {
    logs.value.shift();
  }
}

async function connect() {
  if (!isConfigValid.value) {
    addLog('Please fill in all required fields', 'error');
    return;
  }

  connecting.value = true;
  addLog('Initiating connection...', 'info');

  try {
    await vpnService.connect(config.value);
    connected.value = true;
    addLog('Connected successfully!', 'success');
    await refreshStatus();
  } catch (error: any) {
    addLog(`Connection failed: ${error.message}`, 'error');
    connecting.value = false;
  }
}

async function disconnect() {
  addLog('Disconnecting...', 'info');

  try {
    await vpnService.disconnect();
    connected.value = false;
    connecting.value = false;
    clientId.value = null;
    serverPort.value = null;
    addLog('Disconnected successfully', 'success');
  } catch (error: any) {
    addLog(`Disconnection failed: ${error.message}`, 'error');
  }
}

async function refreshStatus() {
  try {
    const status = await vpnService.getStatus();
    connected.value = status.connected;
    clientId.value = status.clientId || null;
    serverPort.value = status.serverPort || null;
    addLog(`Status: ${status.status}`, 'info');
  } catch (error: any) {
    addLog(`Failed to get status: ${error.message}`, 'error');
  }
}

function applyPreset(preset: 'default' | 'highSecurity' | 'lowLatency') {
  switch (preset) {
    case 'default':
      config.value.obfuscationLayer = 3;
      config.value.paddingLength = 8;
      config.value.heartbeatInterval = 120000;
      config.value.inactivityTimeout = 30000;
      addLog('Applied default preset', 'info');
      break;
    case 'highSecurity':
      config.value.obfuscationLayer = 4;
      config.value.paddingLength = 8;
      config.value.heartbeatInterval = 180000;
      config.value.inactivityTimeout = 60000;
      addLog('Applied high security preset', 'info');
      break;
    case 'lowLatency':
      config.value.obfuscationLayer = 1;
      config.value.paddingLength = 1;
      config.value.heartbeatInterval = 60000;
      config.value.inactivityTimeout = 15000;
      addLog('Applied low latency preset', 'info');
      break;
  }
}

// Lifecycle
onMounted(() => {
  addLog('MorphProtocol VPN Demo initialized', 'info');

  // Setup event listeners
  vpnService.addEventListener('connected', (event) => {
    connecting.value = false;
    connected.value = true;
    addLog(`Event: ${event.message}`, 'success');
  });

  vpnService.addEventListener('disconnected', (event) => {
    connected.value = false;
    connecting.value = false;
    addLog(`Event: ${event.message}`, 'warning');
  });

  vpnService.addEventListener('error', (event) => {
    connecting.value = false;
    addLog(`Error: ${event.message}`, 'error');
  });

  // Load saved config from localStorage
  const savedConfig = localStorage.getItem('morphprotocol-config');
  if (savedConfig) {
    try {
      const parsed = JSON.parse(savedConfig);
      config.value = { ...config.value, ...parsed };
      addLog('Loaded saved configuration', 'info');
    } catch (e) {
      addLog('Failed to load saved configuration', 'warning');
    }
  }

  // Check initial status
  refreshStatus();
});

onUnmounted(() => {
  // Save config to localStorage
  localStorage.setItem('morphprotocol-config', JSON.stringify(config.value));
  
  // Cleanup
  vpnService.removeAllListeners();
});
</script>
