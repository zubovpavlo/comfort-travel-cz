import { Knex } from 'knex';
import bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  await knex('users').del();

  const adminHash = await bcrypt.hash('admin123', 10);
  await knex('users').insert({
    email: 'admin@comfort-travel.cz',
    password_hash: adminHash,
    first_name: 'Admin',
    last_name: 'Systém',
    role: 'admin',
  });

  const userHash = await bcrypt.hash('user123', 10);
  await knex('users').insert({
    email: 'jan@example.cz',
    password_hash: userHash,
    first_name: 'Jan',
    last_name: 'Novák',
    role: 'user',
  });
}
