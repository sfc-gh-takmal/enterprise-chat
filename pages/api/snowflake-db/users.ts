import { NextApiRequest, NextApiResponse } from 'next';
import { createConnection } from '@/lib/snowflake-connection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { user_id, username, email } = req.body;
    let connection;

    console.log('Received request body:', req.body);

    if (!user_id || !username) {
      return res.status(400).json({ error: 'user_id and username are required' });
    }

    try {
      connection = await createConnection();
      console.log('Connection created successfully');

      await connection.execute({ sqlText: 'BEGIN' });
      console.log('Transaction started');

      const binds = [user_id, username, email || null];
      console.log('Executing query with binds:', binds);

      const result = await connection.execute({
        sqlText: `INSERT INTO LLM_API.CHAT.USERS (user_id, username, email) VALUES (?, ?, ?)`,
        binds: binds,
      });
      console.log('Query executed successfully', result);

      await connection.execute({ sqlText: 'COMMIT' });
      console.log('Transaction committed');

      res.status(200).json({ message: 'User created successfully' });
    } catch (error) {
      console.error('Error in /api/snowflake-db/users:', error);
      if (connection) {
        await connection.execute({ sqlText: 'ROLLBACK' });
        console.log('Transaction rolled back');
      }
      res.status(500).json({ error: 'Error creating user', details: error.message });
    } finally {
      if (connection) {
        try {
          await connection.destroy();
          console.log('Connection destroyed successfully');
        } catch (destroyError) {
          console.error('Error destroying connection:', destroyError);
        }
      }
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}