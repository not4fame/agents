export default function AuthPage() {
  return (
    <div>
      <h1>Authentication</h1>
      <p>Login with MSAL or Google will be implemented here.</p>
      {/* Placeholder for MSAL_CLIENT_ID and GOOGLE_CLIENT_ID */}
      <p>MSAL Client ID: {process.env.NEXT_PUBLIC_MSAL_CLIENT_ID || "Not Set"}</p>
      <p>Google Client ID: {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "Not Set"}</p>
    </div>
  );
}
