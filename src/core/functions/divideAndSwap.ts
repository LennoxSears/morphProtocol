function divideAndSwap(input: Uint8Array, _keyArray: Uint8Array, _initor:any): Uint8Array {
    const length = input.length;

    // Calculate the midpoint
    const midpoint = Math.floor(length / 2);

    // Create a new array to store the swapped data
    const swapped = new Uint8Array(length);

    // If the length is odd, copy the middle index as is
    if (length % 2 !== 0) {
        // Swap the two equal parts
        for (let i = 0; i < midpoint; i++) {
            swapped[i] = input[i + midpoint + 1]; // Copy the second half to the first half of the swapped array
            swapped[i + midpoint + 1] = input[i]; // Copy the first half to the second half of the swapped array
        }
        swapped[midpoint] = input[midpoint];
    }
    else {
        for (let i = 0; i < midpoint; i++) {
            swapped[i] = input[i + midpoint]; // Copy the second half to the first half of the swapped array
            swapped[i + midpoint] = input[i]; // Copy the first half to the second half of the swapped array
        }
    }

    return swapped;
}

let funPair = {
    obfuscation: divideAndSwap,
    deobfuscation: divideAndSwap
}

export default funPair;