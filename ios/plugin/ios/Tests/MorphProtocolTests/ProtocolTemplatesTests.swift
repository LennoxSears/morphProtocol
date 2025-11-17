import XCTest
@testable import MorphProtocol

class ProtocolTemplatesTests: XCTestCase {
    private var clientID: Data!
    
    override func setUp() {
        super.setUp()
        clientID = Data((0..<16).map { _ in UInt8.random(in: 0...255) })
    }
    
    func testQuicTemplateEncapsulateAndDecapsulate() {
        let template = QuicTemplate()
        let data = Data("Hello, QUIC!".utf8)
        
        let packet = template.encapsulate(data, clientID: clientID)
        let extracted = template.decapsulate(packet)
        
        XCTAssertNotNil(extracted)
        XCTAssertEqual(data, extracted)
    }
    
    func testQuicTemplateHeaderStructure() {
        let template = QuicTemplate()
        let data = Data("Test".utf8)
        
        let packet = template.encapsulate(data, clientID: clientID)
        
        // Should have 11-byte header + data
        XCTAssertEqual(11 + data.count, packet.count)
        
        // Flags byte should be in range 0x40-0x4F
        let flags = packet[0]
        XCTAssertTrue(flags >= 0x40 && flags <= 0x4F)
    }
    
    func testKcpTemplateEncapsulateAndDecapsulate() {
        let template = KcpTemplate()
        let data = Data("Hello, KCP!".utf8)
        
        let packet = template.encapsulate(data, clientID: clientID)
        let extracted = template.decapsulate(packet)
        
        XCTAssertNotNil(extracted)
        XCTAssertEqual(data, extracted)
    }
    
    func testKcpTemplateHeaderStructure() {
        let template = KcpTemplate()
        let data = Data("Test".utf8)
        
        let packet = template.encapsulate(data, clientID: clientID)
        
        // Should have 24-byte header + data
        XCTAssertEqual(24 + data.count, packet.count)
        
        // Cmd byte should be 0x51
        XCTAssertEqual(0x51, packet[4])
    }
    
    func testGenericGamingTemplateEncapsulateAndDecapsulate() {
        let template = GenericGamingTemplate()
        let data = Data("Hello, Gaming!".utf8)
        
        let packet = template.encapsulate(data, clientID: clientID)
        let extracted = template.decapsulate(packet)
        
        XCTAssertNotNil(extracted)
        XCTAssertEqual(data, extracted)
    }
    
    func testGenericGamingTemplateHeaderStructure() {
        let template = GenericGamingTemplate()
        let data = Data("Test".utf8)
        
        let packet = template.encapsulate(data, clientID: clientID)
        
        // Should have 12-byte header + data
        XCTAssertEqual(12 + data.count, packet.count)
        
        // Magic bytes should be "GAME"
        XCTAssertEqual(UInt8(ascii: "G"), packet[0])
        XCTAssertEqual(UInt8(ascii: "A"), packet[1])
        XCTAssertEqual(UInt8(ascii: "M"), packet[2])
        XCTAssertEqual(UInt8(ascii: "E"), packet[3])
    }
    
    func testAllTemplatesWithEmptyData() {
        let templates: [ProtocolTemplate] = [QuicTemplate(), KcpTemplate(), GenericGamingTemplate()]
        let empty = Data()
        
        for template in templates {
            let packet = template.encapsulate(empty, clientID: clientID)
            let extracted = template.decapsulate(packet)
            
            XCTAssertNotNil(extracted, "Failed for \(template.name)")
            XCTAssertEqual(0, extracted!.count, "Failed for \(template.name)")
        }
    }
    
    func testAllTemplatesWithLargeData() {
        let templates: [ProtocolTemplate] = [QuicTemplate(), KcpTemplate(), GenericGamingTemplate()]
        let large = Data((0..<1500).map { UInt8($0 % 256) })
        
        for template in templates {
            let packet = template.encapsulate(large, clientID: clientID)
            let extracted = template.decapsulate(packet)
            
            XCTAssertNotNil(extracted, "Failed for \(template.name)")
            XCTAssertEqual(large, extracted, "Failed for \(template.name)")
        }
    }
    
    func testTemplateFactoryCreatesCorrectTemplates() {
        let quic = TemplateFactory.createTemplate(id: 1)
        let kcp = TemplateFactory.createTemplate(id: 2)
        let gaming = TemplateFactory.createTemplate(id: 3)
        
        XCTAssertEqual(1, quic?.id)
        XCTAssertEqual(2, kcp?.id)
        XCTAssertEqual(3, gaming?.id)
        
        XCTAssertEqual("QUIC", quic?.name)
        XCTAssertEqual("KCP", kcp?.name)
        XCTAssertEqual("Generic Gaming", gaming?.name)
    }
    
    func testTemplateSelectorReturnsValidTemplateIDs() {
        var ids = Set<Int>()
        
        for _ in 0..<100 {
            let id = TemplateSelector.selectRandomTemplate()
            ids.insert(id)
            XCTAssertTrue(id >= 1 && id <= 3, "Invalid template ID: \(id)")
        }
        
        // Should have selected multiple different templates
        XCTAssertTrue(ids.count > 1, "Should select different templates")
    }
}
