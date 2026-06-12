/**
 * Navigation gate for every /studio page except sign-in — redirects signed-out visitors. NOT the security boundary: layouts do not re-run on client-side route transitions (per Next's auth guide), so every studio data read and mutation independently calls requireStudioUser/getStudioUser in the data layer (lib/studio-auth.ts).
 *
 * `getStudioUser()` resolves the payload-token cookie via the Local API and
 * requires the `admins` collection — the same login as /admin, so staff sign
 * in once for both. Customer (Better Auth) sessions use a different cookie and
 * always resolve to null here. No optimistic proxy layer: studio traffic is
 * two people, one DB round-trip per navigation is fine.
 */
import { redirect } from "next/navigation";

import { getStudioUser } from "@/lib/studio-auth";
import { StudioNav } from "@/components/studio/studio-nav";

export default async function StudioGateLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getStudioUser();
  if (!user) redirect("/studio/sign-in");

  return (
    <div className="mx-auto max-w-5xl px-6">
      <StudioNav email={user.email} />
      {children}
    </div>
  );
}
