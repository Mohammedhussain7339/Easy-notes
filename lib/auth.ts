import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "select_account",
          response_type: "code",
        },
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token, account }) {
      // Authenticate with AWS only during Google sign-in.
      if (account?.provider === "google") {
        const googleIdToken = account.id_token;

        if (!googleIdToken) {
          token.authError = "GOOGLE_ID_TOKEN_MISSING";
          return token;
        }

        try {
          const apiUrl = "https://ktnb0w0dh3.execute-api.ap-south-1.amazonaws.com/dev";

          if (!apiUrl) {
            throw new Error("AWS_AUTH_API_URL is not configured");
          }
          console.log("AWS AUTH API URL configured:", !!apiUrl);
          console.log("Calling AWS authentication API...");

          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idToken: googleIdToken,
            }),
            cache: "no-store",
          });

          const responseText = await response.text();

          let result: any;

          try {
            result = JSON.parse(responseText);

            // Handle API Gateway Lambda proxy responses.
            if (result.body !== undefined) {
              result =
                typeof result.body === "string"
                  ? JSON.parse(result.body)
                  : result.body;
            }
          } catch {
            console.error("Invalid AWS authentication response");
            token.authError = "LAMBDA_INVALID_RESPONSE";
            return token;
          }

          if (
            !response.ok ||
            result?.success !== true ||
            typeof result?.accessToken !== "string" ||
            !result.accessToken ||
            typeof result?.user?.userId !== "string" ||
            !result.user.userId
          ) {
            console.error("AWS authentication failed:", {
              status: response.status,
              message: result?.message,
            });

            token.authError =
              result?.message || `LAMBDA_HTTP_${response.status}`;

            return token;
          }

          // Store AWS application JWT and user ID in the NextAuth JWT.
          token.apiAccessToken = result.accessToken;
          token.userId = result.user.userId;
          token.authError = undefined;

          console.log("AWS authentication successful.");
        } catch (error) {
          console.error("AWS authentication error:", error);
          token.authError = "LAMBDA_CONNECTION_FAILED";
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string | undefined;
      }

      session.authError = token.authError as string | undefined;
      session.apiAccessToken = token.apiAccessToken as string | undefined;

      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  debug: process.env.NODE_ENV === "development",
};
