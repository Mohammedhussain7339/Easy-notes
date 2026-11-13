"use client";

import { signOut } from "next-auth/react";
import { useDispatch } from "react-redux";
import { clearUser } from "@/app/store/userSlice";

export default function SignOutButton() {
  const dispatch = useDispatch();

  async function handleLogout() {
    dispatch(clearUser());

    await signOut({
      callbackUrl: "/login",
    });
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-700"
    >
      Logout
    </button>
  );
}