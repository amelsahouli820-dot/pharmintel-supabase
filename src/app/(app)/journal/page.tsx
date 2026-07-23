import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { AuditLogViewer } from "@/components/AuditLogViewer";
export default async function JournalPage(){const user=await requireSession();if(user.role!=="ADMIN")redirect("/tableau-de-bord");return <AuditLogViewer/>}
