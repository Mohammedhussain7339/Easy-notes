
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useDispatch } from "react-redux";
import { setUser, clearUser } from "@/app/store/userSlice";

export default function SyncUser() {
  const { data: session, status } = useSession();
  const dispatch = useDispatch();

  useEffect(() => {
    // Wait until NextAuth finishes checking the session.
    if (status === "loading") {
      return;
    }

    // Store authenticated user details and AWS JWT in Redux.
    if (
      status === "authenticated" &&
      session?.user?.id &&
      session?.apiAccessToken
    ) {
      dispatch(
        setUser({
          userId: session.user.id,
          name: session.user.name ?? "",
          email: session.user.email ?? "",
          image: session.user.image ?? "",
          apiAccessToken: session.apiAccessToken,
        })
      );

      return;
    }

    // Clear Redux user data when unauthenticated or AWS authentication fails.
    dispatch(clearUser());
  }, [session, status, dispatch]);

  return null;
}
