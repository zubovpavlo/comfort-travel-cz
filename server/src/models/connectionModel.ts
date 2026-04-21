import db from '../config/database';

export const connectionModel = {
  async count(): Promise<number> {
    const [{ count }] = await db('transport_connections').count('id as count');
    return Number(count);
  },
};
