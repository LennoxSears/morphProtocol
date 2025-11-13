package com.morphprotocol.client.core.templates

import java.nio.ByteBuffer

/**
 * Base interface for protocol templates.
 * Templates encapsulate obfuscated data to mimic legitimate protocols.
 */
interface ProtocolTemplate {
    /**
     * Template ID (1=QUIC, 2=KCP, 3=Generic Gaming)
     */
    val id: Int
    
    /**
     * Template name
     */
    val name: String
    
    /**
     * Encapsulate data with protocol-specific header.
     * @param data The obfuscated data to encapsulate
     * @param clientID 16-byte client identifier
     * @return Complete packet with protocol header + data
     */
    fun encapsulate(data: ByteArray, clientID: ByteArray): ByteArray
    
    /**
     * Decapsulate packet and extract data.
     * @param packet Complete packet with protocol header
     * @return Obfuscated data without protocol header, or null if invalid
     */
    fun decapsulate(packet: ByteArray): ByteArray?
    
    /**
     * Extract header ID from packet (for dual indexing).
     * @param packet Complete packet
     * @return Header ID bytes, or null if invalid
     */
    fun extractHeaderID(packet: ByteArray): ByteArray?
    
    /**
     * Update internal state (sequence numbers, timestamps, etc.)
     */
    fun updateState()
    
    /**
     * Get template-specific parameters for handshake.
     */
    fun getParams(): Map<String, Any>
}

/**
 * QUIC Protocol Template (ID: 1)
 * Mimics QUIC protocol packets for DPI resistance.
 * 
 * Header format (11 bytes):
 * [1 byte flags][8 bytes connection ID][2 bytes packet number]
 */
class QuicTemplate : ProtocolTemplate {
    override val id = 1
    override val name = "QUIC"
    
    private var packetNumber = (Math.random() * 65536).toInt()
    
    override fun encapsulate(data: ByteArray, clientID: ByteArray): ByteArray {
        val packet = ByteArray(11 + data.size)
        
        // Flags byte (0x40-0x4F for long header)
        packet[0] = (0x40 + (Math.random() * 16).toInt()).toByte()
        
        // Connection ID (8 bytes from clientID)
        System.arraycopy(clientID, 0, packet, 1, 8)
        
        // Packet number (2 bytes)
        packet[9] = (packetNumber shr 8).toByte()
        packet[10] = (packetNumber and 0xFF).toByte()
        
        // Data
        System.arraycopy(data, 0, packet, 11, data.size)
        
        return packet
    }
    
    override fun decapsulate(packet: ByteArray): ByteArray? {
        if (packet.size < 11) return null
        
        // Verify flags byte is in QUIC range
        val flags = packet[0].toInt() and 0xFF
        if (flags < 0x40 || flags > 0x4F) return null
        
        return packet.copyOfRange(11, packet.size)
    }
    
    override fun extractHeaderID(packet: ByteArray): ByteArray? {
        if (packet.size < 9) return null
        return packet.copyOfRange(1, 9) // 8-byte connection ID
    }
    
    override fun updateState() {
        packetNumber = (packetNumber + 1) % 65536
    }
    
    override fun getParams(): Map<String, Any> {
        return mapOf("initialSeq" to packetNumber)
    }
}

/**
 * KCP Protocol Template (ID: 2)
 * Mimics KCP protocol packets for DPI resistance.
 * 
 * Header format (24 bytes):
 * [4 bytes conv][1 byte cmd][1 byte frg][2 bytes wnd][4 bytes ts][4 bytes sn][4 bytes una][4 bytes len]
 */
class KcpTemplate : ProtocolTemplate {
    override val id = 2
    override val name = "KCP"
    
    private var sequenceNumber = (Math.random() * 4294967296.0).toLong()
    private var timestamp = System.currentTimeMillis().toInt()
    
    override fun encapsulate(data: ByteArray, clientID: ByteArray): ByteArray {
        val packet = ByteArray(24 + data.size)
        val buffer = ByteBuffer.wrap(packet)
        
        // Conv (4 bytes from clientID)
        buffer.putInt(ByteBuffer.wrap(clientID, 0, 4).int)
        
        // Cmd (1 byte) - 0x51 for data packet
        buffer.put(0x51.toByte())
        
        // Frg (1 byte) - 0 for no fragmentation
        buffer.put(0x00.toByte())
        
        // Wnd (2 bytes) - window size 256
        buffer.putShort(256)
        
        // Ts (4 bytes) - timestamp
        buffer.putInt(timestamp)
        
        // Sn (4 bytes) - sequence number
        buffer.putInt(sequenceNumber.toInt())
        
        // Una (4 bytes) - unacknowledged = sn - 1
        buffer.putInt((sequenceNumber - 1).toInt())
        
        // Len (4 bytes) - payload length
        buffer.putInt(data.size)
        
        // Data
        buffer.put(data)
        
        return packet
    }
    
    override fun decapsulate(packet: ByteArray): ByteArray? {
        if (packet.size < 24) return null
        return packet.copyOfRange(24, packet.size)
    }
    
    override fun extractHeaderID(packet: ByteArray): ByteArray? {
        if (packet.size < 4) return null
        return packet.copyOfRange(0, 4) // 4-byte conv
    }
    
    override fun updateState() {
        sequenceNumber++
        timestamp = System.currentTimeMillis().toInt()
    }
    
    override fun getParams(): Map<String, Any> {
        return mapOf(
            "initialSeq" to sequenceNumber,
            "initialTs" to timestamp
        )
    }
}

/**
 * Generic Gaming Protocol Template (ID: 3)
 * Mimics generic gaming protocol packets for DPI resistance.
 * 
 * Header format (12 bytes):
 * [4 bytes magic "GAME"][4 bytes session ID][2 bytes sequence][1 byte type][1 byte flags]
 */
class GenericGamingTemplate : ProtocolTemplate {
    override val id = 3
    override val name = "Generic Gaming"
    
    private var sequenceNumber = (Math.random() * 65536).toInt()
    
    override fun encapsulate(data: ByteArray, clientID: ByteArray): ByteArray {
        val packet = ByteArray(12 + data.size)
        
        // Magic bytes "GAME"
        packet[0] = 'G'.code.toByte()
        packet[1] = 'A'.code.toByte()
        packet[2] = 'M'.code.toByte()
        packet[3] = 'E'.code.toByte()
        
        // Session ID (4 bytes from clientID)
        System.arraycopy(clientID, 0, packet, 4, 4)
        
        // Sequence number (2 bytes)
        packet[8] = (sequenceNumber shr 8).toByte()
        packet[9] = (sequenceNumber and 0xFF).toByte()
        
        // Packet type (1 byte) - random 0x01-0x05
        packet[10] = (0x01 + (Math.random() * 5).toInt()).toByte()
        
        // Flags (1 byte) - random
        packet[11] = (Math.random() * 256).toInt().toByte()
        
        // Data
        System.arraycopy(data, 0, packet, 12, data.size)
        
        return packet
    }
    
    override fun decapsulate(packet: ByteArray): ByteArray? {
        if (packet.size < 12) return null
        
        // Verify magic bytes
        if (packet[0] != 'G'.code.toByte() ||
            packet[1] != 'A'.code.toByte() ||
            packet[2] != 'M'.code.toByte() ||
            packet[3] != 'E'.code.toByte()) {
            return null
        }
        
        return packet.copyOfRange(12, packet.size)
    }
    
    override fun extractHeaderID(packet: ByteArray): ByteArray? {
        if (packet.size < 8) return null
        
        // Verify magic bytes
        if (packet[0] != 'G'.code.toByte() ||
            packet[1] != 'A'.code.toByte() ||
            packet[2] != 'M'.code.toByte() ||
            packet[3] != 'E'.code.toByte()) {
            return null
        }
        
        return packet.copyOfRange(4, 8) // 4-byte session ID
    }
    
    override fun updateState() {
        sequenceNumber = (sequenceNumber + 1) % 65536
    }
    
    override fun getParams(): Map<String, Any> {
        return mapOf("initialSeq" to sequenceNumber)
    }
}

/**
 * Factory for creating protocol templates.
 */
object TemplateFactory {
    fun createTemplate(templateId: Int): ProtocolTemplate {
        return when (templateId) {
            1 -> QuicTemplate()
            2 -> KcpTemplate()
            3 -> GenericGamingTemplate()
            else -> throw IllegalArgumentException("Unknown template ID: $templateId")
        }
    }
}

/**
 * Selector for choosing random protocol templates.
 * Weighted selection: QUIC (40%), KCP (35%), Generic Gaming (25%)
 */
object TemplateSelector {
    private val weights = mapOf(
        1 to 40,  // QUIC
        2 to 35,  // KCP
        3 to 25   // Generic Gaming
    )
    
    fun selectRandomTemplate(): Int {
        val random = (Math.random() * 100).toInt()
        var cumulative = 0
        
        for ((templateId, weight) in weights) {
            cumulative += weight
            if (random < cumulative) {
                return templateId
            }
        }
        
        return 1 // Default to QUIC
    }
}
