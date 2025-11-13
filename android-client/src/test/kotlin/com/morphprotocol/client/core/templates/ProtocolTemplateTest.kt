package com.morphprotocol.client.core.templates

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import java.security.SecureRandom

class ProtocolTemplateTest {
    private val clientID = ByteArray(16).apply { SecureRandom().nextBytes(this) }
    
    @Test
    fun `test QuicTemplate encapsulate and decapsulate`() {
        val template = QuicTemplate()
        val data = "Hello, QUIC!".toByteArray()
        
        val packet = template.encapsulate(data, clientID)
        val extracted = template.decapsulate(packet)
        
        assertNotNull(extracted)
        assertArrayEquals(data, extracted)
    }
    
    @Test
    fun `test QuicTemplate header structure`() {
        val template = QuicTemplate()
        val data = "Test".toByteArray()
        
        val packet = template.encapsulate(data, clientID)
        
        // Should have 11-byte header + data
        assertEquals(11 + data.size, packet.size)
        
        // Flags byte should be in range 0x40-0x4F
        val flags = packet[0].toInt() and 0xFF
        assertTrue(flags in 0x40..0x4F)
    }
    
    @Test
    fun `test QuicTemplate extractHeaderID`() {
        val template = QuicTemplate()
        val data = "Test".toByteArray()
        
        val packet = template.encapsulate(data, clientID)
        val headerID = template.extractHeaderID(packet)
        
        assertNotNull(headerID)
        assertEquals(8, headerID!!.size)
        assertArrayEquals(clientID.copyOfRange(0, 8), headerID)
    }
    
    @Test
    fun `test KcpTemplate encapsulate and decapsulate`() {
        val template = KcpTemplate()
        val data = "Hello, KCP!".toByteArray()
        
        val packet = template.encapsulate(data, clientID)
        val extracted = template.decapsulate(packet)
        
        assertNotNull(extracted)
        assertArrayEquals(data, extracted)
    }
    
    @Test
    fun `test KcpTemplate header structure`() {
        val template = KcpTemplate()
        val data = "Test".toByteArray()
        
        val packet = template.encapsulate(data, clientID)
        
        // Should have 24-byte header + data
        assertEquals(24 + data.size, packet.size)
        
        // Cmd byte should be 0x51
        assertEquals(0x51.toByte(), packet[4])
    }
    
    @Test
    fun `test KcpTemplate extractHeaderID`() {
        val template = KcpTemplate()
        val data = "Test".toByteArray()
        
        val packet = template.encapsulate(data, clientID)
        val headerID = template.extractHeaderID(packet)
        
        assertNotNull(headerID)
        assertEquals(4, headerID!!.size)
    }
    
    @Test
    fun `test GenericGamingTemplate encapsulate and decapsulate`() {
        val template = GenericGamingTemplate()
        val data = "Hello, Gaming!".toByteArray()
        
        val packet = template.encapsulate(data, clientID)
        val extracted = template.decapsulate(packet)
        
        assertNotNull(extracted)
        assertArrayEquals(data, extracted)
    }
    
    @Test
    fun `test GenericGamingTemplate header structure`() {
        val template = GenericGamingTemplate()
        val data = "Test".toByteArray()
        
        val packet = template.encapsulate(data, clientID)
        
        // Should have 12-byte header + data
        assertEquals(12 + data.size, packet.size)
        
        // Magic bytes should be "GAME"
        assertEquals('G'.code.toByte(), packet[0])
        assertEquals('A'.code.toByte(), packet[1])
        assertEquals('M'.code.toByte(), packet[2])
        assertEquals('E'.code.toByte(), packet[3])
    }
    
    @Test
    fun `test GenericGamingTemplate extractHeaderID`() {
        val template = GenericGamingTemplate()
        val data = "Test".toByteArray()
        
        val packet = template.encapsulate(data, clientID)
        val headerID = template.extractHeaderID(packet)
        
        assertNotNull(headerID)
        assertEquals(4, headerID!!.size)
        assertArrayEquals(clientID.copyOfRange(0, 4), headerID)
    }
    
    @Test
    fun `test all templates with empty data`() {
        val templates = listOf(QuicTemplate(), KcpTemplate(), GenericGamingTemplate())
        val empty = ByteArray(0)
        
        for (template in templates) {
            val packet = template.encapsulate(empty, clientID)
            val extracted = template.decapsulate(packet)
            
            assertNotNull(extracted, "Failed for ${template.name}")
            assertEquals(0, extracted!!.size, "Failed for ${template.name}")
        }
    }
    
    @Test
    fun `test all templates with large data`() {
        val templates = listOf(QuicTemplate(), KcpTemplate(), GenericGamingTemplate())
        val large = ByteArray(1500) { it.toByte() }
        
        for (template in templates) {
            val packet = template.encapsulate(large, clientID)
            val extracted = template.decapsulate(packet)
            
            assertNotNull(extracted, "Failed for ${template.name}")
            assertArrayEquals(large, extracted, "Failed for ${template.name}")
        }
    }
    
    @Test
    fun `test updateState increments sequence numbers`() {
        val template = QuicTemplate()
        val params1 = template.getParams()
        
        template.updateState()
        val params2 = template.getParams()
        
        assertNotEquals(params1["initialSeq"], params2["initialSeq"])
    }
    
    @Test
    fun `test TemplateFactory creates correct templates`() {
        val quic = TemplateFactory.createTemplate(1)
        val kcp = TemplateFactory.createTemplate(2)
        val gaming = TemplateFactory.createTemplate(3)
        
        assertEquals(1, quic.id)
        assertEquals(2, kcp.id)
        assertEquals(3, gaming.id)
        
        assertEquals("QUIC", quic.name)
        assertEquals("KCP", kcp.name)
        assertEquals("Generic Gaming", gaming.name)
    }
    
    @Test
    fun `test TemplateSelector returns valid template IDs`() {
        val ids = mutableSetOf<Int>()
        
        repeat(100) {
            val id = TemplateSelector.selectRandomTemplate()
            ids.add(id)
            assertTrue(id in 1..3, "Invalid template ID: $id")
        }
        
        // Should have selected multiple different templates
        assertTrue(ids.size > 1, "Should select different templates")
    }
}
