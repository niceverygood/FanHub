import { PolicyList, PolicyPage, PolicySection } from "@/components/legal/PolicyPage";
import { siteConfig } from "@/lib/site";

export const metadata = { title: `안전 센터 | ${siteConfig.name}` };

export default function SafetyPage() {
  return (
    <PolicyPage
      eyebrow="Safety"
      title="안전 센터"
      description="비동의 콘텐츠, 미성년자 위험, 괴롭힘, 사칭, 결제 사기 등 긴급 신고 기준입니다."
    >
      <PolicySection title="긴급 신고 대상">
        <PolicyList
          items={[
            "미성년자가 등장하거나 미성년자로 의심되는 성적 콘텐츠",
            "동의 없이 촬영, 유포, 판매된 것으로 보이는 콘텐츠",
            "협박, 강요, 착취, 개인정보 노출, 스토킹, 사칭",
            "결제 사기, 계정 탈취, 외부 불법 거래 유도",
          ]}
        />
      </PolicySection>
      <PolicySection title="운영 원칙">
        <p>
          FanHub는 신고 접수 후 위험도를 분류하고, 중대한 안전 문제는 콘텐츠 접근 제한과 계정 제한을 먼저 적용한 뒤
          추가 조사를 진행할 수 있습니다. 필요한 경우 결제 제공자, 호스팅 제공자, 관계기관과 협력합니다.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
