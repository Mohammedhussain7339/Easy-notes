
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SignOutButton from "./SignOutButton";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.authError) {
    return <div>Authentication failed: {session.authError}</div>;
  }

  return (
    <main className="min-h-dvh bg-[#F6F4EF] p-8">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-3xl font-semibold">
            Marginalia
          </h1>
          <SignOutButton />
        </div>

        <div className="mt-10">
          {session.user?.image && (
            <img
              src={session.user.image}
              alt="Profile"
              className="h-20 w-20 rounded-full"
            />
          )}

          <h2 className="mt-4 text-xl font-semibold">
            Welcome, {session.user?.name}
          </h2>

          <p className="mt-2 text-gray-500">
            {session.user?.email}
          </p>

          <p className="mt-5 text-green-700">
            Google authentication successful.
          </p>
        </div>
      </div>
    </main>
  );
}
