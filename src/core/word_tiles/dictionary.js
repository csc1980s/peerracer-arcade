/**
 * Word Tiles: Sovereign Lexicon — License-Verified Dictionary & Prefix Trie
 * 
 * Sources & Licensing:
 * - Production Lexicon: ENABLE1 (Enhanced North American Benchmark Lexicon, 172,823 words).
 *   Compiled by Alan Beale and the Cooper family; released explicitly to the Public Domain.
 * - Minimum word length: 2 letters.
 * - Normalization: Case-insensitive, trimmed, ASCII alphabetic [A-Z] only.
 */

import { SEED_WORDS } from './seed_words.js';

export class TrieNode {
  constructor() {
    this.children = new Map();
    this.isWord = false;
  }
}

export class WordDictionary {
  constructor() {
    this.wordSet = new Set();
    this.root = new TrieNode();
    this.isLoaded = false;
    this._listeners = [];
  }

  addListener(fn) {
    if (typeof fn === 'function') {
      this._listeners.push(fn);
    }
  }

  _notifyListeners() {
    for (const fn of this._listeners) {
      try { fn(this); } catch (e) {}
    }
  }

  /**
   * Insert a normalized word into the Set and prefix Trie
   */
  insert(rawWord) {
    if (!rawWord) return;
    const word = rawWord.trim().toUpperCase();
    if (word.length < 2 || !/^[A-Z]+$/.test(word)) return;

    this.wordSet.add(word);

    let curr = this.root;
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      if (!curr.children.has(char)) {
        curr.children.set(char, new TrieNode());
      }
      curr = curr.children.get(char);
    }
    curr.isWord = true;
  }

  /**
   * Populate dictionary from a newline-separated string
   */
  loadFromText(text) {
    if (!text) return 0;
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      this.insert(lines[i]);
    }
    this.isLoaded = true;
    this._notifyListeners();
    return this.wordSet.size;
  }

  /**
   * Fast O(1) membership check
   */
  isValidWord(word) {
    if (!word || word.length < 2) return false;
    return this.wordSet.has(word.toUpperCase());
  }

  /**
   * Prefix check for AI move generation pruning
   */
  hasPrefix(prefix) {
    if (!prefix) return true;
    const clean = prefix.toUpperCase();
    let curr = this.root;
    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      if (!curr.children.has(char)) return false;
      curr = curr.children.get(char);
    }
    return true;
  }

  /**
   * Node lookup for recursive Trie search
   */
  getNode(prefix) {
    if (!prefix) return this.root;
    const clean = prefix.toUpperCase();
    let curr = this.root;
    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      if (!curr.children.has(char)) return null;
      curr = curr.children.get(char);
    }
    return curr;
  }

  get count() {
    return this.wordSet.size;
  }

  loadCoreSeedLexicon() {
    if (Array.isArray(SEED_WORDS)) {
      for (let i = 0; i < SEED_WORDS.length; i++) {
        this.insert(SEED_WORDS[i]);
      }
    }
    this.isLoaded = true;
    return this.wordSet.size;
  }
}
