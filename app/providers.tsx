"use client";

import { SessionProvider } from "next-auth/react";
import ReduxProvider from "@/components/ReduxProvider";
import SyncUser from "@/components/SyncUser";
export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <ReduxProvider>
        <SyncUser />
        {children}
      </ReduxProvider>
    </SessionProvider>
  );
}