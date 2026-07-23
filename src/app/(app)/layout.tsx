import { AppShell } from "@/components/AppShell";
import { requireSession } from "@/lib/auth";
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();
  return <AppShell user={{ id: user.id, name: user.name, email: user.email, role: user.role }}>{children}</AppShell>;
}
