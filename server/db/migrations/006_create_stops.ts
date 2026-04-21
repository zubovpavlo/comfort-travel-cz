import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('stops', (table) => {
    table.increments('id').primary();
    table.integer('city_id').notNullable().references('id').inTable('cities').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.enum('type', ['train', 'bus', 'metro', 'tram']).notNullable();
    table.decimal('latitude', 9, 6);
    table.decimal('longitude', 9, 6);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('city_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('stops');
}
