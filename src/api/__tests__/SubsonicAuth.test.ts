// Mock react-native-quick-crypto with a pure-JS MD5 implementation for tests
jest.mock('react-native-quick-crypto', () => ({
  createHash: (algorithm: string) => {
    if (algorithm !== 'md5') throw new Error('Only MD5 supported in mock');
    // Simple MD5 via Node.js crypto
    const crypto = require('crypto');
    return crypto.createHash('md5');
  },
}));

import { generateSalt, generateToken, buildAuthParams } from '../SubsonicAuth';

describe('SubsonicAuth', () => {
  describe('generateSalt', () => {
    test('returns string of specified length (default 12)', () => {
      const salt = generateSalt();
      expect(salt).toHaveLength(12);
    });

    test('returns string of custom length', () => {
      const salt = generateSalt(20);
      expect(salt).toHaveLength(20);
    });

    test('returns different salts on each call', () => {
      const s1 = generateSalt();
      const s2 = generateSalt();
      // Extremely unlikely to be equal
      expect(s1).not.toEqual(s2);
    });

    test('contains only alphanumeric characters', () => {
      const salt = generateSalt(100);
      expect(salt).toMatch(/^[a-zA-Z0-9]+$/);
    });
  });

  describe('generateToken', () => {
    test('produces deterministic MD5 for known input', () => {
      // MD5("sesame" + "c19b2d") = 26719a1196d2a940705a59634eb18eab (Subsonic spec example)
      const token = generateToken('sesame', 'c19b2d');
      expect(token).toBe('26719a1196d2a940705a59634eb18eab');
    });

    test('produces different tokens for different salts', () => {
      const t1 = generateToken('password', 'salt1');
      const t2 = generateToken('password', 'salt2');
      expect(t1).not.toEqual(t2);
    });

    test('produces different tokens for different passwords', () => {
      const t1 = generateToken('password1', 'salt');
      const t2 = generateToken('password2', 'salt');
      expect(t1).not.toEqual(t2);
    });

    test('returns a 32-character hex string', () => {
      const token = generateToken('test', 'salt');
      expect(token).toMatch(/^[a-f0-9]{32}$/);
    });
  });

  describe('buildAuthParams', () => {
    test('returns all required Subsonic auth parameters', () => {
      const params = buildAuthParams('user', 'pass');
      expect(params).toHaveProperty('u', 'user');
      expect(params).toHaveProperty('t');
      expect(params).toHaveProperty('s');
      expect(params).toHaveProperty('v', '1.16.1');
      expect(params).toHaveProperty('c', 'ManaTunes');
      expect(params).toHaveProperty('f', 'json');
    });

    test('token is valid MD5 of password + salt', () => {
      const params = buildAuthParams('user', 'pass');
      const expected = generateToken('pass', params.s);
      expect(params.t).toBe(expected);
    });
  });
});
