/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('fixes', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('analysis_id').notNullable().references('id').inTable('analyses').onDelete('CASCADE');
    table.enum('category', [
      'faq_schema',
      'schema_markup', 
      'content_structure',
      'featured_snippets',
      'entity_optimization',
      'meta_tags',
      'semantic_html',
      'voice_search',
      'knowledge_graph',
      'technical_seo'
    ]).notNullable();
    table.enum('fix_type', [
      'faq_generation',
      'schema_generation',
      'content_rewrite',
      'meta_optimization',
      'html_restructure',
      'technical_fix'
    ]).notNullable();
    table.string('title', 200).notNullable();
    table.text('description').notNullable();
    table.text('fix_code').notNullable();
    table.enum('language', ['json-ld', 'html', 'css', 'javascript', 'markdown']).notNullable();
    table.enum('severity', ['critical', 'high', 'medium', 'low']).notNullable();
    table.enum('ai_model_used', ['openai_gpt4', 'anthropic_claude', 'perplexity']).notNullable();
    table.boolean('implemented').defaultTo(false);
    table.integer('estimated_impact').notNullable().defaultTo(0);
    table.text('implementation_guide');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['analysis_id']);
    table.index(['category']);
    table.index(['fix_type']);
    table.index(['severity']);
    table.index(['implemented']);
    table.index(['created_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('fixes');
};
