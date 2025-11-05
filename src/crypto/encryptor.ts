// EncryptionClient.ts
import { createCipheriv, createDecipheriv, randomBytes, generateKeyPairSync, scryptSync, publicEncrypt, privateDecrypt } from 'crypto';

export class Encryptor {
    private algorithm: string;
    public publicKey: string;
    public privateKey: string;
    public remotePublicKey: string = '';
    public password: string;
    public simpleKey: Buffer;
    public simpleVi: Buffer;


    constructor(password: string | undefined) {
        this.algorithm = 'aes-256-cbc';
        if(password) {
            this.password = password
        }
        else {
            this.password = 'bumoyu123'
        }
        // Generate RSA key pair
        const { publicKey, privateKey } = generateKeyPairSync('rsa', {
            modulusLength: 2048,
        });
        this.publicKey = publicKey.export({ type: 'spki', format: 'pem' }).toString();
        this.privateKey = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

        let salt = this.generateSalt();
        this.simpleKey = scryptSync(this.password, salt, 32); // Generate a key from the password
        this.simpleVi = randomBytes(16); // Initialization vector
    }

    public generateSalt(length = 16) {  
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
        let salt = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            salt += charset[randomIndex];
        }
        return salt;
    }
    
    public setSimple(combinedBase64String: string) {
        this.simpleKey = Buffer.from(combinedBase64String.split(":")[0], 'base64');
        this.simpleVi = Buffer.from(combinedBase64String.split(":")[1], 'base64');
    }

    public encrypt(text: string, key: Buffer, iv: Buffer): string {
        const cipher = createCipheriv(this.algorithm, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted; //encrypted; // Return encrypted text
    }

    public decrypt(encryptedText: string, key: Buffer, iv: Buffer): string {
        const decipher = createDecipheriv(this.algorithm, key, iv);
        let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    public encryptWithPublicKey(data: string, remotePublicKey : string): string {
        const encryptedData = publicEncrypt(remotePublicKey, Buffer.from(data, 'base64'));
        return encryptedData.toString('base64'); // Return base64 encoded string
    }

    public decryptWithPrivateKey(encryptedData: string): string {
        const decryptedData = privateDecrypt(this.privateKey, Buffer.from(encryptedData, 'base64'));
        return decryptedData.toString('base64'); // Return decrypted string
    }

    public finalEncrypt (text: string, remotePublicKey : string) {
        const that = this;
        let salt = this.generateSalt();
        let key = scryptSync(that.password, salt, 32); // Generate a key from the password
        let iv = randomBytes(16); // Initialization vector
        let d_send = that.encrypt(text, key, iv)
        let k_send = that.encryptWithPublicKey(key.toString('base64'), remotePublicKey)
        let i_send = iv.toString('base64')
        let data = {
            d: d_send,
            k: k_send,
            i: i_send
        }
        return data
    }

    public finalDecrypt (data: any) {
        const { d, k, i } = data
        let k_receive = this.decryptWithPrivateKey(k)
        let i_receive = Buffer.from(i, 'base64')
        let d_receive = this.decrypt(d, Buffer.from(k_receive, 'base64'), i_receive) //decrypt(d, k_receive, i_receive)
        return d_receive
    }

    public simpleEncrypt (text: string) {
        const that = this;
        let d_send = that.encrypt(text, this.simpleKey, this.simpleVi);
        return d_send;
    }

    public simpleDecrypt (encryptedText: string) {
        const that = this;
        let d_receive = that.decrypt(encryptedText, this.simpleKey, this.simpleVi);
        return d_receive;
    }
}