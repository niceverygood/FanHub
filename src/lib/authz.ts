import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role, CreatorProfile } from "@prisma/client";

/** Authorization failure mapped to an HTTP status by the route layer. */
export class AuthzError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
    this.name = "AuthzError";
  }
}

export interface SessionUser {
  id: string;
  role: Role;
  ageVerified: boolean;
}

/** Requires a logged-in user. Server-side — never trusts a client-sent role. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new AuthzError(401, "unauthorized");
  return { id: session.user.id, role: session.user.role, ageVerified: session.user.ageVerified };
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AuthzError(403, "forbidden");
  return user;
}

/** Requires the caller to own a creator profile (CREATOR or ADMIN role). */
export async function requireCreator(): Promise<{ user: SessionUser; profile: CreatorProfile }> {
  const user = await requireUser();
  if (user.role !== "CREATOR" && user.role !== "ADMIN") {
    throw new AuthzError(403, "forbidden");
  }
  const profile = await prisma.creatorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) throw new AuthzError(403, "no_creator_profile");
  return { user, profile };
}
