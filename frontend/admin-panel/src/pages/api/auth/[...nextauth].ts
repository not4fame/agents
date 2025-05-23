// frontend/admin-panel/src/pages/api/auth/[...nextauth].ts
import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!, // Optional: Defaults to 'common'
    }),
    // Add other providers as needed
  ],
  secret: process.env.NEXTAUTH_SECRET, // A random string used to hash tokens, sign cookies, etc.
  pages: {
    signIn: '/auth/signin', // Optional: Custom sign-in page
    // error: '/auth/error', // Optional: Custom error page
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Persist the OAuth access_token to the token right after signin
      if (account && user) {
        token.accessToken = account.access_token;
        token.id = user.id; // Persist user id from provider
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token and user id from a JWT
      session.accessToken = token.accessToken as string;
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  // debug: process.env.NODE_ENV === 'development', // Optional: For debugging
};

export default NextAuth(authOptions);
