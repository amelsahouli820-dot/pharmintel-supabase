import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { UsersManager } from "@/components/UsersManager";
export default async function UsersPage(){const user=await requireSession();if(user.role!=="ADMIN")redirect("/tableau-de-bord");return <UsersManager currentUserId={user.id}/>}
