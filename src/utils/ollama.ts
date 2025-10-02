export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: 'http://localhost:11434',
  model: 'gpt-oss:latest',
};

export class OllamaClient {
  private config: OllamaConfig;

  constructor(config?: Partial<OllamaConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async chat(messages: Message[]): Promise<string> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling Ollama:', error);
      throw error;
    }
  }

  async streamChat(
    messages: Message[],
    onChunk: (chunk: string) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error streaming from Ollama:', error);
      throw error;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      const data = await response.json();
      return data.models.map((m: any) => m.name);
    } catch (error) {
      console.error('Error listing models:', error);
      return ['llama2']; // Fallback
    }
  }

  setModel(model: string) {
    this.config.model = model;
  }

  setBaseUrl(baseUrl: string) {
    this.config.baseUrl = baseUrl;
  }
}
