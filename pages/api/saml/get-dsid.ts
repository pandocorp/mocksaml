import type { NextApiRequest, NextApiResponse } from 'next';
import { searchUserByEmail } from '../../../lib/ldap';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Search for user in LDAP by email
    const ldapUser = await searchUserByEmail(email);
    
    if (!ldapUser) {
      return res.status(404).json({ 
        error: 'User not found in LDAP',
        dsid: null 
      });
    }

    // Return the DSID (employeeID) from LDAP
    const dsid = ldapUser.employeeID || ldapUser.alternateDsId || null;

    res.status(200).json({ 
      success: true,
      dsid,
      user: {
        email: ldapUser.mail || email,
        firstName: ldapUser.givenName,
        lastName: ldapUser.sn,
        employeeID: ldapUser.employeeID
      }
    });
  } catch (error) {
    console.error('Failed to get DSID from LDAP:', error);
    res.status(500).json({ 
      error: 'Failed to get DSID from LDAP',
      dsid: null 
    });
  }
}
