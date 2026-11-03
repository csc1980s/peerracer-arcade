/**
 * Solitaire Sovereign - Clean-Room PRNG and Shuffling Engine
 * 
 * IP Provenance & Boundary:
 * Microsoft Solitaire historically used an MS CRT rand() LCG:
 *   state = (state * 214013 + 2531011) & 0x7FFFFFFF; randVal = (state >> 16) & 0x7FFF;
 * To ensure zero copyright/patent overlap and superior cryptographic distribution,
 * this engine uses a pure 64-bit SplitMix64 PRNG paired with Lemire's unbiased
 * bounded random algorithm to perform Fisher-Yates shuffling.
 */

export class SplitMix64 {
  /**
   * @param {bigint|number|string} seed 
   */
  constructor(seed = Date.now()) {
    if (typeof seed === 'string') {
      this.state = this._hashString(seed);
    } else {
      this.state = BigInt(seed) & 0xFFFFFFFFFFFFFFFFn;
    }
    if (this.state === 0n) {
      this.state = 0x9E3779B97F4A7C15n;
    }
  }

  _hashString(str) {
    let h = 0x811c9dc5n;
    for (let i = 0; i < str.length; i++) {
      h ^= BigInt(str.charCodeAt(i));
      h = (h * 0x01000193n) & 0xFFFFFFFFFFFFFFFFn;
    }
    return h;
  }

  /**
   * Returns next 64-bit unsigned BigInt
   * @returns {bigint}
   */
  next64() {
    this.state = (this.state + 0x9E3779B97F4A7C15n) & 0xFFFFFFFFFFFFFFFFn;
    let z = this.state;
    z = ((z ^ (z >> 30n)) * 0xBF58476D1CE4E5B9n) & 0xFFFFFFFFFFFFFFFFn;
    z = ((z ^ (z >> 27n)) * 0x94D049BB133111EBn) & 0xFFFFFFFFFFFFFFFFn;
    return (z ^ (z >> 31n)) & 0xFFFFFFFFFFFFFFFFn;
  }

  /**
   * Returns a 32-bit float in [0, 1)
   * @returns {number}
   */
  nextFloat() {
    const v = Number(this.next64() >> 11n);
    return v / 9007199254740992; // 2^53
  }

  /**
   * Lemire's Fast Bounded Random: unbiased integer in range [0, range - 1]
   * Avoids modulo bias without slow division in the common case.
   * @param {number} range 
   * @returns {number}
   */
  boundedInt(range) {
    if (range <= 1) return 0;
    const s = BigInt(range);
    let x = this.next64() & 0xFFFFFFFFn;
    let m = x * s;
    let l = m & 0xFFFFFFFFn;
    if (l < s) {
      const t = (0x100000000n - s) % s;
      while (l < t) {
        x = this.next64() & 0xFFFFFFFFn;
        m = x * s;
        l = m & 0xFFFFFFFFn;
      }
    }
    return Number(m >> 32n);
  }

  /**
   * Fisher-Yates array shuffle in place using Lemire's bounded method
   * @param {Array} array 
   * @returns {Array}
   */
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.boundedInt(i + 1);
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  /**
   * Fresh random seed that fits the 40 bits a deal code carries, so the
   * code shown for a deal always reproduces that exact deal.
   * Returned as a Number (JSON-safe for saves and duel payloads).
   * @returns {number}
   */
  static newSeed() {
    return Math.floor(Math.random() * 0x10000000000); // [0, 2^40)
  }

  /**
   * Generate a readable, shareable deal code string
   * @param {string} prefix e.g. "KL" for Klondike, "FC" for FreeCell
   * @param {number|bigint} seedValue
   * @returns {string}
   */
  static formatDealCode(prefix, seedValue) {
    const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford Base32
    let val = BigInt(seedValue) & 0xFFFFFFFFFFn; // 40-bit
    let encoded = "";
    for (let i = 0; i < 8; i++) {
      encoded = alphabet[Number(val % 32n)] + encoded;
      val /= 32n;
    }
    // Simple Luhn-like check digit
    let sum = 0;
    for (let i = 0; i < encoded.length; i++) {
      sum = (sum * 3 + alphabet.indexOf(encoded[i])) % 31;
    }
    const checkChar = alphabet[sum % 32];
    return `${prefix}-${encoded.slice(0, 4)}-${encoded.slice(4)}-${checkChar}`;
  }

  /**
   * Parse a shareable deal code back to numeric seed
   * @param {string} code 
   * @returns {{prefix: string, seed: bigint, valid: boolean}}
   */
  static parseDealCode(code) {
    const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    const clean = code.toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (clean.length < 9) return { prefix: "UNKNOWN", seed: 0n, valid: false };

    const prefix = code.split('-')[0] || "GEN";
    const body = clean.slice(-9, -1);
    const check = clean.slice(-1);

    let sum = 0;
    for (let i = 0; i < body.length; i++) {
      sum = (sum * 3 + alphabet.indexOf(body[i])) % 31;
    }
    const valid = alphabet[sum % 32] === check;

    let seed = 0n;
    for (let i = 0; i < body.length; i++) {
      seed = seed * 32n + BigInt(alphabet.indexOf(body[i]));
    }

    return { prefix, seed, valid };
  }
}

export { SplitMix64 as PRNG };

