import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('orders', (table) => {
    table.integer('rating').nullable();
    table.text('review_text').nullable();
    table.timestamp('reviewed_at').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('orders', (table) => {
    table.dropColumn('rating');
    table.dropColumn('review_text');
    table.dropColumn('reviewed_at');
  });
}
