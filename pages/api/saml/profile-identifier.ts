import { execSync } from 'child_process';
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let profileIdentifier = null;
    let profileOutput = '';

    // Try to get profile identifier from system (macOS only)
    try {
      profileOutput = execSync('profiles show -user $(whoami) | grep "profileIdentifier"', { 
        encoding: 'utf8',
        timeout: 5000 
      });
      
      // Look for any profile identifier that contains "mail"
      const mailMatch = profileOutput.match(/attribute: profileIdentifier: ([^\n]*mail[^\n]*)/);
      profileIdentifier = mailMatch ? mailMatch[1] : null;
      
      // Extract part after "mail." if it exists
      if (profileIdentifier && profileIdentifier.includes('mail.')) {
        const extractedMatch = profileIdentifier.match(/mail\.(.+)/);
        profileIdentifier = extractedMatch ? extractedMatch[1] : profileIdentifier;
      }
    } catch (profileError) {
      // profiles command not available (likely in Docker container)
      console.log('profiles command not available, using fallback');
      
      // Fallback: generate a default profile identifier
      // This could be based on environment variables or other logic
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
