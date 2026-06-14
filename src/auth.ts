import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Nodemailer from "next-auth/providers/nodemailer";
import { encode as defaultEncode } from "next-auth/jwt";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { maskEmail } from "@/lib/log";

const adapter = PrismaAdapter(prisma);

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Auth.js v5 with the **database** session strategy.
 *
 * The Credentials provider does not natively support database sessions (it
 * forces JWT). The documented workaround: mark the JWT as credential-based in
 * the `jwt` callback, then in `jwt.encode` create a real DB Session row and
 * return its token as the cookie value. Adapter-backed providers (email/OAuth)
 * fall through to `defaultEncode`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  session: { strategy: "database", maxAge: SESSION_MAX_AGE_MS / 1000 },
  secret: env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user?.passwordHash) return null;
        if (user.status !== "ACTIVE") return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, role: user.role };
      },
    }),
    Nodemailer({
      from: env.EMAIL_FROM,
      // jsonTransport keeps nodemailer from opening a real SMTP connection when
      // no server is configured; the link is delivered via sendVerificationRequest.
      server: env.EMAIL_SERVER_HOST
        ? {
            host: env.EMAIL_SERVER_HOST,
            port: Number(env.EMAIL_SERVER_PORT || 587),
            auth: {
              user: env.EMAIL_SERVER_USER,
              pass: env.EMAIL_SERVER_PASSWORD,
            },
          }
        : { jsonTransport: true },
      sendVerificationRequest: async ({ identifier, url }) => {
        if (!env.EMAIL_SERVER_HOST) {
          // Dev: print the magic link instead of sending mail. Email is masked.
          // eslint-disable-next-line no-console
          console.info(`[auth] magic link for ${maskEmail(identifier)}: ${url}`);
          return;
        }
        // With a real SMTP host configured, Nodemailer's default sender runs.
        // (Phase 1 dev uses the console path above.)
        throw new Error("SMTP delivery not configured in this build");
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, account }) => {
      if (account?.provider === "credentials") {
        token.credentials = true;
      }
      return token;
    },
    session: async ({ session, user }) => {
      // Database strategy: `user` is the adapter user row.
      if (session.user) {
        session.user.id = user.id;
        // role is added by the type augmentation; read it off the adapter user
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, ageVerifiedAt: true, status: true },
        });
        session.user.role = dbUser?.role ?? "FAN";
        session.user.ageVerified = Boolean(dbUser?.ageVerifiedAt);
      }
      return session;
    },
  },
  jwt: {
    encode: async (params) => {
      if (params.token?.credentials) {
        const sessionToken = randomUUID();
        if (!params.token.sub) {
          throw new Error("No user id in token while creating credentials session");
        }
        if (!adapter.createSession) {
          throw new Error("Adapter does not support createSession");
        }
        const created = await adapter.createSession({
          sessionToken,
          userId: params.token.sub,
          expires: new Date(Date.now() + SESSION_MAX_AGE_MS),
        });
        if (!created) throw new Error("Failed to create credentials session");
        return sessionToken;
      }
      return defaultEncode(params);
    },
  },
});
