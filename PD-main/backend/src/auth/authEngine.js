import { db } from '../db/store.js';

export class AuthEngine {
  static login(email, password) {
    const user = db.users.find(u => u.email === email);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    return {
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token: user.token
    };
  }

  static verifyToken(token) {
    const user = db.users.find(u => u.token === token);
    return user ? { valid: true, user } : { valid: false };
  }
}
