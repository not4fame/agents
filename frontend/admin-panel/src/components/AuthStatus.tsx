// frontend/admin-panel/src/components/AuthStatus.tsx
"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

export default function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="px-3 py-2 rounded-md text-sm font-medium text-gray-700">Loading...</div>;
  }

  if (session) {
    return (
      <>
        <span className="px-3 py-2 rounded-md text-sm font-medium text-gray-700">
          {session.user?.name || session.user?.email}
        </span>
        <button
          onClick={() => signOut()}
          className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
        >
          Sign Out
        </button>
      </>
    );
  }

  return (
    <Link href="/auth/signin" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
        Sign In
    </Link>
    // Or use a button:
    // <button
    //   onClick={() => signIn()} // Will redirect to default sign-in page or pages.signIn if configured
    //   className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
    // >
    //   Sign In
    // </button>
  );
}
