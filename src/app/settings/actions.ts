"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signOut } from "@/auth";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const nameSchema = z.string().trim().max(30);

/** Updates the caller's public display name (empty clears it). */
export async function updateName(formData: FormData) {
  const user = await requireUser();
  const parsed = nameSchema.safeParse(String(formData.get("name") ?? ""));
  if (!parsed.success) redirect("/settings?error=invalid_name");

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data || null },
  });
  revalidatePath("/settings");
  redirect("/settings?saved=name");
}

const passwordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8).max(72),
});

/** Changes the caller's password. Verifies the current one when set. */
export async function changePassword(formData: FormData) {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
  });
  if (!parsed.success) redirect("/settings?error=invalid_password");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (dbUser?.passwordHash) {
    const ok = await bcrypt.compare(parsed.data.currentPassword, dbUser.passwordHash);
    if (!ok) redirect("/settings?error=wrong_password");
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  redirect("/settings?saved=password");
}

/** Signs the caller out. */
export async function logout() {
  await signOut({ redirectTo: "/" });
}
