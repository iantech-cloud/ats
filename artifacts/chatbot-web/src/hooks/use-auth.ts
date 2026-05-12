import { useState, useCallback } from 'react';
import { useFetchSession, getFetchSessionQueryKey } from '@workspace/api-client-react';

const PHONE_KEY = 'chatconnect_phone';
const TOKEN_KEY = 'chatconnect_token';

export function useAuth() {
  const [phone, setPhoneState] = useState<string | null>(() => {
    return localStorage.getItem(PHONE_KEY);
  });

  const [sessionToken, setSessionTokenState] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });

  const setPhone = useCallback((newPhone: string) => {
    localStorage.setItem(PHONE_KEY, newPhone);
    setPhoneState(newPhone);
  }, []);

  const setSessionToken = useCallback((token: string | null) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    setSessionTokenState(token);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(PHONE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setPhoneState(null);
    setSessionTokenState(null);
  }, []);

  const { data: session, isLoading } = useFetchSession(
    { phone: phone || '' },
    {
      query: {
        queryKey: getFetchSessionQueryKey({ phone: phone || '' }),
        enabled: !!phone,
      },
    }
  );

  return {
    phone,
    setPhone,
    sessionToken,
    setSessionToken,
    clearAuth,
    session,
    isLoadingSession: isLoading,
  };
}
