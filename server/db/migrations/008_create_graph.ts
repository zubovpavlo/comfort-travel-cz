import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('graph_edges', (table) => {
    table.increments('id').primary();
    table.integer('source').notNullable();
    table.integer('target').notNullable();
    table.double('cost').notNullable();
    table.double('reverse_cost').notNullable();
    table.integer('connection_id').nullable().references('id').inTable('transport_connections').onDelete('CASCADE');
    table.enum('transport_type', ['train', 'bus']).notNullable();
    table.integer('duration_minutes').notNullable();
    table.decimal('price_czk', 8, 2).notNullable();

    table.index('source');
    table.index('target');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('graph_edges');
}
