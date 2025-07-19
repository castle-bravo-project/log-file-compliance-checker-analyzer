// A self-contained, minimal MD5 implementation.
const md5 = (str: string): string => {
  const rotateLeft = (lValue: number, iShiftBits: number) => {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  };

  const addUnsigned = (lX: number, lY: number) => {
    let lX4, lY4, lX8, lY8, lResult;
    lX8 = lX & 0x80000000;
    lY8 = lY & 0x80000000;
    lX4 = lX & 0x40000000;
    lY4 = lY & 0x40000000;
    lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      else return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    } else return lResult ^ lX8 ^ lY8;
  };

  const F = (x: number, y: number, z: number) => (x & y) | (~x & z);
  const G = (x: number, y: number, z: number) => (x & z) | (y & ~z);
  const H = (x: number, y: number, z: number) => x ^ y ^ z;
  const I = (x: number, y: number, z: number) => y ^ (x | ~z);

  const FF = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };
  const GG = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };
  const HH = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };
  const II = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) => {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  };

  const convertToWordArray = (str: string) => {
    let lWordCount;
    const lMessageLength = str.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    const lWordArray = Array(lNumberOfWords - 1);
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition));
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  };

  const wordToHex = (lValue: number) => {
    let wordToHexValue = '',
      wordToHexValue_temp = '',
      lByte,
      lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      wordToHexValue_temp = '0' + lByte.toString(16);
      wordToHexValue = wordToHexValue + wordToHexValue_temp.substr(wordToHexValue_temp.length - 2, 2);
    }
    return wordToHexValue;
  };

  const x = convertToWordArray(str);
  let a = 0x67452301,
    b = 0xefcdab89,
    c = 0x98badcfe,
    d = 0x10325476;

  for (let i = 0; i < x.length; i += 16) {
    const AA = a,
      BB = b,
      CC = c,
      DD = d;
    a = FF(a, b, c, d, x[i + 0], 7, 0xd76aa478);
    d = FF(d, a, b, c, x[i + 1], 12, 0xe8c7b756);
    c = FF(c, d, a, b, x[i + 2], 17, 0x242070db);
    b = FF(b, c, d, a, x[i + 3], 22, 0xc1bdceee);
    a = FF(a, b, c, d, x[i + 4], 7, 0xf57c0faf);
    d = FF(d, a, b, c, x[i + 5], 12, 0x4787c62a);
    c = FF(c, d, a, b, x[i + 6], 17, 0xa8304613);
    b = FF(b, c, d, a, x[i + 7], 22, 0xfd469501);
    a = FF(a, b, c, d, x[i + 8], 7, 0x698098d8);
    d = FF(d, a, b, c, x[i + 9], 12, 0x8b44f7af);
    c = FF(c, d, a, b, x[i + 10], 17, 0xffff5bb1);
    b = FF(b, c, d, a, x[i + 11], 22, 0x895cd7be);
    a = FF(a, b, c, d, x[i + 12], 7, 0x6b901122);
    d = FF(d, a, b, c, x[i + 13], 12, 0xfd987193);
    c = FF(c, d, a, b, x[i + 14], 17, 0xa679438e);
    b = FF(b, c, d, a, x[i + 15], 22, 0x49b40821);

    a = GG(a, b, c, d, x[i + 1], 5, 0xf61e2562);
    d = GG(d, a, b, c, x[i + 6], 9, 0xc040b340);
    c = GG(c, d, a, b, x[i + 11], 14, 0x265e5a51);
    b = GG(b, c, d, a, x[i + 0], 20, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[i + 5], 5, 0xd62f105d);
    d = GG(d, a, b, c, x[i + 10], 9, 0x02441453);
    c = GG(c, d, a, b, x[i + 15], 14, 0xd8a1e681);
    b = GG(b, c, d, a, x[i + 4], 20, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[i + 9], 5, 0x21e1cde6);
    d = GG(d, a, b, c, x[i + 14], 9, 0xc33707d6);
    c = GG(c, d, a, b, x[i + 3], 14, 0xf4d50d87);
    b = GG(b, c, d, a, x[i + 8], 20, 0x455a14ed);
    a = GG(a, b, c, d, x[i + 13], 5, 0xa9e3e905);
    d = GG(d, a, b, c, x[i + 2], 9, 0xfcefa3f8);
    c = GG(c, d, a, b, x[i + 7], 14, 0x676f02d9);
    b = GG(b, c, d, a, x[i + 12], 20, 0x8d2a4c8a);

    a = HH(a, b, c, d, x[i + 5], 4, 0xfffa3942);
    d = HH(d, a, b, c, x[i + 8], 11, 0x8771f681);
    c = HH(c, d, a, b, x[i + 11], 16, 0x6d9d6122);
    b = HH(b, c, d, a, x[i + 14], 23, 0xfde5380c);
    a = HH(a, b, c, d, x[i + 1], 4, 0xa4beea44);
    d = HH(d, a, b, c, x[i + 4], 11, 0x4bdecfa9);
    c = HH(c, d, a, b, x[i + 7], 16, 0xf6bb4b60);
    b = HH(b, c, d, a, x[i + 10], 23, 0xbebfbc70);
    a = HH(a, b, c, d, x[i + 13], 4, 0x289b7ec6);
    d = HH(d, a, b, c, x[i + 0], 11, 0xeaa127fa);
    c = HH(c, d, a, b, x[i + 3], 16, 0xd4ef3085);
    b = HH(b, c, d, a, x[i + 6], 23, 0x04881d05);
    a = HH(a, b, c, d, x[i + 9], 4, 0xd9d4d039);
    d = HH(d, a, b, c, x[i + 12], 11, 0xe6db99e5);
    c = HH(c, d, a, b, x[i + 15], 16, 0x1fa27cf8);
    b = HH(b, c, d, a, x[i + 2], 23, 0xc4ac5665);

    a = II(a, b, c, d, x[i + 0], 6, 0xf4292244);
    d = II(d, a, b, c, x[i + 7], 10, 0x432aff97);
    c = II(c, d, a, b, x[i + 14], 15, 0xab9423a7);
    b = II(b, c, d, a, x[i + 5], 21, 0xfc93a039);
    a = II(a, b, c, d, x[i + 12], 6, 0x655b59c3);
    d = II(d, a, b, c, x[i + 3], 10, 0x8f0ccc92);
    c = II(c, d, a, b, x[i + 10], 15, 0xffeff47d);
    b = II(b, c, d, a, x[i + 1], 21, 0x85845dd1);
    a = II(a, b, c, d, x[i + 8], 6, 0x6fa87e4f);
    d = II(d, a, b, c, x[i + 15], 10, 0xfe2ce6e0);
    c = II(c, d, a, b, x[i + 6], 15, 0xa3014314);
    b = II(b, c, d, a, x[i + 13], 21, 0x4e0811a1);
    a = II(a, b, c, d, x[i + 4], 6, 0xf7537e82);
    d = II(d, a, b, c, x[i + 11], 10, 0xbd3af235);
    c = II(c, d, a, b, x[i + 2], 15, 0x2ad7d2bb);
    b = II(b, c, d, a, x[i + 9], 21, 0xeb86d391);

    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }

  const temp = wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d);
  return temp.toLowerCase();
};

const bufferToHex = (buffer: ArrayBuffer): string => {
    return [...new Uint8Array(buffer)]
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

/**
 * Calculates MD5, SHA-1, and SHA-256 hashes for a given file.
 * @param file The file to hash.
 * @returns A promise that resolves to an object containing the hashes.
 */
export const calculateHashes = async (
    file: File
): Promise<{ md5: string; sha1: string; sha256: string }> => {
    try {
        const bufferContent = await file.arrayBuffer();
        const textContent = await file.text(); // MD5 implementation needs string

        const [sha1Buffer, sha256Buffer] = await Promise.all([
            crypto.subtle.digest('SHA-1', bufferContent),
            crypto.subtle.digest('SHA-256', bufferContent)
        ]);
        
        const md5Hash = md5(textContent);
        const sha1Hash = bufferToHex(sha1Buffer);
        const sha256Hash = bufferToHex(sha256Buffer);

        return {
            md5: md5Hash,
            sha1: sha1Hash,
            sha256: sha256Hash
        };
    } catch (error) {
        console.error(`Hashing failed for ${file.name}:`, error);
        return {
            md5: 'hashing failed',
            sha1: 'hashing failed',
            sha256: 'hashing failed',
        };
    }
};

/**
 * Calculates a SHA-256 hash for a given string.
 * @param text The string to hash.
 * @returns A promise that resolves to the SHA-256 hash.
 */
export const calculateTextHash = async (text: string): Promise<string> => {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return bufferToHex(hashBuffer);
    } catch (error) {
        console.error("Text hashing failed:", error);
        return 'hashing failed';
    }
};