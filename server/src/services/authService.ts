import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { userModel } from '../models/userModel';
import { JwtPayload } from '../types';
import { AppError } from '../middleware/errorHandler';

export const authService = {
  async register(email: string, password: string, firstName?: string, lastName?: string) {
    const existing = await userModel.findByEmail(email);
    if (existing) {
      throw new AppError(409, 'Uživatel s tímto e-mailem již existuje.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userModel.create({
      email,
      password_hash: passwordHash,
      first_name: firstName || null,
      last_name: lastName || null,
    });

    const token = this.generateToken(user);
    return { user: this.sanitizeUser(user), token };
  },

  async login(email: string, password: string) {
    const user = await userModel.findByEmail(email);
    if (!user) {
      throw new AppError(401, 'Neplatný e-mail nebo heslo.');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new AppError(401, 'Neplatný e-mail nebo heslo.');
    }

    const token = this.generateToken(user);
    return { user: this.sanitizeUser(user), token };
  },

  async getProfile(userId: number) {
    const user = await userModel.findById(userId);
    if (!user) {
      throw new AppError(404, 'Uživatel nenalezen.');
    }
    return this.sanitizeUser(user);
  },

  async updateProfile(userId: number, data: {
    first_name?: string;
    last_name?: string;
    pref_price?: number;
    pref_time?: number;
    pref_comfort?: number;
    pref_rating?: number;
  }) {
    const user = await userModel.update(userId, data);
    if (!user) {
      throw new AppError(404, 'Uživatel nenalezen.');
    }
    return this.sanitizeUser(user);
  },

  generateToken(user: { id: number; email: string; role: string }) {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as 'user' | 'admin',
    };
    return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as any });
  },

  sanitizeUser(user: any) {
    const { password_hash, ...safe } = user;
    return safe;
  },
};
