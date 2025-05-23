// frontend/admin-panel/src/app/auth/page.tsx
"use client"; // Optional: Can be a server component if just displaying a message

export default function AuthRedirectPage() {
  // This page is no longer the primary sign-in page if custom pages are configured in NextAuth.
  // It can be a general auth information page or redirect.
  return (
    <div className="container mx-auto p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">Authentication Hub</h1>
      <p>
        If you are not automatically redirected, please use the navigation options 
        or click the "Sign In" button in the header.
      </p>
      <p className="mt-2">
        The primary sign-in page is located at <code className="bg-gray-200 p-1 rounded">/auth/signin</code>.
      </p>
      {/* You could add logic here to check session and redirect if needed,
          but usually NextAuth handles redirection to the configured signIn page. */}
    </div>
  );
}
