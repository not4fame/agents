import type { Metadata } from 'next'
import { Inter } from 'next/font/google' // Assuming Inter is preferred, if not, keep Geist
import Link from 'next/link' // Import Link
import './globals.css'

const inter = Inter({ subsets: ['latin'] }) // Using Inter as per subtask description

export const metadata: Metadata = {
  title: 'Agent Admin Panel', // Updated title
  description: 'Manage your AI Agents and Tasks', // Updated description
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* Using inter.className as per subtask, and adding bg-gray-100 min-h-screen */}
      <body className={`${inter.className} bg-gray-100 min-h-screen`}> 
        <nav className="bg-white shadow-md">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center py-4">
              <Link href="/" className="text-xl font-bold text-blue-600">Agent Admin Panel</Link>
              <div>
                <Link href="/" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">Home</Link>
                <Link href="/agents" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">Agents</Link>
                <Link href="/tasks" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">Tasks</Link>
                <Link href="/auth" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">Login</Link> 
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
      </body>
    </html>
  )
}
