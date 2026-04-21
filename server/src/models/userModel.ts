import db from '../config/database';
import { User } from '../types';

export const userModel = {
  async findByEmail(email: string): Promise<User | undefined> {
    return db('users').where({ email }).first();
  },

  async findById(id: number): Promise<User | undefined> {
    return db('users').where({ id }).first();
  },

  async create(data: Partial<User>): Promise<User> {
    const [user] = await db('users').insert(data).returning('*');
    return user;
  },

  async update(id: number, data: Partial<User>): Promise<User | undefined> {
    const updated = { ...data, updated_at: new Date() };
    const [user] = await db('users').where({ id }).update(updated).returning('*');
    return user;
  },

  async delete(id: number): Promise<boolean> {
    const count = await db('users').where({ id }).del();
    return count > 0;
  },

  async findAll(page = 1, limit = 20): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;
    const [users, [{ count }]] = await Promise.all([
      db('users').select('id', 'email', 'first_name', 'last_name', 'role', 'created_at').orderBy('created_at', 'desc').offset(offset).limit(limit),
      db('users').count('id as count'),
    ]);
    return { users, total: Number(count) };
  },

  async count(): Promise<number> {
    const [{ count }] = await db('users').count('id as count');
    return Number(count);
  },
};
