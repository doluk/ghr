/**
 * AI integration module for Gemini API
 * Provides conversational AI assistance for code review
 */

interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

export class GeminiClient {
  private apiKey: string;
  private model: string;
  private timeout: number;
  private history: GeminiMessage[] = [];
  private systemInstruction?: string;

  constructor(
    options: {
      apiKey?: string;
      model?: string;
      timeout?: number;
      systemInstruction?: string;
    } = {}
  ) {
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    this.model = options.model || 'gemini-2.0-flash-exp';
    this.timeout = options.timeout || 30000;
    this.systemInstruction = options.systemInstruction;
  }

  /**
   * Send a message and get a reply (stateless)
   */
  async reply(userText: string): Promise<string> {
    const messages: GeminiMessage[] = [];

    if (this.systemInstruction) {
      messages.push({
        role: 'user',
        parts: [{ text: this.systemInstruction }],
      });
    }

    messages.push({
      role: 'user',
      parts: [{ text: userText }],
    });

    return this.sendRequest(messages);
  }

  /**
   * Send a message in conversational mode (stateful)
   */
  async converse(userText: string): Promise<string> {
    this.history.push({
      role: 'user',
      parts: [{ text: userText }],
    });

    const response = await this.sendRequest(this.history);

    this.history.push({
      role: 'model',
      parts: [{ text: response }],
    });

    return response;
  }

  /**
   * Send request to Gemini API
   */
  private async sendRequest(messages: GeminiMessage[]): Promise<string> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const payload: Record<string, unknown> = {
      contents: messages,
    };

    if (this.systemInstruction && messages.length > 1) {
      payload.systemInstruction = {
        parts: [{ text: this.systemInstruction }],
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as GeminiResponse;

      if (
        data.candidates &&
        data.candidates.length > 0 &&
        data.candidates[0].content?.parts &&
        data.candidates[0].content.parts.length > 0
      ) {
        return data.candidates[0].content.parts[0].text || 'No response text';
      }

      throw new Error('No valid response from Gemini API');
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out');
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get conversation history
   */
  getHistory(): GeminiMessage[] {
    return [...this.history];
  }
}
