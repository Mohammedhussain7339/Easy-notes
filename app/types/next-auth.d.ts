
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    authError?: string;
    apiAccessToken?: string;

    user: {
      id?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    apiAccessToken?: string;
    userId?: string;
    authError?: string;
  }
}
