import { PolicyList, PolicyPage, PolicySection } from "@/components/legal/PolicyPage";
import { siteConfig } from "@/lib/site";

export const metadata = { title: `컴플라이언스 | ${siteConfig.name}` };

export default function CompliancePage() {
  return (
    <PolicyPage
      eyebrow="Compliance"
      title="컴플라이언스"
      description="성인 콘텐츠 플랫폼 운영을 위해 필요한 확인, 보존, 감사, 결제 준수 원칙입니다."
    >
      <PolicySection title="출시 전 필수 확인">
        <PolicyList
          items={[
            "서비스 대상 국가의 성인 콘텐츠, 전자상거래, 개인정보, 세금, 플랫폼 책임 관련 법률 검토",
            "결제 제공자의 성인 콘텐츠 허용 여부, 금지 카테고리, 웹훅/차지백/정산 규칙 검토",
            "크리에이터 KYC, 모델 동의 및 연령 증빙 보존 절차 확정",
            "긴급 신고, 권리 침해, 비동의 콘텐츠, 미성년자 의심 신고의 대응 SLA 확정",
          ]}
        />
      </PolicySection>
      <PolicySection title="운영 증적">
        <p>
          FanHub는 주문, 지급, 신고, 운영자 조치, 웹훅, 권한 부여 이력을 보존하여 정산 검증과 분쟁 대응에 활용합니다.
          실제 상용 운영 전에는 변호사, 회계사, 결제 제공자, 개인정보 담당자의 검토가 필요합니다.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
