import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('orders', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.specificType('outbound_connection_ids', 'integer[]').defaultTo('{}');
    table.specificType('return_connection_ids', 'integer[]').defaultTo('{}');
    table.integer('accommodation_id').nullable().references('id').inTable('accommodations').onDelete('SET NULL');
    table.integer('nights').defaultTo(0);
    table.decimal('total_price_czk', 10, 2).notNullable();
    table.enum('status', ['confirmed', 'cancelled']).defaultTo('confirmed');
    table.string('payment_ref', 100);
    table.jsonb('route_snapshot');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('orders');
}
