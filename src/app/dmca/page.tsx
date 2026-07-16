import { PolicyList, PolicyPage, PolicySection } from "@/components/legal/PolicyPage";
import { siteConfig } from "@/lib/site";

export const metadata = { title: `권리 침해 신고 | ${siteConfig.name}` };

export default function DmcaPage() {
  return (
    <PolicyPage
      eyebrow="Rights"
      title="권리 침해 신고"
      description="저작권, 초상권, 비동의 게시물, 개인정보 노출 등 권리 침해를 접수하는 절차입니다."
    >
      <PolicySection title="접수 정보">
        <PolicyList
          items={[
            "신고자 성명, 연락처, 권리자와의 관계",
            "침해가 의심되는 콘텐츠 URL 또는 콘텐츠 ID",
            "권리 보유 또는 대리 권한을 확인할 수 있는 설명과 자료",
            "허위 신고 시 책임을 질 수 있다는 확인 문구",
          ]}
        />
      </PolicySection>
      <PolicySection title="처리 절차">
        <p>
          접수된 요청은 우선순위에 따라 검토하며, 비동의 성적 이미지나 미성년자 관련 의심 건은 긴급 안전 신고로 분류합니다.
          권리 침해가 합리적으로 확인되면 콘텐츠 접근을 제한하고 크리에이터에게 소명 기회를 제공합니다.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
