/**
 * Gemini Client with API Key Rotation
 * Automatically falls back to backup API key if primary is exhausted
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './logger';

export class GeminiClient {
  private static instance: GeminiClient | null = null;
  private apiKeys: string[] = [];
  private currentKeyIndex: number = 0;
  private genAI: GoogleGenerativeAI | null = null;
  private initialized: boolean = false;

  private constructor() {
    // Constructor is now empty - initialization happens on first use
  }

  /**
   * Initialize the client (lazy initialization)
   */
  private initialize(): void {
    if (this.initialized) {
      return;
    }

    // Load API keys from environment
    const primaryKey = process.env.GEMINI_API_KEY;
    const fallbackKey = process.env.GEMINI_API_KEY_FALLBACK;

    this.apiKeys = [primaryKey, fallbackKey].filter(Boolean) as string[];

    if (this.apiKeys.length === 0) {
      logger.warn('No Gemini API keys configured. AI features will be disabled.');
    } else {
      logger.info(`Gemini client initialized with ${this.apiKeys.length} API key(s)`);
      this.initializeClient();
    }

    this.initialized = true;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): GeminiClient {
    if (!GeminiClient.instance) {
      GeminiClient.instance = new GeminiClient();
    }
    return GeminiClient.instance;
  }

  /**
   * Initialize the GoogleGenerativeAI client with current API key
   */
  private initializeClient(): void {
    if (this.apiKeys.length > 0) {
      const currentKey = this.apiKeys[this.currentKeyIndex];
      this.genAI = new GoogleGenerativeAI(currentKey);
      logger.debug(`Using API key #${this.currentKeyIndex + 1}`);
    }
  }

  /**
   * Rotate to next available API key
   */
  private rotateApiKey(): boolean {
    if (this.currentKeyIndex < this.apiKeys.length - 1) {
      this.currentKeyIndex++;
      this.initializeClient();
      logger.warn(`API key exhausted. Rotating to fallback key #${this.currentKeyIndex + 1}`);
      return true;
    }
    logger.error('All API keys exhausted. No more fallbacks available.');
    return false;
  }

  /**
   * Check if quota error occurred
   */
  private isQuotaError(error: any): boolean {
    const quotaErrorPatterns = [
      'quota',
      'rate limit',
      'resource exhausted',
      '429',
      'too many requests',
    ];

    const errorString = JSON.stringify(error).toLowerCase();
    return quotaErrorPatterns.some(pattern => errorString.includes(pattern));
  }

  /**
   * Get model with automatic fallback on quota errors
   * @param modelName - Gemini model name (e.g., 'gemini-2.0-flash-exp')
   * @returns GenerativeModel instance
   */
  public async getModel(modelName: string = 'gemini-2.0-flash-exp') {
    this.initialize(); // Ensure initialized
    
    if (!this.genAI) {
      throw new Error('Gemini client not initialized. No API keys available.');
    }

    return this.genAI.getGenerativeModel({ model: modelName });
  }

  /**
   * Generate content with automatic retry on quota exhaustion
   * @param modelName - Gemini model name
   * @param prompt - The prompt to send
   * @param maxRetries - Maximum number of retries (default: number of API keys)
   * @returns Generated text response
   */
  public async generateContent(
    modelName: string,
    prompt: string,
    maxRetries?: number
  ): Promise<string> {
    this.initialize(); // Ensure initialized
    
    const retries = maxRetries ?? this.apiKeys.length;
    let lastError: any;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        if (!this.genAI) {
          throw new Error('Gemini client not initialized');
        }

        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      } catch (error: any) {
        lastError = error;
        logger.error(`Gemini API error (attempt ${attempt + 1}/${retries}):`, error.message);

        // Check if it's a quota error and we have fallback keys
        if (this.isQuotaError(error) && attempt < retries - 1) {
          const rotated = this.rotateApiKey();
          if (!rotated) {
            break; // No more keys to try
          }
          // Continue to next retry with new key
          continue;
        }

        // If not a quota error or no more retries, throw immediately
        throw error;
      }
    }

    throw lastError || new Error('Failed to generate content after all retries');
  }

  /**
   * Check if Gemini API is available
   */
  public isAvailable(): boolean {
    this.initialize(); // Ensure initialized
    return this.apiKeys.length > 0 && this.genAI !== null;
  }

  /**
   * Get current API key index (for debugging)
   */
  public getCurrentKeyIndex(): number {
    this.initialize(); // Ensure initialized
    return this.currentKeyIndex;
  }

  /**
   * Get total number of configured keys
   */
  public getTotalKeys(): number {
    this.initialize(); // Ensure initialized
    return this.apiKeys.length;
  }

  /**
   * Reset to primary key (useful for testing or manual reset)
   */
  public resetToPrimaryKey(): void {
    this.initialize(); // Ensure initialized
    if (this.apiKeys.length > 0) {
      this.currentKeyIndex = 0;
      this.initializeClient();
      logger.info('Reset to primary API key');
    }
  }
}

// Export singleton instance
export const geminiClient = GeminiClient.getInstance();
