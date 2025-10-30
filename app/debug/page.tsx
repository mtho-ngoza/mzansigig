'use client';

export default function DebugPage() {
  const config = {
    useEmulator: process.env.NEXT_PUBLIC_USE_EMULATOR,
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '***SET***' : 'MISSING',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '***SET***' : 'MISSING',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '***SET***' : 'MISSING',
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Firebase Configuration Debug</h1>
      <pre style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
        {JSON.stringify(config, null, 2)}
      </pre>
      <p style={{ marginTop: '20px', color: '#666' }}>
        This page shows what environment variables are set in your deployment.
        After checking, delete this page for security.
      </p>
    </div>
  );
}
