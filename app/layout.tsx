import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { MessagingProvider } from '@/contexts/MessagingContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { LocationProvider } from '@/contexts/LocationContext'
import { PaymentProvider } from '@/contexts/PaymentContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppLayout } from '@/components/layout/AppLayout'
import { DevUtilsLoader } from '@/components/DevUtilsLoader'
import { WebVitalsLoader } from '@/components/WebVitalsLoader'

// Force dynamic rendering for the entire app
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'MzansiGig - Mzansi\'s Gig Connection: Work Starts Here',
  description: 'Secure, inclusive gig opportunities for all South Africans. Mzansi\'s Gig Connection - find work, post gigs, build your future across all of Mzansi.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    shortcut: '/icons/icon-192x192.png',
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }
    ]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MzansiGig'
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'MzansiGig',
    'application-name': 'MzansiGig',
    'msapplication-TileColor': '#f97316',
    'msapplication-config': '/browserconfig.xml'
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#f97316'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans">
        <DevUtilsLoader />
        <WebVitalsLoader />
        <ErrorBoundary>
          <ToastProvider>
            <LocationProvider>
              <AuthProvider>
                <PaymentProvider>
                  <MessagingProvider>
                    <AppLayout>
                      {children}
                    </AppLayout>
                  </MessagingProvider>
                </PaymentProvider>
              </AuthProvider>
            </LocationProvider>
          </ToastProvider>
        </ErrorBoundary>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}