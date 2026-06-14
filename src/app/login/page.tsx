import { loginWithPassword, loginWithEmail } from "./actions";

type SearchParams = { [key: string]: string | string[] | undefined };

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const error = typeof searchParams.error === "string" ? searchParams.error : null;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
      <h1 className="font-display text-2xl font-semibold text-text">로그인</h1>
      <p className="mt-2 text-sm text-text-muted">이메일·비밀번호 또는 매직 링크로 로그인합니다.</p>

      {error ? (
        <p className="mt-4 rounded-md border border-accent-muted bg-surface px-3 py-2 text-sm text-accent">
          {error === "credentials"
            ? "이메일 또는 비밀번호가 올바르지 않습니다."
            : "매직 링크 전송에 실패했습니다."}
        </p>
      ) : null}

      <form action={loginWithPassword} className="mt-6 flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="이메일"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="비밀번호"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 font-medium text-bg transition-colors hover:bg-accent-hover"
        >
          로그인
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-text-muted">
        <span className="h-px flex-1 bg-border" /> 또는 <span className="h-px flex-1 bg-border" />
      </div>

      <form action={loginWithEmail} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="이메일로 매직 링크 받기"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-md border border-border px-4 py-2 text-sm text-text transition-colors hover:border-accent"
        >
          매직 링크 전송
        </button>
      </form>
    </div>
  );
}
