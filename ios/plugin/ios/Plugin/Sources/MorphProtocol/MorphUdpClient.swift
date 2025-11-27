import Foundation
import Network

/// MorphProtocol UDP client implementation for iOS
/// Compatible with TypeScript server and Android client
public class MorphUdpClient {
    private let config: ClientConfig
    private var connection: NWConnection?
    private var isRunning = false
    private var clientID: Data
    private var encryptor: Encryptor
    private var obfuscator: Obfuscator
    private var protocolTemplate: ProtocolTemplate
    private var newServerPort: UInt16 = 0
    private var lastReceivedTime: Date?
    private var obfuscationKey: Int = 0
    private var obfuscationFnInitor: Int = 0
    
    private var heartbeatTimer: Timer?
    private var inactivityTimer: Timer?
    private var handshakeTimer: Timer?
    private var retryCount = 0
    
    public var onConnected: (() -> Void)?
    public var onDisconnected: (() -> Void)?
    public var onError: ((Error) -> Void)?
    
    public init(config: ClientConfig) {
        self.config = config
        
        // Generate random 16-byte clientID
        var id = Data(count: 16)
        for i in 0..<16 {
            id[i] = UInt8.random(in: 0...255)
        }
        self.clientID = id
        
        print("Generated clientID: \(clientID.map { String(format: "%02x", $0) }.joined())")
        
        // Initialize encryptor
        self.encryptor = Encryptor(password: config.password)
        do {
            try encryptor.setSimple(config.encryptionKey)
        } catch {
            print("Failed to set encryption key: \(error)")
        }
        
        // Select random protocol template
        let templateId = TemplateSelector.selectRandomTemplate()
        self.protocolTemplate = TemplateFactory.createTemplate(id: templateId)!
        print("Selected protocol template: \(protocolTemplate.name) (ID: \(templateId))")
        
        // Initialize obfuscator and store parameters
        self.obfuscationKey = Int.random(in: 0..<256)
        self.obfuscationFnInitor = FunctionInitializer.generateInitializerId()
        self.obfuscator = Obfuscator(
            key: obfuscationKey,
            layer: config.obfuscationLayer,
            paddingLength: config.paddingLength,
            fnInitor: obfuscationFnInitor
        )
        
        print("Obfuscation parameters: key=\(obfuscationKey), layer=\(config.obfuscationLayer), padding=\(config.paddingLength), fnInitor=\(obfuscationFnInitor)")
    }
    
    /// Start the UDP client
    public func start() {
        guard !isRunning else {
            print("Client already running")
            return
        }
        
        isRunning = true
        
        // Create UDP connection
        let host = NWEndpoint.Host(config.remoteAddress)
        let port = NWEndpoint.Port(rawValue: config.remotePort)!
        
        connection = NWConnection(host: host, port: port, using: .udp)
        
        connection?.stateUpdateHandler = { [weak self] state in
            switch state {
            case .ready:
                print("UDP connection ready")
                self?.startReceiving()
                self?.startHandshake()
            case .failed(let error):
                print("UDP connection failed: \(error)")
                self?.onError?(error)
            case .cancelled:
                print("UDP connection cancelled")
            default:
                break
            }
        }
        
        connection?.start(queue: .global())
        print("Client started")
    }
    
    /// Stop the UDP client
    public func stop() {
        guard isRunning else { return }
        
        isRunning = false
        
        // Cancel timers
        heartbeatTimer?.invalidate()
        inactivityTimer?.invalidate()
        handshakeTimer?.invalidate()
        
        // Send close message
        do {
            let closeMsg = try encryptor.simpleEncrypt("close")
            sendToHandshakeServer(Data(closeMsg.utf8))
            print("Close message sent to handshake server")
        } catch {
            print("Failed to send close message: \(error)")
        }
        
        // Close connection
        connection?.cancel()
        connection = nil
        
        print("Client stopped")
    }
    
    // MARK: - Handshake
    
    private func startHandshake() {
        retryCount = 0
        handshakeTimer = Timer.scheduledTimer(withTimeInterval: config.handshakeInterval, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            
            if self.newServerPort == 0 && self.retryCount < self.config.maxRetries {
                self.sendHandshake()
                self.retryCount += 1
            } else if self.retryCount >= self.config.maxRetries {
                print("Max retries reached, stopping client")
                self.stop()
            } else {
                self.handshakeTimer?.invalidate()
            }
        }
        handshakeTimer?.fire()
    }
    
    private func sendHandshake() {
        // Get actual initializers from obfuscator
        let substitutionTable = obfuscator.getSubstitutionTable()
        let randomValue = obfuscator.getRandomValue()
        
        let handshakeData: [String: Any] = [
            "clientID": clientID.base64EncodedString(),
            "key": obfuscationKey,  // Use stored key
            "obfuscationLayer": config.obfuscationLayer,
            "randomPadding": config.paddingLength,
            "fnInitor": [
                "substitutionTable": substitutionTable,
                "randomValue": randomValue
            ],
            "templateId": protocolTemplate.id,
            "templateParams": protocolTemplate.getParams(),
            "userId": config.userId,
            "publicKey": "not implemented"
        ]
        
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: handshakeData)
            let jsonString = String(data: jsonData, encoding: .utf8)!
            let encrypted = try encryptor.simpleEncrypt(jsonString)
            
            sendToHandshakeServer(Data(encrypted.utf8))
            print("Handshake data sent to handshake server")
        } catch {
            print("Failed to send handshake: \(error)")
        }
    }
    
    // MARK: - Heartbeat
    
    private func startHeartbeat() {
        heartbeatTimer = Timer.scheduledTimer(withTimeInterval: config.heartbeatInterval, repeats: true) { [weak self] _ in
            self?.sendHeartbeat()
        }
    }
    
    private func sendHeartbeat() {
        guard newServerPort != 0 else { return }
        
        let heartbeatMarker = Data([0x01])
        let packet = protocolTemplate.encapsulate(heartbeatMarker, clientID: clientID)
        protocolTemplate.updateState()
        
        sendToNewServer(packet)
        print("Heartbeat sent to new server")
    }
    
    // MARK: - Inactivity Check
    
    private func startInactivityCheck() {
        inactivityTimer = Timer.scheduledTimer(withTimeInterval: 10.0, repeats: true) { [weak self] _ in
            self?.checkInactivity()
        }
    }
    
    private func checkInactivity() {
        guard newServerPort != 0, let lastReceived = lastReceivedTime else { return }
        
        let timeSinceLastReceived = Date().timeIntervalSince(lastReceived)
        
        if timeSinceLastReceived > config.inactivityTimeout {
            print("Inactivity detected: \(timeSinceLastReceived)s since last packet")
            print("Attempting to reconnect with NEW clientID and packet pattern...")
            
            // Cancel heartbeat
            heartbeatTimer?.invalidate()
            
            // Reset server port
            let oldPort = newServerPort
            let oldClientID = clientID.map { String(format: "%02x", $0) }.joined()
            newServerPort = 0
            
            // Generate NEW clientID
            for i in 0..<16 {
                clientID[i] = UInt8.random(in: 0...255)
            }
            print("Old clientID: \(oldClientID)")
            print("New clientID: \(clientID.map { String(format: "%02x", $0) }.joined())")
            
            // Select NEW protocol template
            let newTemplateId = TemplateSelector.selectRandomTemplate()
            protocolTemplate = TemplateFactory.createTemplate(id: newTemplateId)!
            print("New template: \(protocolTemplate.name) (ID: \(newTemplateId))")
            
            // Generate NEW obfuscation parameters
            let newKey = Int.random(in: 0..<256)
            let newFnInitor = FunctionInitializer.generateInitializerId()
            obfuscator = Obfuscator(
                key: newKey,
                layer: config.obfuscationLayer,
                paddingLength: config.paddingLength,
                fnInitor: newFnInitor
            )
            print("New obfuscation parameters: key=\(newKey), fnInitor=\(newFnInitor)")
            
            // Send handshake to reconnect
            startHandshake()
            print("Reconnection handshake sent (old port: \(oldPort))")
        }
    }
    
    // MARK: - Receiving
    
    private func startReceiving() {
        receiveNextPacket()
    }
    
    private func receiveNextPacket() {
        connection?.receiveMessage { [weak self] data, context, isComplete, error in
            guard let self = self else { return }
            
            if let error = error {
                print("Receive error: \(error)")
                return
            }
            
            if let data = data, !data.isEmpty {
                self.handleIncomingPacket(data)
            }
            
            if self.isRunning {
                self.receiveNextPacket()
            }
        }
    }
    
    private func handleIncomingPacket(_ data: Data) {
        // Determine source based on context
        // For simplicity, we'll check if it's from handshake server or new server
        // In production, you'd track the source endpoint
        
        if newServerPort == 0 {
            // Likely from handshake server
            handleHandshakeResponse(data)
        } else {
            // Likely from new server
            handleServerPacket(data)
        }
    }
    
    private func handleHandshakeResponse(_ data: Data) {
        do {
            let decrypted = try encryptor.simpleDecrypt(String(data: data, encoding: .utf8)!)
            
            if decrypted == "inactivity" {
                print("Server detected inactivity, closing connection")
                stop()
                return
            }
            
            if decrypted == "server_full" {
                print("Server is full")
                stop()
                return
            }
            
            // Parse JSON response
            if let jsonData = decrypted.data(using: .utf8),
               let response = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
               let port = response["port"] as? Int,
               let confirmedClientID = response["clientID"] as? String {
                
                newServerPort = UInt16(port)
                
                print("Received server response:")
                print("  Port: \(newServerPort)")
                print("  ClientID confirmed: \(confirmedClientID)")
                print("  Status: \(response["status"] as? String ?? "unknown")")
                
                // Verify clientID matches
                if confirmedClientID != clientID.base64EncodedString() {
                    print("ClientID mismatch! Server returned different clientID")
                }
                
                // Stop handshake and start heartbeat
                handshakeTimer?.invalidate()
                startHeartbeat()
                
                // Start inactivity check
                lastReceivedTime = Date()
                startInactivityCheck()
                print("Inactivity detection started (timeout: \(config.inactivityTimeout)s)")
                
                onConnected?()
            }
        } catch {
            print("Failed to parse handshake response: \(error)")
        }
    }
    
    private func handleServerPacket(_ data: Data) {
        // Update last received time
        lastReceivedTime = Date()
        
        // Decapsulate template layer
        guard let obfuscatedData = protocolTemplate.decapsulate(data) else {
            print("Failed to decapsulate template packet from server")
            return
        }
        
        // Deobfuscate
        do {
            let deobfuscated = try obfuscator.deobfuscate(obfuscatedData)
            
            // Send to local WireGuard
            sendToLocalWireGuard(deobfuscated)
        } catch {
            print("Failed to deobfuscate packet: \(error)")
        }
    }
    
    // MARK: - Sending
    
    private func sendToHandshakeServer(_ data: Data) {
        connection?.send(content: data, completion: .contentProcessed { error in
            if let error = error {
                print("Failed to send to handshake server: \(error)")
            }
        })
    }
    
    private func sendToNewServer(_ data: Data) {
        // Create new connection to new server port
        let host = NWEndpoint.Host(config.remoteAddress)
        let port = NWEndpoint.Port(rawValue: newServerPort)!
        
        let newConnection = NWConnection(host: host, port: port, using: .udp)
        newConnection.start(queue: .global())
        
        newConnection.send(content: data, completion: .contentProcessed { error in
            if let error = error {
                print("Failed to send to new server: \(error)")
            }
            newConnection.cancel()
        })
    }
    
    private func sendToLocalWireGuard(_ data: Data) {
        let host = NWEndpoint.Host(config.localWgAddress)
        let port = NWEndpoint.Port(rawValue: config.localWgPort)!
        
        let wgConnection = NWConnection(host: host, port: port, using: .udp)
        wgConnection.start(queue: .global())
        
        wgConnection.send(content: data, completion: .contentProcessed { error in
            if let error = error {
                print("Failed to send to local WireGuard: \(error)")
            }
            wgConnection.cancel()
        })
    }
}
