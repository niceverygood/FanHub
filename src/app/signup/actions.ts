"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/ratelimit";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72), // bcrypt input limit
  name: z.string().trim().min(1).max(30).optional(),
});

/** Creates a FAN account with a password, then signs the user in. */
export async function signup(formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    name: String(formData.get("name") ?? "").trim() || undefined,
  });
  if (!parsed.success) redirect("/signup?error=invalid");

  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit(`signup:${ip}`, 10, 3600);
  if (!rl.ok) redirect("/signup?error=rate_limited");

  const email = parsed.data.email.toLowerCase();
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    await prisma.user.create({
      data: { email, passwordHash, name: parsed.data.name, role: "FAN" },
    });
  } catch (e) {
    // P2002 = email already registered
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") {
      redirect("/signup?error=exists");
    }
    throw e;
  }

  try {
    await signIn("credentials", { email, password: parsed.data.password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      // Account was created; fall back to manual login.
      redirect("/login");
    }
    throw error; // re-throw NEXT_REDIRECT and others
  }
}
