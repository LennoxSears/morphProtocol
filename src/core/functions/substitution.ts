function substitution(input: Uint8Array, _keyArray: Uint8Array, _initor:number[]): Uint8Array {
    const length = input.length;
    const obfuscated = new Uint8Array(length);

    for (let i = 0; i < length; i++) {
        obfuscated[i] = _initor[input[i]];
    }

    return obfuscated;
}

function de_substitution(input: Uint8Array, _keyArray: Uint8Array, _initor:number[]): Uint8Array {
    const length = input.length;
    const deobfuscated = new Uint8Array(length);

    for (let i = 0; i < length; i++) {
        const value = input[i];

        // Find the index of the value in the table
        const index = _initor.findIndex((item: number) => item === value);

        if (index !== -1) {
            deobfuscated[i] = index;
        } else {
            // Handle the case where the value is not found in the table
            // You can decide on an appropriate fallback behavior or error handling here
            // For example, you can set deobfuscated[i] = 0 or throw an error
            deobfuscated[i] = 0;
        }
    }

    return deobfuscated;
}

function generateSubstitutionTable(): number[] {
    const tableLength = 256;
    let substitutionTable: number[] = [];

    // Initialize the table with sequential values from 0 to 255
    for (let i = 0; i < tableLength; i++) {
        substitutionTable.push(i);
    }

    // Shuffle the table using Fisher-Yates algorithm
    for (let i = tableLength - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp: any = substitutionTable[i];
        substitutionTable[i] = substitutionTable[j];
        substitutionTable[j] = temp;
    }

    return substitutionTable;
}

let funPair = {
    obfuscation: substitution,
    deobfuscation: de_substitution,
    initorFn:generateSubstitutionTable
}

export default funPair;