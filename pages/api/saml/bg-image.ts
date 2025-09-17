import { NextApiRequest, NextApiResponse } from 'next';
import { readFile } from 'fs';
import { join } from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const imagePath = join(process.cwd(), 'public', 'green-bg.jpg');
    
    readFile(imagePath, (err, data) => {
      if (err) {
        console.error('Error reading image:', err);
        return res.status(404).json({ error: 'Image not found' });
      }

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(data);
    });
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
