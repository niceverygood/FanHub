"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

/** Credentials sign-in. On failure, redirect back with an error flag. */
export async function loginWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=credentials");
    }
    throw error; // re-throw NEXT_REDIRECT and others
  }
}

/** Email magic-link sign-in. In dev the link is printed to the server console. */
export async function loginWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  try {
    await signIn("nodemailer", { email, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=email");
    }
    throw error;
  }
}
