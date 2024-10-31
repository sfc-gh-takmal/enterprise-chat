import { NextApiRequest, NextApiResponse } from 'next';
import { createConnection } from '@/lib/snowflake-connection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, category } = req.body;
    console.log('Search request received:', { query, category });
    const connection = await createConnection();

    // First, test if we can access the table
    const testQuery = `SELECT COUNT(*) as count FROM DOCS_CHUNKS_TABLE`;
    console.log('Testing table access with query:', testQuery);
    
    await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: testQuery,
        complete: (err, stmt, rows) => {
          if (err) {
            console.error('Test query error:', err);
          } else {
            console.log('Test query results:', rows?.[0]);
          }
          resolve(null);
        }
      });
    });

    let filterStr = '';
    if (category && category !== 'ALL') {
      filterStr = `, "filter": {"@eq": {"relative_path": "${category}"} }`;
    }

    // Now execute the search query
    const searchQuery = `
      SELECT PARSE_JSON(
        SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
          'ENTERPRISE_SEARCH_SERVICE',
          '{
            "query": "${query.replace(/"/g, '\\"')}",
            "columns": ["chunk", "relative_path", "category"]
            ${filterStr},
            "limit": 5
          }'
        )
      )['results']::variant as results;
    `;

    console.log('Executing search query:', searchQuery);

    const results = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: searchQuery,
        complete: (err, stmt, rows) => {
          if (err) {
            console.error('Search query error:', err);
            reject(err);
          } else {
            console.log('Search results:', rows?.[0]?.RESULTS);
            resolve(rows?.[0]?.RESULTS);
          }
        }
      });
    });

    console.log('Sending search results to client:', results);
    res.status(200).json({ results });
  } catch (error) {
    console.error('Error in search API:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
} 