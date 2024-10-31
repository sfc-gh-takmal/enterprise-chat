interface SearchResult {
  results: Array<{
    chunk: string;
    relative_path: string;
    file_url: string;
    category: string;
    [key: string]: any;
  }>;
  request_id: string;
}

export class SnowflakeSearchService {
  async searchDocuments(query: string, category?: string): Promise<SearchResult> {
    try {
      const response = await fetch('/api/snowflake-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, category }),
      });

      if (!response.ok) {
        throw new Error(`Search request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in searchDocuments:', error);
      throw error;
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const response = await fetch('/api/snowflake-categories');
      
      if (!response.ok) {
        throw new Error(`Categories request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  }
} 