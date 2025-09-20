/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('api_usage', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('client_id').notNullable().references('id').inTable('clients').onDelete('CASCADE');
    table.enum('api_service', ['openai_gpt4', 'anthropic_claude', 'perplexity']).notNullable();
    table.integer('tokens_used').notNullable().defaultTo(0);
    table.decimal('cost', 10, 6).notNullable().defaultTo(0);
    table.string('endpoint', 100).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['client_id']);
    table.index(['api_service']);
    table.index(['created_at']);
    table.index(['client_id', 'created_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('api_usage');
};
