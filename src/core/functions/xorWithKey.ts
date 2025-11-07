// Reversible obfuscation function: Bitwise XOR with a rolling key
function xorWithKey(input: Uint8Array, _keyArray: Uint8Array, _initor:any): Uint8Array {
    const length = input.length;
    const obfuscated = new Uint8Array(length);

    for (let i = 0; i < length; i++) {
        obfuscated[i] = input[i] ^ _keyArray[i];
    }

    return obfuscated;
}

let funPair = {
    obfuscation: xorWithKey,
    deobfuscation: xorWithKey
}

export default funPair;