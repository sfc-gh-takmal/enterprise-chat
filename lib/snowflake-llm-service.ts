import axios from 'axios';

interface SnowflakeLLMMessage {
  role?: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMConfig {
  maxTokens?: number;
  maxMessages?: number;
}

class SnowflakeLLMService {
  private config: LLMConfig;

  constructor(config: LLMConfig = { maxTokens: 4000, maxMessages: 10 }) {
    this.config = config;
  }

  private truncateMessages(messages: SnowflakeLLMMessage[]): SnowflakeLLMMessage[] {
    if (!this.config.maxMessages) return messages;
    return messages.slice(-this.config.maxMessages);
  }

  async complete(messages: SnowflakeLLMMessage[], model: string = 'mistral-large'): Promise<string> {
    try {
      console.log('Sending request to /api/snowflake-llm');
      const truncatedMessages = this.truncateMessages(messages);
      const response = await axios.post('/api/snowflake-llm', { 
        model, 
        messages: truncatedMessages,
        max_tokens: this.config.maxTokens 
      });
      console.log('Received response from /api/snowflake-llm:', response.data);
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling Snowflake LLM API:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: error.config,
        });
      }
      throw new Error(error.response?.data?.error || error.message);
    }
  }
}

export default SnowflakeLLMService;