import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File } from 'formidable';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createConnection } from '@/lib/snowflake-connection';

export const config = {
  api: {
    bodyParser: false,
  },
};

function escapeSnowflakeString(str: string): string {
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Received file upload request');

  const form = new IncomingForm({
    keepExtensions: true,
    multiples: false,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing form data:', err);
      return res.status(500).json({ error: 'Error parsing form data' });
    }

    console.log('Parsed form data:', { fields, files });

    const fileArray = files.file as File[];
    if (!fileArray || fileArray.length === 0 || !fileArray[0].originalFilename) {
      console.error('No file uploaded or filename is missing');
      return res.status(400).json({ error: 'No file uploaded or filename is missing' });
    }

    const file = fileArray[0];
    console.log('File received:', file.originalFilename);

    const fileExtension = path.extname(file.originalFilename).toLowerCase();
    if (!['.pdf', '.csv', '.xlsx', '.xls'].includes(fileExtension)) {
      console.error('Unsupported file type:', fileExtension);
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    try {
      console.log('Attempting to create Snowflake connection');
      const connection = await createConnection();
      console.log('Snowflake connection created successfully');

      const stageName = fileExtension === '.pdf' 
        ? 'LLM_API.CHAT.UNSTRUCTURED_UPLOAD'
        : 'LLM_API.CHAT.STRUCTURED_UPLOAD';

      // Create a temporary directory
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snowflake-upload-'));
      console.log('Temporary directory created:', tempDir);

      const tempFilePath = path.join(tempDir, file.originalFilename);
      console.log('Temporary file path:', tempFilePath);

      // Copy the uploaded file to the temporary directory
      fs.copyFileSync(file.filepath, tempFilePath);
      console.log('File copied to temporary location');

      // Escape the file path and stage name for use in SQL
      const escapedTempFilePath = escapeSnowflakeString(tempFilePath);
      const escapedStageName = escapeSnowflakeString(stageName);

      const putStatement = `PUT 'file://${escapedTempFilePath}' '@${escapedStageName}' AUTO_COMPRESS=FALSE OVERWRITE=TRUE`;
      console.log('Executing PUT statement:', putStatement);
      
      await new Promise((resolve, reject) => {
        connection.execute({
          sqlText: putStatement,
          complete: (err, stmt, rows) => {
            if (err) {
              console.error('Error uploading file to Snowflake:', err);
              reject(err);
            } else {
              console.log('File uploaded successfully');
              resolve(rows);
            }
          }
        });
      });

      console.log('Listing stage contents');
      const listResult = await new Promise((resolve, reject) => {
        connection.execute({
          sqlText: `LIST '@${escapedStageName}'`,
          complete: (listErr, listStmt, listRows) => {
            if (listErr) {
              console.error('Error listing stage contents:', listErr);
              reject(listErr);
            } else {
              console.log('Stage contents after upload:', listRows);
              resolve(listRows);
            }
          }
        });
      });

      // Clean up: remove the temporary file and directory
      fs.unlinkSync(tempFilePath);
      fs.rmdirSync(tempDir);
      console.log('Temporary files cleaned up');

      res.status(200).json({ message: 'File uploaded successfully', stageContents: listResult });
    } catch (error) {
      console.error('Error in file upload process:', error);
      res.status(500).json({ error: 'Error in file upload process', details: error.message });
    }
  });
}
