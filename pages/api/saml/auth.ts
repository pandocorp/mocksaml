import { createHash } from 'crypto';
import config from 'lib/env';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { User } from 'types';
import saml from '@boxyhq/saml20';
import { getEntityId } from 'lib/entity-id';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { email, audience, acsUrl, id, relayState, dsid, SAMLRequest } = req.body;

    // Basic email validation - you can customize this based on your requirements
    if (!email || !email.includes('@')) {
      res.status(400).send('Valid email is required');
      return;
    }

    // Validate required fields
    if (!dsid) {
      res.status(400).send('DSID is required');
      return;
    }

    // Handle SAMLRequest if provided
    let samlParams = { audience, acsUrl, id };
    if (SAMLRequest) {
      try {
        const decodedRequest = Buffer.from(SAMLRequest, 'base64').toString('utf8');
        // Extract basic params from SAML request (simplified)
        const audienceMatch = decodedRequest.match(/<saml:Audience>(.*?)<\/saml:Audience>/);
        const acsMatch = decodedRequest.match(/AssertionConsumerServiceURL="([^"]*)"/);
        const idMatch = decodedRequest.match(/ID="([^"]*)"/);
        
        samlParams = {
          audience: audienceMatch ? audienceMatch[1] : audience,
          acsUrl: acsMatch ? acsMatch[1] : acsUrl,
          id: idMatch ? idMatch[1] : id,
        };
      } catch (error) {
        console.error('Failed to decode SAMLRequest:', error);
      }
    }

    // Extract name from email
    const extractNameFromEmail = (email: string): { firstName: string; lastName: string } => {
      const localPart = email.split('@')[0];
      // Try to split by common separators
      const parts = localPart.split(/[._-]/);
      
      if (parts.length >= 2) {
        return {
          firstName: parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase(),
          lastName: parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase()
        };
      }
      
      // If no separator found, use the whole local part as first name
      return {
        firstName: localPart.charAt(0).toUpperCase() + localPart.slice(1).toLowerCase(),
        lastName: localPart.charAt(0).toUpperCase() + localPart.slice(1).toLowerCase()
      };
    };

    // Create user object with provided data (DSID already validated from frontend)
    const userId = createHash('sha256').update(email).digest('hex');
    const { firstName, lastName } = extractNameFromEmail(email);

    const user: User = {
      id: userId,
      email,
      firstName,
      lastName,
      DSID: dsid,
    };

    const xmlSigned = await saml.createSAMLResponse({
      issuer: getEntityId(config.entityId, req.query.namespace as any),
      audience: samlParams.audience,
      acsUrl: samlParams.acsUrl,
      requestId: samlParams.id,
      claims: {
        email: user.email,
        DSID: user.DSID,
        raw: user,
      },
      privateKey: config.privateKey,
      publicKey: config.publicKey,
    });

    const encodedSamlResponse = Buffer.from(xmlSigned).toString('base64');
    const html = saml.createPostForm(samlParams.acsUrl, [
      {
        name: 'RelayState',
        value: relayState,
      },
      {
        name: 'SAMLResponse',
        value: encodedSamlResponse,
      },
    ]);

    res.send(html);
  } else {
    res.status(405).send(`Method ${req.method} Not Allowed`);
  }
}
