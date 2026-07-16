import { PolicyList, PolicyPage, PolicySection } from "@/components/legal/PolicyPage";
import { siteConfig } from "@/lib/site";

export const metadata = { title: `콘텐츠 정책 | ${siteConfig.name}` };

export default function ContentPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Creator Policy"
      title="콘텐츠 정책"
      description="크리에이터가 등록할 수 있는 콘텐츠와 금지되는 콘텐츠의 기준입니다."
    >
      <PolicySection title="필수 기준">
        <PolicyList
          items={[
            "콘텐츠에 등장하는 모든 인물은 성인이어야 하며, 촬영과 배포에 명시적으로 동의해야 합니다.",
            "크리에이터는 요청 시 신원, 연령, 동의, 권리 보유 증빙을 제출할 수 있어야 합니다.",
            "미리보기와 썸네일도 동일한 정책 기준을 따르며, 오해를 유발하는 제목/태그를 사용할 수 없습니다.",
          ]}
        />
      </PolicySection>
      <PolicySection title="금지 콘텐츠">
        <PolicyList
          items={[
            "미성년자 또는 미성년자로 보이도록 연출된 성적 콘텐츠",
            "비동의 촬영물, 유출물, 딥페이크, 협박 또는 착취와 관련된 콘텐츠",
            "폭력, 강제, 수면/의식불명, 동의 불능 상태를 성적으로 묘사하는 콘텐츠",
            "성매매 알선, 외부 불법 거래 유도, 개인정보 노출, 스토킹 또는 괴롭힘",
            "타인의 저작권, 상표권, 초상권, 퍼블리시티권을 침해하는 콘텐츠",
          ]}
        />
      </PolicySection>
      <PolicySection title="검토 및 제재">
        <p>
          신고, 자동 탐지, 운영자 검토, 결제 제공자 요청에 따라 콘텐츠가 비공개 처리될 수 있습니다. 중대한 위반은
          계정 정지, 정산 보류, 관계기관 신고로 이어질 수 있습니다.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
