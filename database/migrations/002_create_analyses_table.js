/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('analyses', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('client_id').notNullable().references('id').inTable('clients').onDelete('CASCADE');
    table.string('url', 2048).notNullable();
    table.integer('overall_score').notNullable().defaultTo(0);
    table.jsonb('category_scores').notNullable();
    table.enum('status', ['pending', 'in_progress', 'completed', 'failed']).defaultTo('pending');
    table.jsonb('scraped_data');
    table.text('error_message');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['client_id']);
    table.index(['url']);
    table.index(['status']);
    table.index(['created_at']);
    table.index(['overall_score']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('analyses');
};
