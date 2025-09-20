import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { AIModel, AEOCategory, FixType } from '@aeo-platform/shared';
import { logger } from '../../utils/logger';
import { AIPromptTemplates } from './promptTemplates';
import { AIUsageTracker } from './usageTracker';

export interface AIRequest {
  model: AIModel;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  context?: Record<string, any>;
}

export interface AIResponse {
  content: string;
  tokensUsed: number;
  model: AIModel;
  cost: number;
  requestId: string;
}

export class AIServiceManager {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private usageTracker: AIUsageTracker;
  private promptTemplates: AIPromptTemplates;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.usageTracker = new AIUsageTracker();
    this.promptTemplates = new AIPromptTemplates();
  }

  /**
   * Route AI requests to the optimal model based on task type
   */
  async generateContent(
    category: AEOCategory,
    fixType: FixType,
    context: Record<string, any>,
    clientId: string
  ): Promise<AIResponse> {
    const model = this.selectOptimalModel(category, fixType);
    const prompt = this.promptTemplates.getPrompt(category, fixType, context);
    
    const request: AIRequest = {
      model,
      prompt,
      maxTokens: this.getMaxTokensForTask(fixType),
      temperature: this.getTemperatureForTask(fixType),
      context,
    };

    try {
      const response = await this.executeAIRequest(request);
      
      // Track usage
      await this.usageTracker.trackUsage({
        clientId,
        model: response.model,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        endpoint: `${category}/${fixType}`,
      });

      return response;
    } catch (error) {
      logger.error('AI request failed:', { error, request, clientId });
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  /**
   * Execute AI request based on model type
   */
  private async executeAIRequest(request: AIRequest): Promise<AIResponse> {
    const requestId = this.generateRequestId();
    
    switch (request.model) {
      case AIModel.OPENAI_GPT4:
        return this.executeOpenAIRequest(request, requestId);
      
      case AIModel.ANTHROPIC_CLAUDE:
        return this.executeAnthropicRequest(request, requestId);
      
      case AIModel.PERPLEXITY:
        return this.executePerplexityRequest(request, requestId);
      
      default:
        throw new Error(`Unsupported AI model: ${request.model}`);
    }
  }

  /**
   * Execute OpenAI GPT-4 request
   */
  private async executeOpenAIRequest(request: AIRequest, requestId: string): Promise<AIResponse> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert AEO (Answer Engine Optimization) specialist. Generate production-ready code fixes that can be immediately implemented.',
          },
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        max_tokens: request.maxTokens || 4000,
        temperature: request.temperature || 0.7,
      });

      const content = completion.choices[0]?.message?.content || '';
      const tokensUsed = completion.usage?.total_tokens || 0;
      const cost = this.calculateOpenAICost(tokensUsed);

      return {
        content,
        tokensUsed,
        model: AIModel.OPENAI_GPT4,
        cost,
        requestId,
      };
    } catch (error) {
      logger.error('OpenAI request failed:', { error, requestId });
      throw error;
    }
  }

  /**
   * Execute Anthropic Claude request
   */
  private async executeAnthropicRequest(request: AIRequest, requestId: string): Promise<AIResponse> {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: request.maxTokens || 4000,
        temperature: request.temperature || 0.7,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
      });

      const content = message.content[0]?.type === 'text' ? message.content[0].text : '';
      const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;
      const cost = this.calculateAnthropicCost(tokensUsed);

      return {
        content,
        tokensUsed,
        model: AIModel.ANTHROPIC_CLAUDE,
        cost,
        requestId,
      };
    } catch (error) {
      logger.error('Anthropic request failed:', { error, requestId });
      throw error;
    }
  }

  /**
   * Execute Perplexity request
   */
  private async executePerplexityRequest(request: AIRequest, requestId: string): Promise<AIResponse> {
    try {
      const response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: 'llama-3.1-sonar-large-128k-online',
          messages: [
            {
              role: 'system',
              content: 'You are an expert AEO specialist with access to real-time web data. Provide current, accurate optimization recommendations.',
            },
            {
              role: 'user',
              content: request.prompt,
            },
          ],
          max_tokens: request.maxTokens || 4000,
          temperature: request.temperature || 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0]?.message?.content || '';
      const tokensUsed = response.data.usage?.total_tokens || 0;
      const cost = this.calculatePerplexityCost(tokensUsed);

      return {
        content,
        tokensUsed,
        model: AIModel.PERPLEXITY,
        cost,
        requestId,
      };
    } catch (error) {
      logger.error('Perplexity request failed:', { error, requestId });
      throw error;
    }
  }

  /**
   * Select optimal AI model for specific task
   */
  private selectOptimalModel(category: AEOCategory, fixType: FixType): AIModel {
    // Claude excels at schema generation and technical SEO
    if (category === AEOCategory.SCHEMA_MARKUP || category === AEOCategory.TECHNICAL_SEO) {
      return AIModel.ANTHROPIC_CLAUDE;
    }

    // Perplexity for real-time competitor analysis and trends
    if (category === AEOCategory.ENTITY_OPTIMIZATION || category === AEOCategory.KNOWLEDGE_GRAPH) {
      return AIModel.PERPLEXITY;
    }

    // GPT-4 for content generation and general optimization
    return AIModel.OPENAI_GPT4;
  }

  /**
   * Get max tokens based on task complexity
   */
  private getMaxTokensForTask(fixType: FixType): number {
    switch (fixType) {
      case FixType.SCHEMA_GENERATION:
        return 6000;
      case FixType.CONTENT_REWRITE:
        return 8000;
      case FixType.FAQ_GENERATION:
        return 4000;
      default:
        return 3000;
    }
  }

  /**
   * Get temperature based on task type
   */
  private getTemperatureForTask(fixType: FixType): number {
    switch (fixType) {
      case FixType.SCHEMA_GENERATION:
      case FixType.TECHNICAL_FIX:
        return 0.3; // More deterministic for technical tasks
      case FixType.CONTENT_REWRITE:
      case FixType.FAQ_GENERATION:
        return 0.7; // More creative for content tasks
      default:
        return 0.5;
    }
  }

  /**
   * Calculate cost for OpenAI usage
   */
  private calculateOpenAICost(tokens: number): number {
    return (tokens / 1000) * 0.03; // $0.03 per 1K tokens
  }

  /**
   * Calculate cost for Anthropic usage
   */
  private calculateAnthropicCost(tokens: number): number {
    return (tokens / 1000) * 0.015; // $0.015 per 1K tokens
  }

  /**
   * Calculate cost for Perplexity usage
   */
  private calculatePerplexityCost(tokens: number): number {
    return (tokens / 1000) * 0.02; // $0.02 per 1K tokens
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Health check for all AI services
   */
  async healthCheck(): Promise<Record<AIModel, boolean>> {
    const results: Record<AIModel, boolean> = {
      [AIModel.OPENAI_GPT4]: false,
      [AIModel.ANTHROPIC_CLAUDE]: false,
      [AIModel.PERPLEXITY]: false,
    };

    // Test OpenAI
    try {
      await this.openai.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5,
      });
      results[AIModel.OPENAI_GPT4] = true;
    } catch (error) {
      logger.warn('OpenAI health check failed:', error);
    }

    // Test Anthropic
    try {
      await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Test' }],
      });
      results[AIModel.ANTHROPIC_CLAUDE] = true;
    } catch (error) {
      logger.warn('Anthropic health check failed:', error);
    }

    // Test Perplexity
    try {
      await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: 'llama-3.1-sonar-large-128k-online',
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 5,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      results[AIModel.PERPLEXITY] = true;
    } catch (error) {
      logger.warn('Perplexity health check failed:', error);
    }

    return results;
  }
}
