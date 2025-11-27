import { FunctionRegistry, HouseFunctionPair } from './function-registry';
import * as crypto from 'crypto';

export class Obfuscator {
  private key: number;
  private paddingLength: number;
  private functionRegistry: FunctionRegistry;
  private obFunCombosLength: number;

  constructor(
    key: number,
    obfuscationLayer: number,
    paddingLength: number,
    funInitor: any
  ) {
    // Validate parameters (matching Android)
    if (obfuscationLayer < 1 || obfuscationLayer > 4) {
      throw new Error('Layer must be between 1 and 4');
    }
    if (paddingLength < 1 || paddingLength > 8) {
      throw new Error('Padding length must be between 1 and 8');
    }
    
    this.key = key;
    this.paddingLength = paddingLength;
    this.functionRegistry = new FunctionRegistry(obfuscationLayer, funInitor);
    this.obFunCombosLength = this.functionRegistry.getfunctionPairsIndexCombos().length;
  }

  public setKey(newKey: number): void {
    this.key = newKey;
  }

  private generateKeyArray(length: number): Uint8Array {
    const keyArray = new Uint8Array(length);

    for (let i = 0; i < length; i++) {
      keyArray[i] = (this.key + i * 37) % 256;
    }

    return keyArray;
  }

  private randomPadding(length: number): Uint8Array {
    return new Uint8Array(crypto.randomBytes(length).buffer);
  }

  private concatenateUint8Arrays(arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((acc, array) => acc + array.length, 0);
    const result = new Uint8Array(totalLength);

    let offset = 0;
    for (const array of arrays) {
      result.set(array, offset);
      offset += array.length;
    }

    return result;
  }

  private extractHeaderAndBody(input: Uint8Array): { header: Uint8Array; body: Uint8Array } {
    // Validate minimum length
    if (input.length < 4) {
      throw new Error('Input too short for deobfuscation (minimum 4 bytes)');
    }
    
    const paddingLength = input[2];
    
    // Validate padding length range
    if (paddingLength < 1 || paddingLength > 8) {
      throw new Error(`Invalid padding length: ${paddingLength} (must be 1-8)`);
    }
    
    // Validate total length
    if (input.length < 3 + paddingLength) {
      throw new Error(`Input too short for padding length ${paddingLength}`);
    }
    
    const bodyLength = input.length - 3 - paddingLength;
    
    const header = new Uint8Array(3);
    const body = new Uint8Array(bodyLength);

    for (let i = 0; i < 3; i++) {
      header[i] = input[i];
    }

    for (let i = 0; i < bodyLength; i++) {
      body[i] = input[i + 3];
    }

    return { header, body };
  }

  private preObfuscation(
    buffer: ArrayBuffer,
    functions: HouseFunctionPair[]
  ): Uint8Array {
    let obfuscatedData: Uint8Array = new Uint8Array(buffer);
    let keyArray = this.generateKeyArray(obfuscatedData.length);
    
    for (const func of functions) {
      obfuscatedData = func.obfuscation(obfuscatedData, keyArray, func.initor) as Uint8Array;
    }

    return obfuscatedData;
  }

  private preDeobfuscation(
    obfuscated: ArrayBuffer,
    functions: HouseFunctionPair[]
  ): Uint8Array {
    let deobfuscatedData: Uint8Array = new Uint8Array(obfuscated);
    let keyArray = this.generateKeyArray(deobfuscatedData.length);
    
    for (let i = functions.length - 1; i >= 0; i--) {
      deobfuscatedData = functions[i].deobfuscation(deobfuscatedData, keyArray, functions[i].initor) as Uint8Array;
    }

    return deobfuscatedData;
  }

  public obfuscation(data: ArrayBuffer): Uint8Array {
    // Handle empty input
    if (data.byteLength === 0) {
      return new Uint8Array(0);
    }
    
    let that = this;
    let header = new Uint8Array(crypto.randomBytes(3));
    let fnComboIndex = (header[0] * header[1]) % this.obFunCombosLength;
    let fnCombo = this.functionRegistry.getfunctionPairsIndexCombos();
    let obfuscatedData = this.preObfuscation(
      data,
      fnCombo[fnComboIndex].map((it, _idx) => {
        return that.functionRegistry.functionPairs[it];
      })
    );
    // Generate random padding length
    const paddingLength = Math.floor(Math.random() * this.paddingLength) + 1;

    // Store padding length in header
    header[2] = paddingLength;

    // Generate random padding
    const padding = this.randomPadding(paddingLength);

    // Concatenate with new padding  
    let result = this.concatenateUint8Arrays([
      header,
      obfuscatedData,
      padding
    ]);
    return result;
  }

  public deobfuscation(data: ArrayBuffer): Uint8Array {
    let that = this;
    const input = new Uint8Array(data);
    const { header, body } = this.extractHeaderAndBody(input);
    let fnComboIndex = (header[0] * header[1]) % this.obFunCombosLength;
    let fnCombo = this.functionRegistry.getfunctionPairsIndexCombos();
    // Convert body to proper ArrayBuffer with exact size
    // Copy to new ArrayBuffer to avoid buffer pool issues
    const bodyArrayBuffer = new ArrayBuffer(body.length);
    new Uint8Array(bodyArrayBuffer).set(body);
    
    let deObfuscatedData = this.preDeobfuscation(
      bodyArrayBuffer,
      fnCombo[fnComboIndex].map((it, _idx) => {
        return that.functionRegistry.functionPairs[it];
      })
    );
    return deObfuscatedData;
  }
}
