import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('accommodations', (table) => {
    table.increments('id').primary();
    table.integer('city_id').notNullable().references('id').inTable('cities').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.enum('type', ['hotel', 'hostel', 'pension', 'apartment']).notNullable();
    table.decimal('star_rating', 2, 1);
    table.decimal('user_rating', 3, 1);
    table.integer('review_count').defaultTo(0);
    table.decimal('price_per_night', 8, 2).notNullable();
    table.string('address', 500);
    table.specificType('amenities', 'text[]').defaultTo('{}');
    table.text('description');
    table.string('image_url', 500);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('city_id');
    table.index('price_per_night');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('accommodations');
}
