import { AEOCategory, FixType } from '@aeo-platform/shared';

export class AIPromptTemplates {
  /**
   * Get the appropriate prompt template for a specific category and fix type
   */
  getPrompt(category: AEOCategory, fixType: FixType, context: Record<string, any>): string {
    const templateKey = `${category}_${fixType}`;
    const template = this.templates[templateKey] || this.templates.default;
    
    return this.interpolateTemplate(template, context);
  }

  /**
   * Interpolate template variables with context data
   */
  private interpolateTemplate(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key] || match;
    });
  }

  private templates: Record<string, string> = {
    // FAQ Schema Generation
    [`${AEOCategory.FAQ_SCHEMA}_${FixType.FAQ_GENERATION}`]: `
Analyze the following webpage content and generate 5-8 FAQ entries optimized for voice search and featured snippets.

URL: {{url}}
Page Title: {{title}}
Content: {{content}}
Current Meta Description: {{metaDescription}}

Requirements:
1. Generate questions that real users would ask about this topic
2. Provide concise, direct answers (40-60 words each)
3. Use natural, conversational language for voice search
4. Include long-tail keywords naturally
5. Format as complete JSON-LD FAQ schema

Output the complete JSON-LD schema code that can be directly inserted into the page's <head> section.

Example format:
\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is...",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "..."
      }
    }
  ]
}
\`\`\`
`,

    // Schema Markup Generation
    [`${AEOCategory.SCHEMA_MARKUP}_${FixType.SCHEMA_GENERATION}`]: `
Generate comprehensive schema markup for the following webpage content.

URL: {{url}}
Page Title: {{title}}
Content Type: {{contentType}}
Content: {{content}}
Images: {{images}}
Author: {{author}}
Published Date: {{publishedDate}}
Organization: {{organization}}

Requirements:
1. Identify the most appropriate schema types for this content
2. Generate complete, valid JSON-LD markup
3. Include all relevant properties with actual data from the page
4. Ensure schema validation compliance
5. Add breadcrumb schema if applicable
6. Include organization/website schema

Possible schema types to consider:
- Article/BlogPosting
- Product
- LocalBusiness
- Organization
- Person
- HowTo
- Recipe
- Event
- BreadcrumbList

Output multiple schema blocks if needed, each as separate JSON-LD scripts.
`,

    // Content Structure Optimization
    [`${AEOCategory.CONTENT_STRUCTURE}_${FixType.CONTENT_REWRITE}`]: `
Rewrite the following content to be optimized for AI/LLM comprehension and featured snippets.

Original Content: {{content}}
Target Keywords: {{keywords}}
Content Type: {{contentType}}

Requirements:
1. Create clear H2/H3 hierarchy with descriptive headings
2. Write concise intro paragraph (50-60 words) that directly answers the main query
3. Use bullet points for key information
4. Add definition boxes for important terms
5. Include a TL;DR summary at the end
6. Optimize for question-based queries
7. Maintain the original meaning and expertise level

Structure the output as:
1. Optimized title (H1)
2. Intro paragraph
3. Main content with proper heading hierarchy
4. Key points in bullet format
5. TL;DR summary

Use markdown formatting for the output.
`,

    // Meta Tags Optimization
    [`${AEOCategory.META_TAGS}_${FixType.META_OPTIMIZATION}`]: `
Generate optimized meta tags for the following webpage.

URL: {{url}}
Page Title: {{title}}
Content: {{content}}
Target Keywords: {{keywords}}
Business Type: {{businessType}}
Location: {{location}}

Requirements:
1. Title tag (55-60 characters) with primary keyword
2. Meta description (150-160 characters) that encourages clicks
3. Open Graph tags for social sharing
4. Twitter Card tags
5. AI-specific meta tags
6. Canonical URL
7. Robots meta tag

Output as complete HTML meta tags ready for implementation:

\`\`\`html
<!-- Primary Meta Tags -->
<title>...</title>
<meta name="description" content="...">
<meta name="keywords" content="...">
<link rel="canonical" href="...">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="...">
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="...">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="...">
<meta property="twitter:title" content="...">
<meta property="twitter:description" content="...">
<meta property="twitter:image" content="...">
\`\`\`
`,

    // Featured Snippets Optimization
    [`${AEOCategory.FEATURED_SNIPPETS}_${FixType.CONTENT_REWRITE}`]: `
Optimize the following content for featured snippet capture.

Content: {{content}}
Target Query: {{targetQuery}}
Snippet Type: {{snippetType}} (paragraph, list, table, or definition)

Requirements:
1. Create content that directly answers the target query
2. Use the optimal format for the snippet type:
   - Paragraph: 40-60 words, direct answer
   - List: Ordered or unordered list with 3-8 items
   - Table: Structured data in table format
   - Definition: Clear, concise definition in 1-2 sentences

3. Include the question as a heading (H2 or H3)
4. Place the answer immediately after the heading
5. Use natural language that matches search intent
6. Include relevant keywords naturally

Output the optimized content section in HTML format.
`,

    // Entity Optimization
    [`${AEOCategory.ENTITY_OPTIMIZATION}_${FixType.CONTENT_REWRITE}`]: `
Analyze and optimize entity coverage for the following content.

Content: {{content}}
Main Topic: {{mainTopic}}
Industry: {{industry}}
Current Entities: {{currentEntities}}

Requirements:
1. Identify missing important entities related to the topic
2. Suggest semantic keyword clusters
3. Recommend internal linking opportunities with anchor text
4. Identify content gaps that should be filled
5. Suggest related topics to cover

Output:
1. List of missing entities to include
2. Semantic keyword clusters organized by topic
3. Internal linking suggestions with specific anchor text
4. Content gap analysis with new sections to add
5. Related entity connections to strengthen

Format as actionable recommendations with specific implementation guidance.
`,

    // Voice Search Optimization
    [`${AEOCategory.VOICE_SEARCH}_${FixType.CONTENT_REWRITE}`]: `
Optimize the following content for voice search queries.

Content: {{content}}
Location: {{location}}
Business Type: {{businessType}}

Requirements:
1. Rewrite content to answer conversational questions
2. Use natural, spoken language patterns
3. Include question-based headings (Who, What, When, Where, Why, How)
4. Optimize for local voice searches if applicable
5. Create content that sounds natural when read aloud
6. Include long-tail, conversational keywords

Focus on these voice search patterns:
- "Near me" queries
- Question-based queries
- Conversational phrases
- Local intent queries

Output the optimized content with clear headings and natural language answers.
`,

    // Technical SEO
    [`${AEOCategory.TECHNICAL_SEO}_${FixType.TECHNICAL_FIX}`]: `
Analyze and provide technical SEO recommendations for the following website.

URL: {{url}}
Current Issues: {{technicalIssues}}
Page Speed: {{pageSpeed}}
Mobile Friendliness: {{mobileFriendly}}

Requirements:
1. Robots.txt recommendations
2. XML sitemap improvements
3. Page speed optimization suggestions
4. Core Web Vitals fixes
5. Mobile optimization recommendations
6. Crawlability improvements

Output specific, actionable technical fixes with code examples where applicable.
`,

    // Default template
    default: `
Analyze the following content and provide AEO optimization recommendations.

Content: {{content}}
URL: {{url}}
Category: {{category}}
Fix Type: {{fixType}}

Provide specific, actionable recommendations with code examples where applicable.
`,
  };
}
