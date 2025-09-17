import Head from 'next/head';
import { useRouter } from 'next/router';
import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export default function Login() {
  const router = useRouter();
  const { id, audience, acsUrl, providerName, relayState, namespace, SAMLRequest } = router.query;

  const authUrl = namespace ? `/api/namespace/${namespace}/saml/auth` : '/api/saml/auth';
  const getCurrentDomain = () => {
    // In development, always use cf.pandostaging.in
    if (process.env.NODE_ENV === 'development') {
      return 'https://cf.pandostaging.in';
    }
    
    // In production, use the current domain
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://cf.pandostaging.in';
  };

  const [state, setState] = useState({
    email: 'loga@example.com',
    acsUrl: `${getCurrentDomain()}/cl-sso/api/login/sso/callback/azure`,
    audience: getCurrentDomain(),
  });
  const [dsid, setDsid] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoAuth, setIsAutoAuth] = useState(false);

  const acsUrlInp = useRef<HTMLInputElement>(null);
  const emailInp = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ((SAMLRequest || (acsUrl && audience && id)) && !isAutoAuth) {
      handleAutoAuth();
    } else if (acsUrl && emailInp.current) {
      emailInp.current.focus();
      emailInp.current.select();
    } else if (acsUrlInp.current) {
      acsUrlInp.current.focus();
      acsUrlInp.current.select();
    }
  }, [SAMLRequest, acsUrl, audience, id, isAutoAuth]);

  const generateBrowserFingerprint = (): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('Browser fingerprint', 10, 10);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    // Create a hash of the fingerprint
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  };

  const handleAutoAuth = async () => {
    try {
      const email = state.email;
      
      // Validate email format
      if (!validateEmail(email)) {
        console.error('Invalid email format for auto-auth');
        setIsAutoAuth(false);
        return;
      }
      
      // Fetch DSID from LDAP using email
      const fetchedDsid = await fetchDsidFromLdap(email);
      
      if (!fetchedDsid) {
        console.error('User not found in LDAP for auto-auth');
        setIsAutoAuth(false);
        return;
      }

      setDsid(fetchedDsid);
      
      // If we have SAMLRequest, decode it to get the required params
      let authParams: any = {
        email,
        dsid: fetchedDsid,
        providerName,
        relayState,
      };

      if (SAMLRequest) {
        // For SAMLRequest, we need to decode and extract params
        authParams.SAMLRequest = SAMLRequest;
      } else {
        // For direct params
        authParams.id = id;
        authParams.audience = audience || state.audience;
        authParams.acsUrl = acsUrl || state.acsUrl;
      }
      
      const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(authParams),
      });

      if (authResponse.ok) {
        const newDoc = document.open('text/html', 'replace');
        newDoc.write(await authResponse.text());
        newDoc.close();
      } else if (authResponse.status === 302) {
        // Redirect to login page if user not found in LDAP
        window.location.href = '/saml/login';
      } else {
        document.write('Error in getting SAML response');
      }
    } catch (error) {
      console.error('Auto-auth failed:', error);
      // Fallback to manual login
      setIsAutoAuth(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

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

  const fetchDsidFromLdap = async (email: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/saml/get-dsid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      
      if (result.success && result.dsid) {
        return result.dsid;
      } else {
        console.error('Failed to fetch DSID:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error fetching DSID from LDAP:', error);
      return null;
    }
  };

  const handleChange = (e: FormEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.currentTarget;

    setState({
      ...state,
      [name]: value,
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { email } = state;
      
      // Validate email format
      if (!validateEmail(email)) {
        alert('Please enter a valid email address.');
        setIsLoading(false);
        return;
      }
      
      // Fetch DSID from LDAP using email
      const fetchedDsid = await fetchDsidFromLdap(email);
      
      if (!fetchedDsid) {
        alert('User not found in LDAP. Please check your email.');
        setIsLoading(false);
        return;
      }

      setDsid(fetchedDsid);

      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          dsid: fetchedDsid,
          id,
          audience: audience || state.audience,
          acsUrl: acsUrl || state.acsUrl,
          providerName,
          relayState,
        }),
      });

      if (response.ok) {
        const newDoc = document.open('text/html', 'replace');
        newDoc.write(await response.text());
        newDoc.close();
      } else {
        document.write('Error in getting SAML response');
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAutoAuth) {
    return (
      <div className='fixed inset-0'>
        <Head>
          <title>SAML Login - Authenticating</title>
        </Head>
        <div className='h-full w-full flex items-center justify-center relative'>
          <Image
            src='/green-bg.jpg'
            alt='Background'
            fill
            priority
            quality={100}
            className='object-cover z-0'
          />
          <div className='relative z-10 w-full max-w-md bg-white/95 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden p-8 mx-4 text-center'>
            <div className='space-y-4'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto'></div>
              <h2 className='text-xl font-semibold text-gray-800'>Authenticating...</h2>
              <p className='text-gray-600'>Fetching your profile and signing you in automatically</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='fixed inset-0'>
      <Head>
        <title>SAML Login</title>
      </Head>
      <div className='h-full w-full flex items-center justify-center relative'>
        <Image
          src='/green-bg.jpg'
          alt='Background'
          fill
          priority
          quality={100}
          className='object-cover z-0'
        />
        <div className='relative z-10 w-full max-w-md bg-white/95 backdrop-blur-sm rounded-lg shadow-xl overflow-hidden p-4 space-y-4 mx-4'>
          <form onSubmit={handleSubmit} className='space-y-3'>
            {!acsUrl ? (
              <>
                <div className='space-y-2'>
                  <label className='block text-sm font-medium text-gray-700'>ACS URL</label>
                  <input
                    type='text'
                    className='w-full px-3 py-2 text-sm border rounded-md focus:ring-1 focus:ring-emerald-500'
                    name='acsUrl'
                    id='acsUrl'
                    ref={acsUrlInp}
                    autoComplete='off'
                    placeholder='https://sso.eu.boxyhq.com/api/oauth/saml'
                    value={state.acsUrl}
                    onChange={handleChange}
                  />
                  <p className='text-xs text-gray-500'>This is where we will post the SAML Response</p>
                </div>

                <div className='space-y-2'>
                  <label className='block text-sm font-medium text-gray-700'>Audience</label>
                  <input
                    type='text'
                    className='w-full px-3 py-2 text-sm border rounded-md focus:ring-1 focus:ring-emerald-500'
                    name='audience'
                    id='audience'
                    autoComplete='off'
                    placeholder='https://saml.boxyhq.com'
                    value={state.audience}
                    onChange={handleChange}
                  />
                </div>
              </>
            ) : null}

            <div className='space-y-2'>
              <label className='block text-sm font-medium text-gray-700'>Email</label>
              <input
                name='email'
                id='email'
                ref={emailInp}
                autoComplete='off'
                type='email'
                placeholder='user@yourdomain.com'
                value={state.email}
                onChange={handleChange}
                className='w-full px-3 py-2 text-sm border rounded-md focus:ring-1 focus:ring-emerald-500'
              />
            </div>

            <div className='flex flex-row justify-between text-[13px] text-blue-600'>
              <a
                href={`/api${namespace ? `/namespace/${namespace}` : ''}/saml/metadata?download=true`}
                className='hover:underline hover:text-blue-800'>
                Download Metadata
              </a>
              <a
                href={`/api${namespace ? `/namespace/${namespace}` : ''}/saml/metadata`}
                className='hover:underline hover:text-blue-800'
                target='_blank'
                rel='noopener noreferrer'>
                Metadata URL
              </a>
            </div>

            <button 
              type='submit'
              disabled={isLoading}
              className='w-full bg-black text-white text-sm font-medium py-2 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
