import Foundation

/// Main MorphProtocol client facade
/// Provides a simple API for starting and stopping the client
public class MorphClient {
    private let udpClient: MorphUdpClient
    
    public var onConnected: (() -> Void)? {
        get { udpClient.onConnected }
        set { udpClient.onConnected = newValue }
    }
    
    public var onDisconnected: (() -> Void)? {
        get { udpClient.onDisconnected }
        set { udpClient.onDisconnected = newValue }
    }
    
    public var onError: ((Error) -> Void)? {
        get { udpClient.onError }
        set { udpClient.onError = newValue }
    }
    
    public init(config: ClientConfig) {
        self.udpClient = MorphUdpClient(config: config)
    }
    
    /// Start the client
    public func start() {
        udpClient.start()
    }
    
    /// Stop the client
    public func stop() {
        udpClient.stop()
    }
}
