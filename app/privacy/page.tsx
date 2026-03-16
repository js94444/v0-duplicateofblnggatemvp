import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "개인정보 처리방침",
  description: "보령LNG터미널(주) 출입 관리 시스템 개인정보 처리방침",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* 뒤로가기 */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/40 hover:text-amber-500 transition-colors text-sm font-bold tracking-widest uppercase mb-12"
        >
          <ArrowLeft size={16} />
          메인으로
        </Link>

        {/* 제목 */}
        <div className="mb-12 border-b border-white/10 pb-8">
          <p className="text-amber-500 text-xs font-bold tracking-widest uppercase mb-3">보령LNG터미널(주) 출입 관리 시스템</p>
          <h1 className="text-3xl font-black text-white">개인정보 처리방침</h1>
          <p className="text-white/40 text-sm mt-4 leading-relaxed">
            보령LNG터미널주식회사(이하 "회사")는 「개인정보 보호법」 제30조에 따라 출입관리시스템을 통하여 처리되는 개인정보에 대한
            처리 기준과 절차를 명확히 하고, 정보주체의 권익을 보호하기 위하여 본 개인정보 처리방침을 수립·공개합니다.
          </p>
        </div>

        <div className="space-y-10">
          {/* 제1조 */}
          <section>
            <h2 className="text-lg font-black text-amber-500 mb-4">제1조 개인정보의 처리 목적</h2>
            <p className="text-white/60 text-sm leading-relaxed mb-4">
              회사는 출입관리시스템 운영을 위하여 다음의 목적으로 개인정보를 처리합니다. 회사가 처리하고 있는 개인정보는 다음의
              목적 외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를
              받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ol className="space-y-2">
              {[
                "방문자 본인 확인 및 출입 승인, 출입 이력 관리",
                "시설 및 항만 보안 유지",
                "'경비업법'에 따른 특수경비업무 수행",
                "'국제항해선박 및 항만시설의 보안에 관한 법률'에 따른 항만시설 보안 관리",
                "안전사고 예방 및 비상상황 발생 시 대응",
                "관계 법령 및 회사 내부 규정 준수",
              ].map((item, i) => (
                <li key={i} className="flex gap-3 text-sm text-white/60">
                  <span className="text-amber-500 font-bold shrink-0">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* 제2조 */}
          <section>
            <h2 className="text-lg font-black text-amber-500 mb-4">제2조 처리하는 개인정보의 항목 및 보유기간</h2>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              회사는 법령에 따른 개인정보 보유·이용기간 또는 개인정보 수집 시 동의받은 보유·이용기간 내에서 개인정보를
              처리·보유합니다. 출입관리시스템을 통해 수집된 개인정보는 수집·이용 목적 달성 시까지 보관하되, 보유기간 경과 시
              지체 없이 파기합니다.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="text-left px-4 py-3 text-white/80 font-bold">구분</th>
                    <th className="text-left px-4 py-3 text-white/80 font-bold">필수 처리 항목</th>
                    <th className="text-left px-4 py-3 text-white/80 font-bold">처리 목적</th>
                    <th className="text-left px-4 py-3 text-white/80 font-bold whitespace-nowrap">보유기간</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white font-semibold whitespace-nowrap">기본 인적사항</td>
                    <td className="px-4 py-3 text-white/60">성명, 생년월일, 연락처, 소속, 직책, 주소</td>
                    <td className="px-4 py-3 text-white/60">방문자 식별 및 본인 확인</td>
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap">방문일로부터 3년</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white font-semibold whitespace-nowrap">방문·출입 정보</td>
                    <td className="px-4 py-3 text-white/60">방문 목적, 방문 일자, 출입 구역, 출입 이력, 전자기기 반입 정보, 관련 증빙서류</td>
                    <td className="px-4 py-3 text-white/60">출입 승인 및 출입 통제, 항만시설 관리</td>
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap">방문일로부터 3년</td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white font-semibold whitespace-nowrap">차량 정보</td>
                    <td className="px-4 py-3 text-white/60">차량번호, 차종</td>
                    <td className="px-4 py-3 text-white/60">차량 출입 관리</td>
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap">방문일로부터 3년</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 제3조 ~ 제7조 */}
          {[
            {
              title: "제3조 개인정보의 제3자 제공",
              content: "회사는 정보주체의 개인정보를 수집·이용 목적 범위 내에서 처리하며, 정보주체의 동의 또는 법령에 특별한 규정이 있는 경우를 제외하고는 개인정보를 제3자에게 제공하지 않습니다.",
            },
            {
              title: "제4조 개인정보 처리의 위탁",
              content: "회사는 원활한 출입관리시스템 운영을 위하여 개인정보 처리 업무를 외부 전문업체에 위탁할 수 있으며, 「개인정보 보호법」 제26조에 따라 위탁계약 시 개인정보 보호에 관한 사항을 계약서에 명시하고 수탁자를 관리·감독합니다. 위탁 사항 발생 시(또는 이후 위탁업무의 내용이나 수탁자가 변경될 경우)에는 지체 없이 본 개인정보 처리방침을 통하여 공개합니다.",
            },
            {
              title: "제5조 정보주체의 권리 및 행사방법",
              content: "정보주체는 개인정보보호법 등 관계법령에 따라 회사에 대하여 개인정보 열람, 정정·삭제, 처리정지를 요구할 수 있으며, 권리 행사는 서면 또는 전자우편 등을 통하여 할 수 있습니다.",
            },
            {
              title: "제6조 개인정보의 파기",
              content: "회사는 개인정보 보유기간의 경과 또는 처리 목적 달성 등 개인정보가 불필요하게 되었을 경우 지체 없이 해당 개인정보를 파기합니다. 전자적 파일 형태의 개인정보는 복구가 불가능한 방법으로 삭제하며, 종이 문서는 분쇄 또는 소각의 방법으로 파기합니다.",
            },
          ].map(({ title, content }) => (
            <section key={title}>
              <h2 className="text-lg font-black text-amber-500 mb-4">{title}</h2>
              <p className="text-white/60 text-sm leading-relaxed">{content}</p>
            </section>
          ))}

          {/* 제7조 */}
          <section>
            <h2 className="text-lg font-black text-amber-500 mb-4">제7조 개인정보의 안전성 확보조치</h2>
            <p className="text-white/60 text-sm leading-relaxed mb-4">
              회사는 「개인정보 보호법」 제29조에 따라 개인정보의 분실·도난·유출·변조 또는 훼손을 방지하기 위하여
              관리적·기술적·물리적 보호조치를 시행합니다.
            </p>
            <ol className="space-y-2">
              {[
                "관리적 조치 : 내부관리계획 수립·시행, 정기적 직원 교육",
                "기술적 조치 : 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치 등",
                "물리적 조치 : 통신실, 자료보관실 등의 접근통제",
              ].map((item, i) => (
                <li key={i} className="flex gap-3 text-sm text-white/60">
                  <span className="text-amber-500 font-bold shrink-0">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* 제8조 */}
          <section>
            <h2 className="text-lg font-black text-amber-500 mb-4">제8조 출입 관리 시스템 개인정보 보호책임자</h2>
            <p className="text-white/60 text-sm leading-relaxed mb-4">
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을
              위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <div className="space-y-3">
              {[
                {
                  role: "개인정보 보호책임자",
                  info: "백현선 팀장 / 대외협력팀 / 041-939-9924 / vab123@lng-tml.com",
                },
                {
                  role: "개인정보 보호담당자",
                  info: "최민서 매니저 / 대외협력팀 / 041-939-9923 / 1nehunnit@lng-tml.com",
                },
              ].map(({ role, info }) => (
                <div key={role} className="bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                  <p className="text-white font-bold text-sm mb-1">{role}</p>
                  <p className="text-white/50 text-sm">{info}</p>
                </div>
              ))}
            </div>
            <p className="text-white/40 text-sm leading-relaxed mt-4">
              정보주체는 회사의 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을
              개인정보 보호책임자 및 담당부서로 문의하실 수 있습니다. 회사는 정보주체의 문의에 대해 지체 없이 답변 및 처리해드릴
              것입니다.
            </p>
          </section>

          {/* 제9조 */}
          <section>
            <h2 className="text-lg font-black text-amber-500 mb-4">제9조 개인정보 침해에 대한 구제방법</h2>
            <p className="text-white/60 text-sm leading-relaxed mb-4">
              정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터
              등에 분쟁해결이나 상담 등을 신청할 수 있습니다.
            </p>
            <ol className="space-y-2">
              {[
                { label: "개인정보분쟁조정위원회", contact: "(국번없이) 1833-6972", url: "www.kopico.go.kr" },
                { label: "개인정보침해신고센터", contact: "(국번없이) 118", url: "privacy.kisa.or.kr" },
                { label: "대검찰청", contact: "(국번없이) 1301", url: "www.spo.go.kr" },
                { label: "경찰청 사이버수사국", contact: "(국번없이) 182", url: "ecrm.police.go.kr" },
              ].map((item, i) => (
                <li key={i} className="flex gap-3 text-sm text-white/60">
                  <span className="text-amber-500 font-bold shrink-0">{i + 1}.</span>
                  <span>
                    {item.label} : {item.contact} (
                    <a href={`https://${item.url}`} target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">
                      {item.url}
                    </a>
                    )
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {/* 제10조 */}
          <section>
            <h2 className="text-lg font-black text-amber-500 mb-4">제10조 개인정보 처리방침의 변경</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              본 개인정보 처리방침은 2026년 3월 10일부터 적용됩니다. 본 개인정보 처리방침은 관계법령 또는 회사 내부 방침의
              변경에 따라 개정될 수 있으며, 변경 시 출입관리시스템을 통해 공지합니다.
            </p>
          </section>
        </div>

        {/* Footer */}
        <PublicFooter />


      </div>
    </div>
  )
}
