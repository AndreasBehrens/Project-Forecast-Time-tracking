import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { deviceTimeZone } from './utils/timeZone';

// Gerätezeitzone bei jedem API-Aufruf mitsenden (Header X-Time-Zone).
// Der Server nutzt sie nur, wenn im Profil keine Zeitzone hinterlegt ist.
const nativeFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const sameOriginApi = url.startsWith('/api') || url.startsWith(`${window.location.origin}/api`);
  if (!sameOriginApi) return nativeFetch(input, init);
  const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
  if (!headers.has('x-time-zone')) headers.set('x-time-zone', deviceTimeZone());
  const token = localStorage.getItem('insight_arcs_auth_jwt_token');
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  return nativeFetch(input, { ...init, headers });
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
