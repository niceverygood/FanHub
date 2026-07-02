import Link from "next/link";
import { signup } from "./actions";

type SearchParams = { [key: string]: string | string[] | undefined };

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "입력값을 확인해주세요. 비밀번호는 8자 이상이어야 합니다.",
  exists: "이미 가입된 이메일입니다.",
  rate_limited: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
};

export default function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const error = typeof searchParams.error === "string" ? searchParams.error : null;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
      <h1 className="font-display text-2xl font-semibold text-text">회원가입</h1>
      <p className="mt-2 text-sm text-text-muted">이메일과 비밀번호로 팬 계정을 만듭니다.</p>

      {error ? (
        <p className="mt-4 rounded-md border border-accent-muted bg-surface px-3 py-2 text-sm text-accent">
          {ERROR_MESSAGES[error] ?? "가입에 실패했습니다. 다시 시도해주세요."}
        </p>
      ) : null}

      <form action={signup} className="mt-6 flex flex-col gap-3">
        <input
          name="name"
          type="text"
          maxLength={30}
          placeholder="닉네임 (선택)"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
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
          maxLength={72}
          placeholder="비밀번호 (8자 이상)"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 font-medium text-bg transition-colors hover:bg-accent-hover"
        >
          가입하기
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="text-accent hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
