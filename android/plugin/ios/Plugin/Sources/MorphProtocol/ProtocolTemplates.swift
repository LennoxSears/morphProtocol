import Foundation

/// Protocol template interface
protocol ProtocolTemplate {
    var id: Int { get }
    var name: String { get }
    
    func encapsulate(_ data: Data, clientID: Data) -> Data
    func decapsulate(_ packet: Data) -> Data?
    func extractHeaderID(_ packet: Data) -> Data?
    func updateState()
    func getParams() -> [String: Any]
}

/// QUIC Protocol Template (ID: 1)
class QuicTemplate: ProtocolTemplate {
    let id = 1
    let name = "QUIC"
    
    private var packetNumber: UInt16
    
    init() {
        self.packetNumber = UInt16.random(in: 0...65535)
    }
    
    func encapsulate(_ data: Data, clientID: Data) -> Data {
        var packet = Data(count: 11 + data.count)
        
        // Flags byte (0x40-0x4F for long header)
        packet[0] = UInt8.random(in: 0x40...0x4F)
        
        // Connection ID (8 bytes from clientID)
        packet.replaceSubrange(1..<9, with: clientID.prefix(8))
        
        // Packet number (2 bytes)
        packet[9] = UInt8(packetNumber >> 8)
        packet[10] = UInt8(packetNumber & 0xFF)
        
        // Data
        packet.replaceSubrange(11..<packet.count, with: data)
        
        return packet
    }
    
    func decapsulate(_ packet: Data) -> Data? {
        guard packet.count >= 11 else { return nil }
        
        // Verify flags byte is in QUIC range
        let flags = packet[0]
        guard flags >= 0x40 && flags <= 0x4F else { return nil }
        
        return packet.subdata(in: 11..<packet.count)
    }
    
    func extractHeaderID(_ packet: Data) -> Data? {
        guard packet.count >= 9 else { return nil }
        return packet.subdata(in: 1..<9)
    }
    
    func updateState() {
        packetNumber = (packetNumber + 1) % 65536
    }
    
    func getParams() -> [String: Any] {
        return ["initialSeq": packetNumber]
    }
}

/// KCP Protocol Template (ID: 2)
class KcpTemplate: ProtocolTemplate {
    let id = 2
    let name = "KCP"
    
    private var sequenceNumber: UInt32
    private var timestamp: UInt32
    
    init() {
        self.sequenceNumber = UInt32.random(in: 0...UInt32.max)
        self.timestamp = UInt32(Date().timeIntervalSince1970 * 1000)
    }
    
    func encapsulate(_ data: Data, clientID: Data) -> Data {
        var packet = Data(count: 24 + data.count)
        
        // Conv (4 bytes from clientID)
        packet.replaceSubrange(0..<4, with: clientID.prefix(4))
        
        // Cmd (1 byte) - 0x51 for data packet
        packet[4] = 0x51
        
        // Frg (1 byte) - 0 for no fragmentation
        packet[5] = 0x00
        
        // Wnd (2 bytes) - window size 256
        packet[6] = 0x01
        packet[7] = 0x00
        
        // Ts (4 bytes) - timestamp
        withUnsafeBytes(of: timestamp.bigEndian) { bytes in
            packet.replaceSubrange(8..<12, with: bytes)
        }
        
        // Sn (4 bytes) - sequence number
        withUnsafeBytes(of: sequenceNumber.bigEndian) { bytes in
            packet.replaceSubrange(12..<16, with: bytes)
        }
        
        // Una (4 bytes) - unacknowledged = sn - 1
        let una = sequenceNumber &- 1
        withUnsafeBytes(of: una.bigEndian) { bytes in
            packet.replaceSubrange(16..<20, with: bytes)
        }
        
        // Len (4 bytes) - payload length
        let len = UInt32(data.count)
        withUnsafeBytes(of: len.bigEndian) { bytes in
            packet.replaceSubrange(20..<24, with: bytes)
        }
        
        // Data
        packet.replaceSubrange(24..<packet.count, with: data)
        
        return packet
    }
    
    func decapsulate(_ packet: Data) -> Data? {
        guard packet.count >= 24 else { return nil }
        return packet.subdata(in: 24..<packet.count)
    }
    
    func extractHeaderID(_ packet: Data) -> Data? {
        guard packet.count >= 4 else { return nil }
        return packet.prefix(4)
    }
    
    func updateState() {
        sequenceNumber = sequenceNumber &+ 1
        timestamp = UInt32(Date().timeIntervalSince1970 * 1000)
    }
    
    func getParams() -> [String: Any] {
        return [
            "initialSeq": sequenceNumber,
            "initialTs": timestamp
        ]
    }
}

/// Generic Gaming Protocol Template (ID: 3)
class GenericGamingTemplate: ProtocolTemplate {
    let id = 3
    let name = "Generic Gaming"
    
    private var sequenceNumber: UInt16
    
    init() {
        self.sequenceNumber = UInt16.random(in: 0...65535)
    }
    
    func encapsulate(_ data: Data, clientID: Data) -> Data {
        var packet = Data(count: 12 + data.count)
        
        // Magic bytes "GAME"
        packet[0] = UInt8(ascii: "G")
        packet[1] = UInt8(ascii: "A")
        packet[2] = UInt8(ascii: "M")
        packet[3] = UInt8(ascii: "E")
        
        // Session ID (4 bytes from clientID)
        packet.replaceSubrange(4..<8, with: clientID.prefix(4))
        
        // Sequence number (2 bytes)
        packet[8] = UInt8(sequenceNumber >> 8)
        packet[9] = UInt8(sequenceNumber & 0xFF)
        
        // Packet type (1 byte) - random 0x01-0x05
        packet[10] = UInt8.random(in: 0x01...0x05)
        
        // Flags (1 byte) - random
        packet[11] = UInt8.random(in: 0...255)
        
        // Data
        packet.replaceSubrange(12..<packet.count, with: data)
        
        return packet
    }
    
    func decapsulate(_ packet: Data) -> Data? {
        guard packet.count >= 12 else { return nil }
        
        // Verify magic bytes
        guard packet[0] == UInt8(ascii: "G"),
              packet[1] == UInt8(ascii: "A"),
              packet[2] == UInt8(ascii: "M"),
              packet[3] == UInt8(ascii: "E") else {
            return nil
        }
        
        return packet.subdata(in: 12..<packet.count)
    }
    
    func extractHeaderID(_ packet: Data) -> Data? {
        guard packet.count >= 8 else { return nil }
        
        // Verify magic bytes
        guard packet[0] == UInt8(ascii: "G"),
              packet[1] == UInt8(ascii: "A"),
              packet[2] == UInt8(ascii: "M"),
              packet[3] == UInt8(ascii: "E") else {
            return nil
        }
        
        return packet.subdata(in: 4..<8)
    }
    
    func updateState() {
        sequenceNumber = (sequenceNumber + 1) % 65536
    }
    
    func getParams() -> [String: Any] {
        return ["initialSeq": sequenceNumber]
    }
}

/// Template Factory
class TemplateFactory {
    static func createTemplate(id: Int) -> ProtocolTemplate? {
        switch id {
        case 1:
            return QuicTemplate()
        case 2:
            return KcpTemplate()
        case 3:
            return GenericGamingTemplate()
        default:
            return nil
        }
    }
}

/// Template Selector
class TemplateSelector {
    static func selectRandomTemplate() -> Int {
        let random = Int.random(in: 0..<100)
        
        if random < 40 {
            return 1  // QUIC (40%)
        } else if random < 75 {
            return 2  // KCP (35%)
        } else {
            return 3  // Generic Gaming (25%)
        }
    }
}
