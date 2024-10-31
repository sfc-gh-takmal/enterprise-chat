import { NextApiRequest, NextApiResponse } from 'next';
import { createConnection } from '@/lib/snowflake-connection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { conversation_id, user_id, title, model } = req.body;
    let connection;

    console.log('Received request body:', req.body);

    if (!conversation_id || !user_id || !model) {
      return res.status(400).json({ error: 'conversation_id, user_id, and model are required' });
    }

    try {
      connection = await createConnection();
      console.log('Connection created successfully');

      const binds = [conversation_id, user_id, title || null, model];
      console.log('Executing query with binds:', binds);

      const result = await connection.execute({
        sqlText: `INSERT INTO LLM_API.CHAT.CONVERSATIONS (conversation_id, user_id, title, model) VALUES (?, ?, ?, ?)`,
        binds: binds,
      });
      console.log('Query executed successfully', result);

      // Explicitly commit the transaction
      await connection.execute({ sqlText: 'COMMIT' });
      console.log('Transaction committed');

      res.status(200).json({ message: 'Conversation created successfully', conversation_id });
    } catch (error) {
      console.error('Error in /api/snowflake-db/conversations:', error);
      // Rollback the transaction in case of error
      if (connection) {
        await connection.execute({ sqlText: 'ROLLBACK' });
        console.log('Transaction rolled back');
      }
      res.status(500).json({ error: 'Error creating conversation', details: error.message });
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