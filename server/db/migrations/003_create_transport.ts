import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('carriers', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.enum('type', ['train', 'bus']).notNullable();
    table.string('logo_url', 500);
    table.string('website', 500);
  });

  await knex.schema.createTable('transport_connections', (table) => {
    table.increments('id').primary();
    table.integer('carrier_id').notNullable().references('id').inTable('carriers').onDelete('CASCADE');
    table.integer('origin_city_id').notNullable().references('id').inTable('cities').onDelete('CASCADE');
    table.integer('dest_city_id').notNullable().references('id').inTable('cities').onDelete('CASCADE');
    table.enum('transport_type', ['train', 'bus']).notNullable();
    table.time('departure_time').notNullable();
    table.time('arrival_time').notNullable();
    table.integer('duration_minutes').notNullable();
    table.decimal('price_czk', 8, 2).notNullable();
    table.enum('comfort_class', ['standard', 'comfort', 'business']).defaultTo('standard');
    table.specificType('days_of_week', 'integer[]').defaultTo('{1,2,3,4,5,6,7}');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('origin_city_id');
    table.index('dest_city_id');
    table.index(['origin_city_id', 'dest_city_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('transport_connections');
  await knex.schema.dropTableIfExists('carriers');
}
