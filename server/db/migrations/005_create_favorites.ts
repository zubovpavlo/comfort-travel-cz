import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('saved_searches', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('origin_city_id').notNullable().references('id').inTable('cities');
    table.integer('dest_city_id').notNullable().references('id').inTable('cities');
    table.date('travel_date');
    table.integer('nights').defaultTo(1);
    table.jsonb('search_params');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('favorite_combos', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('connection_outbound_id').references('id').inTable('transport_connections').onDelete('SET NULL');
    table.integer('connection_return_id').references('id').inTable('transport_connections').onDelete('SET NULL');
    table.integer('accommodation_id').references('id').inTable('accommodations').onDelete('SET NULL');
    table.decimal('total_score', 5, 3);
    table.decimal('total_price_czk', 10, 2);
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'connection_outbound_id', 'accommodation_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('favorite_combos');
  await knex.schema.dropTableIfExists('saved_searches');
}
