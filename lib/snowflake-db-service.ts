import axios from 'axios';

interface User {
  user_id: string;
  username: string;
  email?: string;
}

interface Conversation {
  conversation_id: string;
  user_id: string;
  title?: string;
  model: string;
}

interface Message {
  message_id: string;
  conversation_id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  token_count?: number;
}

class SnowflakeDBService {
  async createUser(user: User): Promise<void> {
    console.log('Creating user:', user);
    try {
      const response = await axios.post('/api/snowflake-db/users', user);
      console.log('User creation response:', response.data);
    } catch (error) {
      console.error('Error creating user:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', error.response?.data);
      }
      throw error;
    }
  }

  async createConversation(conversation: Conversation): Promise<string> {
    console.log('Creating conversation:', conversation);
    try {
      const response = await axios.post('/api/snowflake-db/conversations', conversation);
      console.log('Conversation creation response:', response.data);
      if (!response.data.conversation_id) {
        throw new Error('Failed to create conversation: No conversation_id returned');
      }
      return response.data.conversation_id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', error.response?.data);
      }
      throw error;
    }
  }

  async addMessage(message: Message): Promise<void> {
    console.log('Adding message:', message);
    try {
      const response = await axios.post('/api/snowflake-db/messages', message);
      console.log('Message addition response:', response.data);
    } catch (error) {
      console.error('Error adding message:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', error.response?.data);
        console.error('Axios error status:', error.response?.status);
        console.error('Axios error headers:', error.response?.headers);
      }
      throw error;
    }
  }

  async getConversations(user_id: string): Promise<Conversation[]> {
    const response = await axios.get(`/api/snowflake-db/conversations?user_id=${user_id}`);
    return response.data;
  }

  async getMessages(conversation_id: string): Promise<Message[]> {
    const response = await axios.get(`/api/snowflake-db/messages?conversation_id=${conversation_id}`);
    return response.data;
  }
}

export default SnowflakeDBService;