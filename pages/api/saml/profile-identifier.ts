import { execSync } from 'child_process';
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let profileIdentifier = null;
    let profileOutput = '';


    try {
      profileOutput = execSync('profiles show -user $(whoami) | grep "profileIdentifier"', { 
        encoding: 'utf8',
        timeout: 5000 
      });
      

      const mailMatch = profileOutput.match(/attribute: profileIdentifier: ([^\n]*mail[^\n]*)/);
      profileIdentifier = mailMatch ? mailMatch[1] : null;
      

      if (profileIdentifier && profileIdentifier.includes('mail.')) {
        const extractedMatch = profileIdentifier.match(/mail\.(.+)/);
        profileIdentifier = extractedMatch ? extractedMatch[1] : profileIdentifier;
      }
    } catch (profileError) {

      console.log('profiles command not available, using fallback');
      


      const defaultDomain = process.env.DEFAULT_DOMAIN || 'example.com';
      profileIdentifier = `default.${defaultDomain}`;
    }

    res.status(200).json({ 
      profileIdentifier,
      profileOutput,
      success: true 
    });
  } catch (error) {
    console.error('Failed to get profile identifier:', error);
    res.status(500).json({ 
      error: 'Failed to get profile identifier',
      profileIdentifier: null,
      success: false 
    });
  }
}
