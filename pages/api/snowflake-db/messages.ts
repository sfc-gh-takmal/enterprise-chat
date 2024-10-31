import { NextApiRequest, NextApiResponse } from 'next';
import { createConnection } from '@/lib/snowflake-connection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { message_id, conversation_id, role, content, token_count } = req.body;
    let connection;

    console.log('Received request body:', req.body);

    if (!message_id || !conversation_id || !role || !content) {
      console.error('Missing required fields:', { message_id, conversation_id, role, content });
      return res.status(400).json({ error: 'message_id, conversation_id, role, and content are required' });
    }

    try {
      connection = await createConnection();
      console.log('Connection created successfully');

      await connection.execute({ sqlText: 'BEGIN' });
      console.log('Transaction started');

      const result = await connection.execute({
        sqlText: `INSERT INTO LLM_API.CHAT.MESSAGES (message_id, conversation_id, role, content, token_count) 
                  VALUES (?, ?, ?, ?, ?)`,
        binds: [message_id, conversation_id, role, content, token_count ? parseFloat(token_count) : null],
      });
      console.log('Query executed successfully', result);

      await connection.execute({ sqlText: 'COMMIT' });
      console.log('Transaction committed');

      res.status(200).json({ message: 'Message added successfully', message_id });
    } catch (error) {
      console.error('Error in /api/snowflake-db/messages:', error);
      if (connection) {
        await connection.execute({ sqlText: 'ROLLBACK' });
        console.log('Transaction rolled back');
      }
      res.status(500).json({ error: 'Error adding message', details: error.message });
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