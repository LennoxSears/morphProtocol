function reverseBuffer(input: Uint8Array, _keyArray: Uint8Array, _initor:any): Uint8Array {
    const length = input.length;
    const reversed = new Uint8Array(length);

    for (let i = 0; i < length; i++) {
        reversed[i] = input[length - 1 - i];
    }

    return reversed;
}

let funPair = {
    obfuscation: reverseBuffer,
    deobfuscation: reverseBuffer
}

export default funPair;