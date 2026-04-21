import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100);
    table.string('last_name', 100);
    table.enum('role', ['user', 'admin']).defaultTo('user').notNullable();
    table.decimal('pref_price', 3, 2).defaultTo(0.35);
    table.decimal('pref_time', 3, 2).defaultTo(0.25);
    table.decimal('pref_comfort', 3, 2).defaultTo(0.25);
    table.decimal('pref_rating', 3, 2).defaultTo(0.15);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}
