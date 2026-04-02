import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar, Header, MobileNav } from "@/components/layout";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-950">
      <Sidebar />

      {/* Main content area — offset by sidebar width on desktop */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Header userName={session.user.name ?? session.user.email} />

        <main className="flex-1 p-6 pb-20 lg:pb-6">{children}</main>
      </div>

      <MobileNav />
    </div>
  );
}
