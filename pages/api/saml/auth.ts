import { createHash } from 'crypto';
import config from 'lib/env';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { User } from 'types';
import saml from '@boxyhq/saml20';
import { getEntityId } from 'lib/entity-id';
import { searchUserByProfileId, searchUserByEmail } from 'lib/ldap';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { email, audience, acsUrl, id, relayState, dsid, SAMLRequest } = req.body;

    if (!email.endsWith('@example.com') && !email.endsWith('@example.org')) {
      res.status(403).send(`${email} denied access`);
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

    // Try to get user from LDAP using profile ID (dsid) as alternateDsId
    let ldapUser = null;
    if (dsid) {
      try {
        ldapUser = await searchUserByProfileId(dsid);
      } catch (error) {
        console.error('LDAP search by profile ID failed:', error);
      }
    }

    // If no user found with alternateDsId, redirect to login page
    if (!ldapUser) {
      res.status(302).redirect('/saml/login');
      return;
    }

    // Use LDAP data and replace dsid with employeeID
    const userId = ldapUser.uid || createHash('sha256').update(email).digest('hex');
    const firstName = ldapUser.givenName || email.split('@')[0];
    const lastName = ldapUser.sn || email.split('@')[0];
    const userEmail = ldapUser.mail || email;
    const finalDsid = ldapUser.employeeID || dsid;

    const user: User = {
      id: userId,
      email: userEmail,
      firstName,
      lastName,
      DSID: finalDsid,
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
