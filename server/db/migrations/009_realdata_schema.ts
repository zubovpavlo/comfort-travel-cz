import { Knex } from 'knex';

/**
 * Replace the generated-data schema with a real-data / cache schema.
 * - Drop cities, carriers, stops, graph_edges (no longer used).
 * - Drop and recreate transport_connections as a TTL cache of Transitous plan legs.
 * - Drop and recreate accommodations as a TTL cache of Overpass results.
 * - Move favorite_combos / saved_searches / orders to JSON snapshots (no FKs to cache tables).
 */
export async function up(knex: Knex): Promise<void> {
  // Drop tables that depend on the old cities/transport/accommodations.
  await knex.schema.dropTableIfExists('favorite_combos');
  await knex.schema.dropTableIfExists('saved_searches');
  await knex.schema.dropTableIfExists('orders');
  await knex.schema.dropTableIfExists('graph_edges');
  await knex.schema.dropTableIfExists('stops');
  await knex.schema.dropTableIfExists('transport_connections');
  await knex.schema.dropTableIfExists('accommodations');
  await knex.schema.dropTableIfExists('carriers');
  await knex.schema.dropTableIfExists('cities');

  // New cache: transport_connections
  await knex.schema.createTable('transport_connections', (table) => {
    table.increments('id').primary();
    table.string('external_trip_id', 200).nullable();
    table.string('origin_place_name', 500).notNullable();
    table.decimal('origin_lat', 10, 6).notNullable();
    table.decimal('origin_lon', 10, 6).notNullable();
    table.string('dest_place_name', 500).notNullable();
    table.decimal('dest_lat', 10, 6).notNullable();
    table.decimal('dest_lon', 10, 6).notNullable();
    table.enum('transport_type', ['train', 'bus', 'tram', 'metro', 'walk']).notNullable();
    table.time('departure_time').notNullable();
    table.time('arrival_time').notNullable();
    table.integer('duration_minutes').notNullable();
    table.decimal('price_czk', 10, 2).notNullable().defaultTo(0);
    table.string('carrier_name', 200).nullable();
    table.date('search_date').notNullable();
    table.timestamp('fetched_at').notNullable().defaultTo(knex.fn.now());

    table.index(['origin_place_name', 'dest_place_name', 'search_date'], 'tc_cache_key_idx');
    table.index('fetched_at');
  });

  // New cache: accommodations
  await knex.schema.createTable('accommodations', (table) => {
    table.increments('id').primary();
    table.string('external_id', 100).notNullable().unique();
    table.string('name', 300).notNullable();
    table.enum('type', ['hotel', 'hostel', 'pension', 'apartment']).notNullable();
    table.decimal('star_rating', 2, 1).nullable();
    table.decimal('user_rating', 3, 1).nullable();
    table.integer('review_count').defaultTo(0);
    table.decimal('price_per_night', 10, 2).nullable();
    table.string('address', 500).nullable();
    table.string('city_name', 200).nullable();
    table.specificType('amenities', 'text[]').defaultTo('{}');
    table.text('description').nullable();
    table.string('image_url', 1000).nullable();
    table.decimal('latitude', 10, 6).notNullable();
    table.decimal('longitude', 10, 6).notNullable();
    table.timestamp('fetched_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['latitude', 'longitude'], 'acc_coord_idx');
    table.index('fetched_at');
  });

  // favorite_combos — snapshot based
  await knex.schema.createTable('favorite_combos', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.jsonb('combo_snapshot').notNullable();
    table.decimal('total_score', 5, 3).nullable();
    table.decimal('total_price_czk', 10, 2).nullable();
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('user_id');
  });

  // saved_searches — store place snapshots
  await knex.schema.createTable('saved_searches', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.jsonb('origin_place').notNullable();
    table.jsonb('dest_place').notNullable();
    table.date('travel_date').nullable();
    table.integer('nights').defaultTo(1);
    table.jsonb('search_params').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('user_id');
  });

  // orders — snapshot based
  await knex.schema.createTable('orders', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.jsonb('outbound_snapshot').notNullable();
    table.jsonb('return_snapshot').notNullable();
    table.jsonb('accommodation_snapshot').nullable();
    table.integer('nights').defaultTo(0);
    table.decimal('total_price_czk', 10, 2).notNullable();
    table.enum('status', ['confirmed', 'cancelled']).defaultTo('confirmed');
    table.string('payment_ref', 100).nullable();
    table.jsonb('route_snapshot').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('orders');
  await knex.schema.dropTableIfExists('saved_searches');
  await knex.schema.dropTableIfExists('favorite_combos');
  await knex.schema.dropTableIfExists('accommodations');
  await knex.schema.dropTableIfExists('transport_connections');
  // The old schema is not recreated here — this is a forward-only cutover.
}
