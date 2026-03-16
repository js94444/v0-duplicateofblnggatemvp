"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, ClipboardCheck, Bell, UserCheck, MapPin, Info, Check } from "lucide-react"
import Link from "next/link"
import { PublicHeader } from "@/components/public/public-header"
import { PublicFooter } from "@/components/public/public-footer"
import { useLang } from "@/lib/language-context"

export default function VisitAgreementPage() {
  const router = useRouter()
  const { t } = useLang()
  const [agreements, setAgreements] = useState({
    privacy: false,
    security: false,
    safety: false,
    all: false
  })

  const visitSteps = [
    { label: t("방문신청", "Apply"), icon: <ClipboardCheck size={16} /> },
    { label: t("담당자통보", "Notify"), icon: <Bell size={16} /> },
    { label: t("내부승인", "Approve"), icon: <UserCheck size={16} /> },
    { label: t("방문", "Visit"), icon: <MapPin size={16} /> },
  ]

  const handleAllAgree = () => {
    const newState = !agreements.all
    setAgreements({ privacy: newState, security: newState, safety: newState, all: newState })
  }

  const toggleAgree = (key: string) => {
    setAgreements(prev => {
      const updated = { ...prev, [key]: !prev[key] }
      updated.all = updated.privacy && updated.security && updated.safety
      return updated
    })
  }

  const handleSubmit = () => {
    if (agreements.all) {
      router.push("/apply/visit/form")
    }
  }

  const AgreementCard = ({ title, content, checked, onToggle }: { title: string; content: React.ReactNode; checked: boolean; onToggle: () => void }) => (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden group hover:border-white/20 transition-all">
      <div className="p-8 pb-0 flex justify-between items-center">
        <h3 className="text-xl font-black flex items-center gap-3">
          <Info size={18} className="text-amber-500" />
          {title}
        </h3>
      </div>
      <div className="p-8">
        <div className="bg-black/60 rounded-2xl p-6 text-white/50 text-sm font-light leading-relaxed border border-white/5">
          {content}
        </div>
        <label className="mt-6 flex items-center gap-3 cursor-pointer max-w-fit group/label">
          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${checked ? 'bg-amber-500 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'border-white/10 group-hover/label:border-amber-500/50'}`}>
            {checked && <Check size={14} className="text-black" strokeWidth={4} />}
          </div>
          <input type="checkbox" className="hidden" checked={checked} onChange={onToggle} />
          <span className={`text-sm font-bold transition-colors ${checked ? 'text-amber-500' : 'text-white/40'}`}>내용을 확인하였으며 동의합니다 (필수)</span>
        </label>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col relative overflow-hidden">

      {/* Background Layer */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/lng-terminal-bg.jpg')",
            filter: 'brightness(0.3) blur(5px)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
      </div>

      <PublicHeader />

      {/* Main Content */}
      <main className="relative z-10 flex-1 overflow-y-auto px-8 md:px-16 pt-32 pb-24">
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">

          {/* Back Button & Title */}
          <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-amber-500 transition-colors mb-6 group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold tracking-widest uppercase">Go Back</span>
          </Link>

          <h2 className="text-4xl md:text-5xl font-black mb-2 text-white">
            {t("방문 신청", "Visit Application")}
          </h2>
          <div className="mb-12">
            <p className="text-white/40 text-sm mb-2">
              {t("방문 신청을 위해 아래 동의 사항을 확인하고 동의해주세요.", "Please review and agree to the following terms to proceed with your visit application.")}
            </p>
            <p className="text-amber-400 text-sm font-bold uppercase tracking-wider">
              {t("상시출입증 소유자는 신청서 작성이 필요없습니다.", "Frequent pass holders do not need to fill out an application.")}
            </p>
          </div>

          {/* Visit Steps Indicator */}
          <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px] px-12 py-8 mb-16">
            <div className="flex flex-col gap-3">
              {/* Icons and lines row */}
              <div className="grid grid-cols-[auto_1fr_auto_1fr_auto_1fr_auto] items-center gap-4">
                {visitSteps.map((step, idx) => (
                  <React.Fragment key={`icon-group-${idx}`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${idx === 0 ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.5)]' : 'bg-white/10 text-white/40'}`}>
                      {step.icon}
                    </div>
                    {idx < visitSteps.length - 1 && (
                      <div className="h-[2px] bg-white/10 w-full" />
                    )}
                  </React.Fragment>
                ))}
              </div>
              {/* Labels row */}
              <div className="grid grid-cols-[auto_1fr_auto_1fr_auto_1fr_auto] items-center gap-4">
                {visitSteps.map((step, idx) => (
                  <React.Fragment key={`label-group-${idx}`}>
                    <span className={`text-sm font-bold text-center whitespace-nowrap ${idx === 0 ? 'text-amber-500' : 'text-white/40'}`} style={{ width: '56px' }}>{step.label}</span>
                    {idx < visitSteps.length - 1 && (
                      <div />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Agreement Sections */}
          <div className="space-y-6">
            <AgreementCard
              title={t("개인정보 수집·이용 동의", "Privacy Policy Agreement")}
              checked={agreements.privacy}
              onToggle={() => toggleAgree('privacy')}
              content={
                <div className="space-y-4">
                  <p><strong>{t("1. 수집･이용 목적", "1. Purpose of Collection")}</strong><br />{t("보안사고, 테러예방, 안전교육 이수 확인, 사건(사고) 발생 시 경위 등 파악", "Security incident prevention, terrorism prevention, safety training verification, incident investigation")}</p>
                  <p><strong>{t("2. 수집･이용 항목", "2. Items Collected")}</strong><br />{t("성명, 생년월일, 성별, 주소, 연락처", "Name, date of birth, gender, address, contact information")}</p>
                  <p><strong>{t("3. 보유기간", "3. Retention Period")}</strong><br />{t("3년 (보유기간 경과 시 파기)", "3 years (destroyed after retention period)")}</p>
                  <p><strong>{t("4. 동의하지 않을 권리 및 미동의시 불이익", "4. Right to Refuse and Disadvantages")}</strong><br />{t("출입증 발급신청자는 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있으나, 미동의 시 『보안업무규정』제34조 제4항의 규정에 따라 보령 LNG 터미널 출입이 제한됨", "Applicants have the right to refuse consent to personal information collection and use, but refusal will result in restricted access to Boryeong LNG Terminal pursuant to Article 34(4) of the Security Work Regulations")}</p>
                </div>
              }
            />

            <AgreementCard
              title={t("보안 서약", "Security Pledge")}
              checked={agreements.security}
              onToggle={() => toggleAgree('security')}
              content={
                <div className="space-y-2">
                  <p>{t("본인은 국가보안시설의 방문 신청함에 있어 아래와 같이 서약합니다.", "I hereby pledge the following in applying to visit this national security facility.")}</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>{t("귀사의 보안관리규정을 준수하겠습니다.", "I will comply with the company's security management regulations.")}</li>
                    <li>{t("귀사의 기밀사항과 중요사항, 업무상 지득한 비밀을 타인에게 누설하지 않겠습니다.", "I will not disclose confidential matters, important information, or secrets obtained through work to others.")}</li>
                    <li>{t("시설내부에서 사진 및 영상촬영은 불가하며 필요시 사전에 허가를 받겠습니다.", "Photography and video recording inside the facility is prohibited; I will obtain prior permission if necessary.")}</li>
                    <li>{t("허가를 받아 촬영한 사진, 영상을 통신망 등에 무단으로 유포, 게재하지 않겠습니다.", "I will not distribute or post authorized photos or videos on communication networks without permission.")}</li>
                    <li>{t("제한구역 및 통제구역내 출입 필요시 허가를 받아 출입하겠습니다.", "I will obtain permission before entering restricted or controlled areas.")}</li>
                  </ol>
                  <p className="pt-2">{t("위 사항을 위규시에는 민,형사상 또는 보안상의 책임을 지며 관계법규에 의한 조치를 따를 것을 서약합니다.", "I pledge to bear civil, criminal, or security responsibility for violations of the above and to comply with measures under applicable laws.")}</p>
                </div>
              }
            />

            <AgreementCard
              title={t("안전준수 서약", "Safety Compliance Pledge")}
              checked={agreements.safety}
              onToggle={() => toggleAgree('safety')}
              content={
                <div className="space-y-2">
                  <p>{t("본인은 아래의 안전수칙을 반드시 준수하며, 미준수하는 경우 퇴출조치하여도 이의가 없음을 서약합니다.", "I pledge to strictly comply with the following safety rules and agree to be removed from the premises without objection if I fail to comply.")}</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>{t("제조소내 작업은 사전 작업허가를 승인 후 실시하며, 규정된 복장, 보호구를 정확하게 착용하고 작업한다.", "Work inside the facility shall be performed only after obtaining work permit approval, wearing proper attire and protective equipment.")}</li>
                    <li>{t("2M 이상 추락 위험장소에서는 안전대를 착용하고 화기취급 작업시 불티비산방지 조치를 하여야 하고, 인화성 물질은 격리한다.", "Wear safety harness at locations with fall risk over 2M, take spark prevention measures during hot work, and isolate flammable materials.")}</li>
                    <li>{t("작업장 주위를 항상 정리정돈하고 불안전한 행동을 금한다.", "Keep the work area clean and orderly at all times and refrain from unsafe behavior.")}</li>
                    <li>{t("경미한 사고라도 BLT에 알려야 하며, 근로자는 산업재해가 발생할 급박한 위험이 있는 경우에는 작업을 중지/대피 할 수 있다.", "Report even minor accidents to BLT; workers may stop work and evacuate in case of imminent industrial accident risk.")}</li>
                    <li>{t("지정된 흡연 장소 이외 흡연 금지한다.", "Smoking is prohibited outside designated smoking areas.")}</li>
                    <li>{t("공정지역 출입시 담당자 인솔 또는 허가 후 출입 가능하며 지역내에서 휴대폰 통화를 금지한다.", "Entry to process areas requires escort or permission from personnel in charge; mobile phone calls are prohibited in these areas.")}</li>
                    <li>{t("안전보건환경 안내서(SHE Flyer)를 숙지한다.", "Familiarize yourself with the Safety, Health, and Environment (SHE) Flyer.")}</li>
                  </ol>
                </div>
              }
            />

            {/* All Agree & Submit */}
            <div className="mt-12 p-8 rounded-[32px] border-2 border-amber-500/30 bg-amber-500/5 backdrop-blur-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <label className="flex items-center gap-4 cursor-pointer group">
                <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${agreements.all ? 'bg-amber-500 border-amber-500' : 'border-white/20 group-hover:border-amber-500/50'}`}>
                  {agreements.all && <Check size={18} className="text-black" strokeWidth={4} />}
                </div>
                <input type="checkbox" className="hidden" checked={agreements.all} onChange={handleAllAgree} />
                <span className="text-lg font-black text-white">{t("위 약관에 전체 동의합니다", "I agree to all of the above terms")}</span>
              </label>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!agreements.all}
                className={`flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-lg transition-all shadow-2xl ${agreements.all ? 'bg-amber-500 text-black hover:scale-105 active:scale-95' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
              >
                {t("신청서 작성", "Fill Application")}
                <ArrowRight size={20} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />


    </div>
  )
}
