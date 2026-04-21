import { Knex } from 'knex';
import bcrypt from 'bcrypt';

// Idempotent seed: never wipes existing users. Only inserts admin/jan if missing
// so registered accounts survive container restarts.
export async function seed(knex: Knex): Promise<void> {
  const defaults = [
    { email: 'admin@comfort-travel.cz', password: 'admin123', first_name: 'Admin', last_name: 'Systém', role: 'admin' },
    { email: 'jan@example.cz',          password: 'user123',  first_name: 'Jan',   last_name: 'Novák',  role: 'user'  },
  ];

  for (const u of defaults) {
    const exists = await knex('users').where({ email: u.email }).first();
    if (exists) continue;
    const password_hash = await bcrypt.hash(u.password, 10);
    await knex('users').insert({
      email: u.email,
      password_hash,
      first_name: u.first_name,
      last_name: u.last_name,
      role: u.role,
    });
  }
}
