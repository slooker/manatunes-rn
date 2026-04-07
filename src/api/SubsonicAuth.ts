import QuickCrypto from 'react-native-quick-crypto';

const SALT_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateSalt(length = 12): string {
  let salt = '';
  for (let i = 0; i < length; i++) {
    salt += SALT_CHARS[Math.floor(Math.random() * SALT_CHARS.length)];
  }
  return salt;
}

export function generateToken(password: string, salt: string): string {
  const input = password + salt;
  return QuickCrypto.createHash('md5').update(input).digest('hex') as string;
}

export interface AuthParams extends Record<string, string> {
  u: string;
  t: string;
  s: string;
  v: string;
  c: string;
  f: string;
}

export function buildAuthParams(
  username: string,
  password: string,
  clientName = 'ManaTunes',
  apiVersion = '1.16.1'
): AuthParams {
  const salt = generateSalt();
  const token = generateToken(password, salt);
  return { u: username, t: token, s: salt, v: apiVersion, c: clientName, f: 'json' };
}
