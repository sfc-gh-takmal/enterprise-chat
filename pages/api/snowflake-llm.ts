import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import * as jsrsasign from 'jsrsasign';

interface SnowflakeLLMConfig {
  accountIdentifier: string;
  privateKey: string;
  userId: string;
}

const config: SnowflakeLLMConfig = {
  accountIdentifier: process.env.SNOWFLAKE_ACCOUNT_IDENTIFIER || '',
  privateKey: process.env.SNOWFLAKE_PRIVATE_KEY || '',
  userId: process.env.SNOWFLAKE_USER_ID || '',
};

function calculatePublicKeyFingerprint(): string {
  // This is a placeholder. You'll need to implement the actual fingerprint calculation.
  return 'WrzCmsFQ9LcZ2QuNLWWi25q9Jp7PFr9iMG9qaZclIKU=';
}

function generateJWT(): string {
  const now = Math.floor(Date.now() / 1000);
  
  // Get the account identifier and user from env vars
  const accountIdentifier = process.env.SNOWFLAKE_ACCOUNT;
  const username = process.env.SNOWFLAKE_USER;
  
  if (!accountIdentifier || !username) {
    throw new Error('Missing required environment variables for JWT generation');
  }

  const payload = {
    // Include account identifier in both iss and sub
    iss: `${accountIdentifier}.${username}.SHA256:${calculatePublicKeyFingerprint()}`,
    sub: `${accountIdentifier}.${username}`,
    iat: now,
    exp: now + 86400, // Token expires in 24 hours
  };

  console.log('JWT Payload:', payload);

  const header = { alg: 'RS256', typ: 'JWT' };
  const sHeader = JSON.stringify(header);
  const sPayload = JSON.stringify(payload);

  const privateKey = process.env.SNOWFLAKE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('SNOWFLAKE_PRIVATE_KEY environment variable is not set');
  }

  // Make sure the private key is properly formatted
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  return jsrsasign.KJUR.jws.JWS.sign('RS256', sHeader, sPayload, formattedPrivateKey);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Received request in /api/snowflake-llm');
    console.log('Request body:', req.body);

    const accountIdentifier = process.env.SNOWFLAKE_ACCOUNT;
    if (!accountIdentifier) {
      throw new Error('SNOWFLAKE_ACCOUNT environment variable is not set');
    }

    // Format the account identifier for the URL (lowercase and remove special characters)
    const formattedAccount = accountIdentifier.toLowerCase().replace(/_/g, '-');
    
    // Construct the Snowflake API URL with the formatted account identifier
    const apiUrl = `https://${formattedAccount}.snowflakecomputing.com/api/v2/cortex/inference:complete`;
    console.log('Snowflake API URL:', apiUrl);

    const token = generateJWT();
    console.log('Generated JWT token:', token);
    console.log('Token length:', token.length);

    console.log('Sending request to Snowflake API');
    const response = await axios.post(apiUrl, {
      model: req.body.model,
      messages: req.body.messages,
      top_p: 0,
      temperature: 0
    }, {
      headers: {
        'Accept': 'application/json, text/event-stream',
        'Content-Type': 'application/json',
        'X-Snowflake-Authorization-Token-Type': 'KEYPAIR_JWT',
        'Authorization': `Bearer ${token}`
      },
      responseType: 'stream'
    });

    console.log('Received response from Snowflake API');
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Stream the response
    response.data.on('data', (chunk: Buffer) => {
      const chunkStr = chunk.toString();
      console.log('Chunk received:', chunkStr);
      res.write(chunkStr);
    });

    response.data.on('end', () => {
      console.log('Stream ended');
      res.end();
    });

  } catch (error) {
    console.error('Error in /api/snowflake-llm:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
        },
      });
    }
    return res.status(500).json({ 
      message: 'Internal Server Error', 
      error: error.message, 
      stack: error.stack,
      details: error.response?.data 
    });
  }
}