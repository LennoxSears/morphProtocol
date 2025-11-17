import Foundation
import Capacitor

@objc(MorphProtocolPlugin)
public class MorphProtocolPlugin: CAPPlugin {
    private var morphClient: MorphClient?
    private var isConnected = false
    private var clientId: String?
    private var serverPort: Int?
    
    @objc func connect(_ call: CAPPluginCall) {
        if isConnected {
            call.reject("Already connected")
            return
        }
        
        guard let remoteAddress = call.getString("remoteAddress") else {
            call.reject("remoteAddress is required")
            return
        }
        
        guard let remotePort = call.getInt("remotePort") else {
            call.reject("remotePort is required")
            return
        }
        
        guard let userId = call.getString("userId") else {
            call.reject("userId is required")
            return
        }
        
        guard let encryptionKey = call.getString("encryptionKey") else {
            call.reject("encryptionKey is required")
            return
        }
        
        // Optional parameters with defaults
        let localWgAddress = call.getString("localWgAddress") ?? "127.0.0.1"
        let localWgPort = call.getInt("localWgPort") ?? 51820
        let obfuscationLayer = call.getInt("obfuscationLayer") ?? 3
        let paddingLength = call.getInt("paddingLength") ?? 8
        let heartbeatInterval = call.getDouble("heartbeatInterval") ?? 120.0
        let inactivityTimeout = call.getDouble("inactivityTimeout") ?? 30.0
        let maxRetries = call.getInt("maxRetries") ?? 10
        let handshakeInterval = call.getDouble("handshakeInterval") ?? 5.0
        let password = call.getString("password") ?? "bumoyu123"
        
        // Create configuration
        let config = ClientConfig(
            remoteAddress: remoteAddress,
            remotePort: UInt16(remotePort),
            userId: userId,
            encryptionKey: encryptionKey,
            localWgAddress: localWgAddress,
            localWgPort: UInt16(localWgPort),
            obfuscationLayer: obfuscationLayer,
            paddingLength: paddingLength,
            heartbeatInterval: heartbeatInterval,
            inactivityTimeout: inactivityTimeout,
            maxRetries: maxRetries,
            handshakeInterval: handshakeInterval,
            password: password
        )
        
        // Create and start client
        morphClient = MorphClient(config: config)
        
        morphClient?.onConnected = { [weak self] in
            self?.isConnected = true
            self?.notifyListeners("connected", data: [
                "type": "connected",
                "message": "Connected to MorphProtocol server"
            ])
        }
        
        morphClient?.onDisconnected = { [weak self] in
            self?.isConnected = false
            self?.notifyListeners("disconnected", data: [
                "type": "disconnected",
                "message": "Disconnected from MorphProtocol server"
            ])
        }
        
        morphClient?.onError = { [weak self] error in
            self?.notifyListeners("error", data: [
                "type": "error",
                "message": "Error: \(error.localizedDescription)"
            ])
        }
        
        morphClient?.start()
        
        // Return success immediately (connection happens async)
        call.resolve([
            "success": true,
            "message": "Connection initiated",
            "clientId": clientId as Any
        ])
    }
    
    @objc func disconnect(_ call: CAPPluginCall) {
        guard isConnected else {
            call.reject("Not connected")
            return
        }
        
        morphClient?.stop()
        isConnected = false
        clientId = nil
        serverPort = nil
        morphClient = nil
        
        notifyListeners("disconnected", data: [
            "type": "disconnected",
            "message": "Disconnected from MorphProtocol server"
        ])
        
        call.resolve([
            "success": true,
            "message": "Disconnected successfully"
        ])
    }
    
    @objc func getStatus(_ call: CAPPluginCall) {
        var result: [String: Any] = [
            "connected": isConnected,
            "status": isConnected ? "Connected" : "Disconnected"
        ]
        
        if isConnected {
            if let clientId = clientId {
                result["clientId"] = clientId
            }
            if let serverPort = serverPort {
                result["serverPort"] = serverPort
            }
        }
        
        call.resolve(result)
    }
    
    deinit {
        morphClient?.stop()
    }
}
