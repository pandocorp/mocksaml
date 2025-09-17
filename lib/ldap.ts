import { Client } from 'ldapts';

/**
 * Apple Directory Service for LDAP operations
 * Integrates with existing user management system to fetch directory data
 */
class AppleDirectoryService {
  private ldapConfig: {
    url: string;
    timeout: number;
    connectTimeout: number;
    baseDN: string;
    bindDN: string;
    password: string;
  };

  constructor() {
    this.ldapConfig = {
      url: process.env.LDAP_APPLE_DIRECTORY_URL || 'ldap://localhost:3893',
      timeout: parseInt(process.env.LDAP_APPLE_DIRECTORY_TIMEOUT || '10000'),
      connectTimeout: parseInt(process.env.LDAP_APPLE_DIRECTORY_CONNECT_TIMEOUT || '20000'),
      baseDN: process.env.LDAP_APPLE_DIRECTORY_BASE_DN || 'dc=glauth,dc=com',
      bindDN: process.env.LDAP_APPLE_DIRECTORY_BIND_DN || 'cn=anonymous,dc=glauth,dc=com',
      password: process.env.LDAP_APPLE_DIRECTORY_PASSWORD || '',
    };
  }

  private escapeLDAP(value: string): string {
    return value.replace(/[\0\(\)\*\\]/g, (char) => {
      switch (char) {
        case '\0': return '\\00';
        case '(': return '\\28';
        case ')': return '\\29';
        case '*': return '\\2a';
        case '\\': return '\\5c';
        default: return char;
      }
    });
  }

  /**
   * Fetch Apple Directory entries by alternate DSID
   * @param alternateDsId - The alternate DSID to search for
   * @param options - Search options
   * @returns Promise<LDAPUser | null>
   */
  async fetchAppleDirectoryEntries(alternateDsId: string, options: { attributes?: string[] } = {}): Promise<LDAPUser | null> {
    const { attributes = ['cn', 'mail', 'uid', 'givenName', 'sn', 'displayName', 'employeeid', 'alternatedsid'] } = options;

    if (!alternateDsId) {
      throw new Error('Alternate DSID is required');
    }

    if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
      throw new Error('Attributes parameter is required and must be a non-empty array.');
    }

    const client = new Client(this.ldapConfig);
    try {

      await client.bind('cn=serviceuser,dc=glauth,dc=com', '');
      const escapedDsId = this.escapeLDAP(alternateDsId);
      const filter = `(alternatedsid=${escapedDsId})`;
      
      const { searchEntries } = await client.search(this.ldapConfig.baseDN, {
        scope: 'sub',
        filter,
        attributes,
      });

      if (searchEntries.length > 0) {
        const entry = searchEntries[0];
        return {
          dn: entry.dn,
          cn: entry.cn as string,
          mail: entry.mail as string,
          uid: entry.uid as string,
          givenName: entry.givenName as string,
          sn: entry.sn as string,
          displayName: entry.displayName as string,
          employeeID: entry.employeeid as string,
          alternateDsId: entry.alternatedsid as string,
        };
      }

      return null;
    } catch (error) {
      throw new Error(`LDAP search failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await client.unbind();
    }
  }

  /**
   * Search LDAP directory by employee ID
   * @param employeeId - Employee ID to search for
   * @param options - Search options
   * @returns Promise<LDAPUser | null>
   */
  async searchByEmployeeId(employeeId: string, options: { attributes?: string[] } = {}): Promise<LDAPUser | null> {
    const { attributes = ['cn', 'mail', 'uid', 'givenName', 'sn', 'displayName', 'employeeid', 'alternatedsid'] } = options;

    if (!employeeId || typeof employeeId !== 'string') {
      throw new Error('Employee ID is required and must be a string');
    }

    if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
      throw new Error('Attributes parameter is required and must be a non-empty array.');
    }

    const client = new Client(this.ldapConfig);
    try {

      await client.bind('cn=serviceuser,dc=glauth,dc=com', '');
      const escapedEmployeeId = this.escapeLDAP(employeeId);
      const filter = `(employeeid=${escapedEmployeeId})`;
      
      const { searchEntries } = await client.search(this.ldapConfig.baseDN, {
        scope: 'sub',
        filter,
        attributes,
      });

      if (searchEntries.length > 0) {
        const entry = searchEntries[0];
        return {
          dn: entry.dn,
          cn: entry.cn as string,
          mail: entry.mail as string,
          uid: entry.uid as string,
          givenName: entry.givenName as string,
          sn: entry.sn as string,
          displayName: entry.displayName as string,
          employeeID: entry.employeeid as string,
          alternateDsId: entry.alternatedsid as string,
        };
      }

      return null;
    } catch (error) {
      throw new Error(`LDAP employee ID search failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await client.unbind();
    }
  }

  /**
   * Search LDAP directory by email
   * @param email - Email to search for
   * @param options - Search options
   * @returns Promise<LDAPUser | null>
   */
  async searchByEmail(email: string, options: { attributes?: string[] } = {}): Promise<LDAPUser | null> {
    const { attributes = ['cn', 'mail', 'uid', 'givenName', 'sn', 'displayName', 'employeeid', 'alternatedsid'] } = options;

    if (!email || typeof email !== 'string') {
      throw new Error('Email is required and must be a string');
    }

    if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
      throw new Error('Attributes parameter is required and must be a non-empty array.');
    }

    const client = new Client(this.ldapConfig);
    try {

      await client.bind('cn=serviceuser,dc=glauth,dc=com', '');
      const escapedEmail = this.escapeLDAP(email);
      const filter = `(mail=${escapedEmail})`;
      
      const { searchEntries } = await client.search(this.ldapConfig.baseDN, {
        scope: 'sub',
        filter,
        attributes,
      });

      if (searchEntries.length > 0) {
        const entry = searchEntries[0];
        return {
          dn: entry.dn,
          cn: entry.cn as string,
          mail: entry.mail as string,
          uid: entry.uid as string,
          givenName: entry.givenName as string,
          sn: entry.sn as string,
          displayName: entry.displayName as string,
          employeeID: entry.employeeid as string,
          alternateDsId: entry.alternatedsid as string,
        };
      }

      return null;
    } catch (error) {
      throw new Error(`LDAP email search failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await client.unbind();
    }
  }
}

export interface LDAPUser {
  dn: string;
  cn?: string;
  mail?: string;
  uid?: string;
  givenName?: string;
  sn?: string;
  displayName?: string;
  employeeID?: string;
  alternateDsId?: string;
}


const appleDirectoryService = new AppleDirectoryService();


export async function searchUserByProfileId(profileId: string): Promise<LDAPUser | null> {
  try {
    return await appleDirectoryService.fetchAppleDirectoryEntries(profileId);
  } catch (error) {
    console.error('LDAP search error:', error);
    return null;
  }
}

export async function searchUserByEmail(email: string): Promise<LDAPUser | null> {
  try {
    return await appleDirectoryService.searchByEmail(email);
  } catch (error) {
    console.error('LDAP search error:', error);
    return null;
  }
}

export async function searchUserByEmployeeId(employeeId: string): Promise<LDAPUser | null> {
  try {
    return await appleDirectoryService.searchByEmployeeId(employeeId);
  } catch (error) {
    console.error('LDAP search error:', error);
    return null;
  }
}


export { AppleDirectoryService };
