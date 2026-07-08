// @ts-nocheck
import { redirect } from "next/navigation"

export default function ManagerRedirectPage() {
  // regardless of auth, simply send managers to the admin dashboard
  redirect('/dashboard/admin')
}
