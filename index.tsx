import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ClerkProvider } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = (import.meta as any).env.VITE_CLERK_PUBLISHABLE_KEY;

console.log('Clerk Key loaded:', PUBLISHABLE_KEY ? 'YES' : 'NO');
console.log('Key value:', PUBLISHABLE_KEY);
console.log('Starting app initialization...');

if (!PUBLISHABLE_KEY) {
  console.error('Clerk Publishable Key not found. Please check your .env.local file.');
  // For debugging, let's try to load it manually
  try {
    const envContent = await fetch('/.env.local').then(r => r.text());
    console.log('Manual env load:', envContent);
  } catch (e) {
    console.log('Manual env load failed:', e);
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
);