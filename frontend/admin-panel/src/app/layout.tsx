import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import SessionProviderWrapper from '@/components/SessionProviderWrapper'; // Adjust path if needed
import AuthStatus from '@/components/AuthStatus'; // Create this component below

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Agent Admin Panel',
  description: 'Manage your AI Agents and Tasks', // Updated description
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100 min-h-screen`}>
        <SessionProviderWrapper> {/* Wrap with SessionProviderWrapper */}
          <nav className="bg-white shadow-md">
            <div className="container mx-auto px-4">
              <div className="flex justify-between items-center py-4">
                <Link href="/" className="text-xl font-bold text-blue-600">Agent Admin Panel</Link>
                <div className="flex items-center"> {/* Ensure items are aligned */}
                  <Link href="/" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">Home</Link>
                  <Link href="/agents" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">Agents</Link>
                  <Link href="/tasks" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">Tasks</Link>
                  <AuthStatus /> {/* Add AuthStatus component here */}
                </div>
              </div>
            </div>
          </nav>
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="text-center py-4 mt-8 text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} Agent Management System</p>
          </footer>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
