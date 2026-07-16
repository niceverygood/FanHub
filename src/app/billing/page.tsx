import { PolicyList, PolicyPage, PolicySection } from "@/components/legal/PolicyPage";
import { siteConfig } from "@/lib/site";

export const metadata = { title: `결제 및 환불 정책 | ${siteConfig.name}` };

export default function BillingPage() {
  return (
    <PolicyPage
      eyebrow="Billing"
      title="결제 및 환불 정책"
      description="콘텐츠 구매, 접근권한, 정산, 환불 및 차지백 처리 기준입니다."
    >
      <PolicySection title="구매와 열람권">
        <PolicyList
          items={[
            "구매 금액은 서버의 콘텐츠 가격을 기준으로 확정되며 클라이언트 표시값은 최종 권한 부여 기준이 아닙니다.",
            "결제가 성공하면 구매 계정에 열람권이 부여되고, 환불 또는 차지백 시 열람권이 취소될 수 있습니다.",
            "콘텐츠 접근은 계정 단위이며 양도, 공유, 재판매, 화면 녹화 및 재배포를 금지합니다.",
          ]}
        />
      </PolicySection>
      <PolicySection title="환불 기준">
        <p>
          디지털 콘텐츠 특성상 열람권이 부여된 뒤에는 단순 변심 환불이 제한될 수 있습니다. 중복 결제, 결제 오류,
          콘텐츠 미제공, 권리 침해 또는 정책 위반이 확인된 경우 운영 검토 후 환불 또는 권한 취소가 진행됩니다.
        </p>
      </PolicySection>
      <PolicySection title="정산 보류">
        <p>
          신고, 환불 위험, 차지백, KYC 미완료, 지급 계좌 이상, 법령 또는 결제 네트워크 규칙 위반이 확인되면 크리에이터와
          호스트 정산은 검토 완료 전까지 보류될 수 있습니다.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
