import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { maskEmail } from "@/lib/log";
import { updateName, changePassword, logout } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

const MESSAGES: Record<string, { text: string; error: boolean }> = {
  "saved:name": { text: "닉네임이 저장되었습니다.", error: false },
  "saved:password": { text: "비밀번호가 변경되었습니다.", error: false },
  "error:invalid_name": { text: "닉네임은 30자 이하로 입력해주세요.", error: true },
  "error:invalid_password": { text: "새 비밀번호는 8자 이상이어야 합니다.", error: true },
  "error:wrong_password": { text: "현재 비밀번호가 올바르지 않습니다.", error: true },
};

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, passwordHash: true, role: true, createdAt: true },
  });
  if (!user) redirect("/login");

  const key =
    typeof searchParams.saved === "string"
      ? `saved:${searchParams.saved}`
      : typeof searchParams.error === "string"
        ? `error:${searchParams.error}`
        : null;
  const message = key ? MESSAGES[key] : undefined;

  const inputCls =
    "rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent";

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="font-display text-2xl font-semibold text-text">설정</h1>
      <p className="numeric mt-2 text-sm text-text-muted">{maskEmail(user.email)}</p>

      {message ? (
        <p
          className={`mt-4 rounded-md border px-3 py-2 text-sm ${
            message.error ? "border-accent-muted text-accent" : "border-border text-text"
          } bg-surface`}
        >
          {message.text}
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-text">닉네임</h2>
        <p className="mt-1 text-xs text-text-muted">댓글 등 공개 화면에 표시되는 이름입니다.</p>
        <form action={updateName} className="mt-3 flex gap-2">
          <input
            name="name"
            type="text"
            maxLength={30}
            defaultValue={user.name ?? ""}
            placeholder="닉네임"
            className={`min-w-0 flex-1 ${inputCls}`}
          />
          <button
            type="submit"
            className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-accent-hover"
          >
            저장
          </button>
        </form>
      </section>

      <section className="mt-8 border-t border-border pt-6">
        <h2 className="text-sm font-semibold text-text">비밀번호 변경</h2>
        <form action={changePassword} className="mt-3 flex flex-col gap-3">
          {user.passwordHash ? (
            <input
              name="currentPassword"
              type="password"
              required
              placeholder="현재 비밀번호"
              className={inputCls}
            />
          ) : (
            <p className="text-xs text-text-muted">
              아직 비밀번호가 없는 계정입니다. 새 비밀번호를 설정하세요.
            </p>
          )}
          <input
            name="newPassword"
            type="password"
            required
            minLength={8}
            maxLength={72}
            placeholder="새 비밀번호 (8자 이상)"
            className={inputCls}
          />
          <button
            type="submit"
            className="self-start rounded-md border border-border px-4 py-2 text-sm text-text transition-colors hover:border-accent"
          >
            비밀번호 변경
          </button>
        </form>
      </section>

      <section className="mt-8 border-t border-border pt-6">
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-accent"
          >
            로그아웃
          </button>
        </form>
      </section>
    </div>
  );
}
