import { PolicyList, PolicyPage, PolicySection } from "@/components/legal/PolicyPage";
import { siteConfig } from "@/lib/site";

export const metadata = { title: `개인정보 처리방침 | ${siteConfig.name}` };

export default function PrivacyPage() {
  return (
    <PolicyPage
      eyebrow="Privacy"
      title="개인정보 처리방침"
      description="계정, 결제, 콘텐츠 접근, 신고, 정산 과정에서 처리되는 개인정보 기준입니다."
    >
      <PolicySection title="수집 항목">
        <PolicyList
          items={[
            "계정 정보: 이메일, 이름 또는 표시명, 로그인 세션, 역할, 연령 확인 상태",
            "거래 정보: 주문, 결제 상태, 제공자 참조값, 열람 권한, 환불 및 차지백 기록",
            "크리에이터/호스트 정보: KYC 상태, 지급 계좌 참조값, 정산 요청 및 지급 기록",
            "운영 정보: 신고 내용, 감사 로그, 보안 로그, 고객지원 문의",
          ]}
        />
      </PolicySection>
      <PolicySection title="이용 목적">
        <PolicyList
          items={[
            "회원 인증, 성인 확인, 부정 이용 방지, 계정 보호",
            "콘텐츠 구매, 열람 권한 부여, 결제 및 정산 처리",
            "신고, 분쟁, 권리 침해, 안전 문제 조사 및 대응",
            "법령 준수, 결제 네트워크 규칙 준수, 감사 기록 보존",
          ]}
        />
      </PolicySection>
      <PolicySection title="보관 및 파기">
        <p>
          계정 정보는 서비스 이용 기간 동안 보관합니다. 거래, 정산, 신고, 감사 로그는 법령상 의무, 분쟁 해결,
          부정 이용 방지를 위해 필요한 기간 동안 보관한 뒤 파기 또는 비식별 처리합니다.
        </p>
      </PolicySection>
      <PolicySection title="제3자 처리">
        <p>
          결제, 이메일, 스토리지, 데이터베이스, 호스팅 제공자는 서비스 운영에 필요한 범위에서만 데이터를 처리합니다.
          운영 환경에서는 Supabase, Vercel, 결제 제공자, 이메일/S3 호환 제공자가 포함될 수 있습니다.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
