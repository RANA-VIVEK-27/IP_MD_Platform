import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../lib/auth-context';
import { ToastProvider } from '../components/Toast';
import { AppNav } from '../components/AppNav';

export const metadata: Metadata = {
  title: 'I.P. & M.D | Intelligent Prescription & Medicine Discovery',
  description: 'A modern healthcare platform connecting patients, doctors and pharmacies through intelligent prescription processing, medicine discovery and connected healthcare workflows.',
  openGraph: {
    title: 'I.P. & M.D | Intelligent Prescription & Medicine Discovery',
    description: 'Intelligent prescription processing, medicine discovery and connected healthcare workflows.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            <a href="#main-content" className="skip-link">Skip to content</a>
            <div className="app-shell">
              <AppNav />
              <main id="main-content" role="main">
                {children}
              </main>
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
