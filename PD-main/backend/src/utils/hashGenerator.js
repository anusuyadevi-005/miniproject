import crypto from 'crypto';

export function computeFileHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function computeStringHash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}
