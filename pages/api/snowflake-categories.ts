import { NextApiRequest, NextApiResponse } from 'next';
import { createConnection } from '@/lib/snowflake-connection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const connection = await createConnection();
    
    const listTablesQuery = "SHOW TABLES";
    console.log('Checking available tables...');
    
    await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: listTablesQuery,
        complete: (err, stmt, rows) => {
          if (err) {
            console.error('Error listing tables:', err);
          } else {
            console.log('Available tables:', rows);
          }
          resolve(null);
        }
      });
    });

    const query = `
      SELECT DISTINCT relative_path 
      FROM DOCS_CHUNKS_TABLE 
      WHERE relative_path IS NOT NULL 
      ORDER BY relative_path
    `;

    console.log('Executing categories query:', query);

    const categories = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: query,
        complete: (err, stmt, rows) => {
          if (err) {
            console.error('Categories query error:', err);
            reject(err);
          } else {
            console.log('Categories query results:', rows);
            const categories = ['ALL', ...rows?.map(row => row.RELATIVE_PATH) || []];
            resolve(categories);
          }
        }
      });
    });

    res.status(200).json(categories);
  } catch (error) {
    console.error('Error in categories API:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
} 