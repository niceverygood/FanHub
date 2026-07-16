import { PolicyList, PolicyPage, PolicySection } from "@/components/legal/PolicyPage";
import { siteConfig } from "@/lib/site";

export const metadata = { title: `이용약관 | ${siteConfig.name}` };

export default function TermsPage() {
  return (
    <PolicyPage
      eyebrow="Terms"
      title="이용약관"
      description="FanHub 이용자, 크리에이터, 호스트, 운영자가 따라야 하는 기본 계약 조건입니다."
    >
      <PolicySection title="서비스 성격">
        <p>
          FanHub는 성인 이용자를 대상으로 크리에이터 디지털 콘텐츠의 게시, 판매, 구매, 정산을 중개하는 플랫폼입니다.
          콘텐츠 권리와 책임은 해당 콘텐츠를 등록한 크리에이터에게 있으며, FanHub는 결제, 접근권한, 신고 처리, 운영 도구를 제공합니다.
        </p>
      </PolicySection>
      <PolicySection title="가입 및 이용 제한">
        <PolicyList
          items={[
            "서비스 이용자는 거주지 법령상 성인 연령 이상이어야 하며, 연령 확인을 우회할 수 없습니다.",
            "타인의 계정, 결제수단, 신분, 초상, 콘텐츠 권리를 무단으로 사용할 수 없습니다.",
            "제재, 정지, 탈퇴 후 우회 가입이 확인되면 계정과 판매 권한이 제한될 수 있습니다.",
          ]}
        />
      </PolicySection>
      <PolicySection title="콘텐츠 거래">
        <PolicyList
          items={[
            "구매 완료 시 해당 계정에 콘텐츠 열람 권한이 부여되며, 권한은 양도하거나 재판매할 수 없습니다.",
            "워터마크, 접근 로그, 결제 기록은 부정 유출 조사와 분쟁 처리를 위해 사용될 수 있습니다.",
            "결제 실패, 환불, 차지백, 정책 위반이 발생하면 열람 권한이 취소될 수 있습니다.",
          ]}
        />
      </PolicySection>
      <PolicySection title="크리에이터 의무">
        <PolicyList
          items={[
            "크리에이터는 콘텐츠 내 모든 인물의 성인 여부, 동의, 권리 보유 여부를 확인해야 합니다.",
            "FanHub가 요청하는 KYC, 지급 계좌, 권리 증빙, 모델 릴리즈 확인 절차에 협조해야 합니다.",
            "정산은 결제 제공자 상태, 환불/차지백 위험, 정책 검토 상태에 따라 보류될 수 있습니다.",
          ]}
        />
      </PolicySection>
      <PolicySection title="운영 조치">
        <p>
          FanHub는 법령, 결제 네트워크 규칙, 본 약관 또는 콘텐츠 정책 위반이 의심되는 경우 콘텐츠 비공개, 판매 중단,
          정산 보류, 계정 제한, 관계기관 신고 등 필요한 조치를 취할 수 있습니다.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
