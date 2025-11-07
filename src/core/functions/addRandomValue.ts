function addRandomValue(input: Uint8Array, _keyArray: Uint8Array, _initor:number): Uint8Array {
    const obfuscated = new Uint8Array(input.length);

    for (let i = 0; i < input.length; i++) {
        obfuscated[i] = (input[i] + _initor) % 256; // Addition with modulus
    }

    return obfuscated;
}

function de_addRandomValue(input: Uint8Array, _keyArray: Uint8Array, _initor:number): Uint8Array {
    const deobfuscated = new Uint8Array(input.length);

    for (let i = 0; i < input.length; i++) {
        deobfuscated[i] = (input[i] - _initor + 256) % 256; // Subtraction with modulus
    }

    return deobfuscated;
}

function generateRandomValue(): number {
    return Math.floor(Math.random() * 256)
}

let funPair = {
    obfuscation: addRandomValue,
    deobfuscation: de_addRandomValue,
    initorFn: generateRandomValue
}

export default funPair;