import Head from 'next/head';
import { useRouter } from 'next/router';
import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export default function Login() {
  const router = useRouter();
  const { id, audience, acsUrl, providerName, relayState, namespace } = router.query;

  const authUrl = namespace ? `/api/namespace/${namespace}/saml/auth` : '/api/saml/auth';
  const [state, setState] = useState({
    username: 'Loga',
    dsid: '731232425',
    acsUrl: 'https://cf.pandostaging.in/cl-sso/api/login/sso/callback/azure',
    audience: 'https://cf.pandostaging.in',
  });

  const domain = 'example.com';

  const acsUrlInp = useRef<HTMLInputElement>(null);
  const emailInp = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (acsUrl && emailInp.current) {
      emailInp.current.focus();
      emailInp.current.select();
    } else if (acsUrlInp.current) {
      acsUrlInp.current.focus();
      acsUrlInp.current.select();
    }
  }, [acsUrl]);

  const handleChange = (e: FormEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.currentTarget;

    setState({
      ...state,
      [name]: value,
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { username, dsid } = state;

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `${username}@${domain}`,
        dsid,
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
  };

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

            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-700'>Email</label>
                <input
                  name='username'
                  id='username'
                  ref={emailInp}
                  autoComplete='off'
                  type='text'
                  placeholder='jackson'
                  value={state.username}
                  onChange={handleChange}
                  className='w-full px-3 py-2 text-sm border rounded-md focus:ring-1 focus:ring-emerald-500'
                />
              </div>

              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-700'>DSID</label>
                <input
                  name='dsid'
                  id='dsid'
                  autoComplete='off'
                  type='text'
                  placeholder='Enter DSID'
                  value={state.dsid}
                  onChange={handleChange}
                  className='w-full px-3 py-2 text-sm border rounded-md focus:ring-1 focus:ring-emerald-500'
                />
              </div>
            </div>

            <div className='space-y-2'>
              <label className='block text-sm font-medium text-gray-700'>Password</label>
              <input
                id='password'
                autoComplete='off'
                type='password'
                defaultValue='iamthemaster'
                className='w-full px-3 py-2 text-sm border rounded-md focus:ring-1 focus:ring-emerald-500'
              />
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
            </div>

            <button className='w-full bg-black text-white text-sm font-medium py-2 rounded-md hover:bg-gray-800 transition-colors'>
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
