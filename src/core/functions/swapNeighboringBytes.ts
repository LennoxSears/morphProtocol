function swapNeighboringBytes(input: Uint8Array, _keyArray: Uint8Array, _initor:any): Uint8Array {
    const length = input.length;
    const swapped = new Uint8Array(length);

    for (let i = 0; i < length - 1; i += 2) {
        swapped[i] = input[i + 1];
        swapped[i + 1] = input[i];
    }

    if (length % 2 !== 0) {
        swapped[length - 1] = input[length - 1];
    }

    return swapped;
}

let funPair = {
    obfuscation: swapNeighboringBytes,
    deobfuscation: swapNeighboringBytes
}

export default funPair;