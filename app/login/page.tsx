
"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && !session?.authError) {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  const handleGoogleLogin = async () => {
    setLoading(true);

    try {
      await signIn("google", {
        callbackUrl: "/dashboard",
      });
    } catch (error) {
      console.error("Google login error:", error);
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F6F4EF] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#e5e0d6] bg-white p-8 text-center shadow-sm">
        <h1 className="font-serif text-4xl font-semibold text-[#292720]">
          Marginalia
        </h1>

        <p className="mt-3 text-sm text-gray-500">
          A quiet place to keep your notes.
        </p>

        {session?.authError && (
          <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            Authentication failed: {session.authError}
          </p>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading || status === "loading"}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            "Connecting..."
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.93c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.4 37.96 46.98 31.88 46.98 24.55Z"/>
                <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a24 24 0 0 0 0 21.56l7.98-6.19Z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.17 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p className="mt-6 text-xs text-gray-400">
          Sign in securely with your Google account.
        </p>
      </div>
    </main>
  );
}
