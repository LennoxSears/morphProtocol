// Obfuscation function: Circular shift
    function circularShiftObfuscation(input: Uint8Array, _keyArray: Uint8Array, _initor:any): Uint8Array {
        const obfuscated = new Uint8Array(input.length);

        for (let i = 0; i < input.length; i++) {
            obfuscated[i] = (input[i] << 1) | (input[i] >>> 7); // Circular left shift by 1 bit
        }

        return obfuscated;
    }

    // Deobfuscation function: Circular shift
    function de_circularShiftObfuscation(input: Uint8Array, _keyArray: Uint8Array, _initor:any): Uint8Array {
        const deobfuscated = new Uint8Array(input.length);

        for (let i = 0; i < input.length; i++) {
            deobfuscated[i] = (input[i] >>> 1) | (input[i] << 7); // Circular right shift by 1 bit
        }

        return deobfuscated;
    }

    let funPair = {
        obfuscation: circularShiftObfuscation,
        deobfuscation: de_circularShiftObfuscation
    }
    
    export default funPair;