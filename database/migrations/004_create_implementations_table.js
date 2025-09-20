/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('implementations', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('client_id').notNullable().references('id').inTable('clients').onDelete('CASCADE');
    table.uuid('fix_id').notNullable().references('id').inTable('fixes').onDelete('CASCADE');
    table.timestamp('implemented_at').notNullable().defaultTo(knex.fn.now());
    table.integer('impact_score');
    table.text('notes');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['client_id']);
    table.index(['fix_id']);
    table.index(['implemented_at']);
    
    // Unique constraint to prevent duplicate implementations
    table.unique(['client_id', 'fix_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('implementations');
};
