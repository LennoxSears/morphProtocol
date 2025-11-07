// Reversible obfuscation function: Bitwise NOT
function bitwiseNOT(input: Uint8Array, _keyArray: Uint8Array, _initor:any): Uint8Array {
    const obfuscated = new Uint8Array(input.length);

    for (let i = 0; i < input.length; i++) {
        obfuscated[i] = ~input[i];
    }

    return obfuscated;
}

let funPair = {
    obfuscation: bitwiseNOT,
    deobfuscation: bitwiseNOT
}

export default funPair;