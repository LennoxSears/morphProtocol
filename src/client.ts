#!/usr/bin/env node
import { startUdpClient } from './transport/udp/client';
import { logger } from './utils/logger';

const remoteAddress = process.argv[2];
const encryptionKey = process.argv[3];

if (!remoteAddress || !encryptionKey) {
  logger.error('Usage: node client.js <remote_address:port:userId> <encryption_key>');
  logger.error('Example: node client.js 192.168.1.100:12301:user123 "base64key:base64iv"');
  logger.error('');
  logger.error('The encryption key should be obtained from the server.');
  process.exit(1);
}

startUdpClient(remoteAddress, encryptionKey)
  .then((clientPort) => {
    logger.info(`UDP client started successfully on port ${clientPort}`);
  })
  .catch((error) => {
    logger.error('Failed to start UDP client:', error);
    process.exit(1);
  });
