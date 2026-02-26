export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">개인정보 처리방침</h1>
        
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. 개인정보의 수집 및 이용 목적</h2>
            <p className="text-muted-foreground">
              보령LNG터미널은 방문객 관리 및 시설 보안을 위해 필요한 최소한의 개인정보를 수집하고 있습니다.
              수집된 개인정보는 방문 승인, 출입 관리, 안전관리 목적으로만 이용됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. 수집하는 개인정보 항목</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>필수항목: 성명, 생년월일, 연락처, 소속, 직위, 방문목적</li>
              <li>선택항목: 차량번호, 차량모델, 이메일 주소</li>
              <li>자동수집: 방문일시, 접수번호, IP 주소</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. 개인정보의 보유 및 이용기간</h2>
            <p className="text-muted-foreground">
              방문 신청 정보는 신청일로부터 3년간 보관되며, 보관 기간 종료 후 즉시 파기됩니다.
              단, 관련 법령에 따라 보존할 필요가 있는 경우 해당 기간 동안 보관합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. 개인정보의 제3자 제공</h2>
            <p className="text-muted-foreground">
              회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.
              다만, 법령의 규정에 의거하거나 수사기관의 요구가 있는 경우에는 예외로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. 개인정보의 안전성 확보조치</h2>
            <p className="text-muted-foreground">
              개인정보는 암호화되어 저장 및 관리되며, 접근 권한이 있는 담당자만 열람 가능합니다.
              개인정보 처리 시스템의 접속기록은 최소 1년 이상 보관·관리됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. 개인정보 보호책임자</h2>
            <div className="text-muted-foreground space-y-1">
              <p>성명: 개인정보보호 담당자</p>
              <p>소속: 보령LNG터미널 관리팀</p>
              <p>연락처: 041-930-5000</p>
              <p>이메일: privacy@boryeong-lng.co.kr</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. 권익침해 구제방법</h2>
            <p className="text-muted-foreground">
              개인정보 침해로 인한 신고나 상담이 필요하신 경우 아래 기관에 문의하실 수 있습니다.
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
              <li>개인정보침해신고센터 (privacy.kisa.or.kr / 국번없이 118)</li>
              <li>개인정보분쟁조정위원회 (www.kopico.go.kr / 1833-6972)</li>
              <li>대검찰청 사이버범죄수사단 (www.spo.go.kr / 국번없이 1301)</li>
              <li>경찰청 사이버안전국 (cyberbureau.police.go.kr / 국번없이 182)</li>
            </ul>
          </section>

          <section>
            <p className="text-muted-foreground">
              본 개인정보 처리방침은 2026년 2월 1일부터 적용됩니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
