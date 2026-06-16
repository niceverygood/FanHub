import { EnterButton } from "./EnterButton";

type SearchParams = { [key: string]: string | string[] | undefined };

export default function AgeGatePage({ searchParams }: { searchParams: SearchParams }) {
  const nextRaw = searchParams.next;
  const next = typeof nextRaw === "string" && nextRaw.startsWith("/") ? nextRaw : "/";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-2xl font-semibold text-text">연령 확인</h1>
      <p className="mt-3 text-sm text-text-muted">
        FanHub는 19세 이상 성인만 이용할 수 있는 콘텐츠 거래소입니다. 입장하려면 만 19세
        이상임을 확인해 주세요.
      </p>

      <div className="mt-8 w-full">
        <EnterButton next={next} />
      </div>

      <a
        href="https://www.google.com"
        className="mt-4 text-xs text-text-muted underline-offset-2 hover:underline"
      >
        나가기
      </a>
    </div>
  );
}
