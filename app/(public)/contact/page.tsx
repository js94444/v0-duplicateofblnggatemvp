"use client"

import { MapPin, Phone, Printer, Building2, ExternalLink } from "lucide-react"
import { PublicHeader } from "@/components/public/public-header"
import { PublicFooter } from "@/components/public/public-footer"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useRef } from "react"
import { useLang } from "@/lib/language-context"

const office = {
  label: "보령본사",
  sublabel: "Head Office",
  address: "충청남도 보령시 오천면 오천해안로 333",
  tel: "041.939.9955",
  fax: "041.939.9999",
  lat: 36.414142,
  lng: 126.500305,
  kakaoMapUrl: "https://map.kakao.com/link/map/보령LNG터미널,36.414142,126.500305",
  naverMapUrl: "https://map.naver.com/v5/search/충청남도+보령시+오천면+오천해안로+333",
}

function LeafletMap({ lat, lng }: { lat: number; lng: number }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Dynamically import Leaflet to avoid SSR issues
    import("leaflet").then((L) => {
      // Fix default marker icon
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      const map = L.map(mapRef.current!, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: true,
      })

      // OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      // Custom marker
      const customIcon = L.divIcon({
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:#0298c2;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.4);transform:rotate(-45deg);"></div>
            <div style="background:white;color:#0298c2;font-size:11px;font-weight:900;padding:4px 10px;border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap;margin-top:-10px;">보령LNG터미널</div>
          </div>
        `,
        className: "",
        iconSize: [120, 60],
        iconAnchor: [60, 42],
        popupAnchor: [0, -50],
      })

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map)
      marker.bindPopup(`
        <div style="font-family:sans-serif;padding:8px 4px;">
          <div style="font-weight:900;font-size:14px;color:#0298c2;margin-bottom:4px;">보령LNG터미널 본사</div>
          <div style="font-size:12px;color:#555;">충청남도 보령시 오천면 오천해안로 333</div>
          <div style="font-size:12px;color:#555;margin-top:2px;">TEL: 041-939-9955</div>
        </div>
      `).openPopup()

      mapInstanceRef.current = map
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [lat, lng])

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin="anonymous"
      />
      <div ref={mapRef} className="w-full h-[420px]" />
    </>
  )
}

export default function ContactPage() {
  const { t } = useLang()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const PremiumLogo = () => (
    <Link href="/" className="flex items-center group cursor-pointer">
      <Image
        src="/images/boryeong-lng-ci.png"
        alt="보령LNG터미널"
        width={200}
        height={40}
        className="h-8 md:h-10 w-auto group-hover:opacity-90 transition-opacity"
        priority
      />
    </Link>
  )

  return (
    <div className="min-h-screen font-sans bg-black text-white flex flex-col relative overflow-hidden">

      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/lng-terminal-bg.jpg')", filter: "brightness(0.4)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
      </div>

      <PublicHeader />

      {/* Content */}
      <main className="relative z-10 flex-1 pt-32 pb-24 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">

          {/* Page Title */}
          <div className="mb-10">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-[2px] bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
              <span className="text-amber-500 text-sm font-black tracking-[0.4em] uppercase">Contact Us</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">{t("오시는 길", "How to Get Here")}</h1>
            <p className="text-white/40 text-sm">{t("보령LNG터미널 본사 위치 안내", "Location guide for Boryeong LNG Terminal Head Office")}</p>
          </div>

          {/* Info Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-5 shadow-2xl">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
              <div className="w-12 h-12 rounded-2xl bg-[#0298c2]/20 border border-[#0298c2]/30 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#0298c2]" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">{office.label}</h2>
                <p className="text-[#0298c2] text-xs font-semibold tracking-wider uppercase">{office.sublabel}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#0298c2]/20 border border-[#0298c2]/30 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-[#0298c2]" />
                </div>
                <div>
                  <p className="text-[#0298c2] text-xs font-bold tracking-widest uppercase mb-1.5">Address</p>
                  <p className="text-white/80 text-sm leading-relaxed">{office.address}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#02856f]/20 border border-[#02856f]/30 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-[#02856f]" />
                </div>
                <div>
                  <p className="text-[#02856f] text-xs font-bold tracking-widest uppercase mb-1.5">TEL</p>
                  <a href={`tel:${office.tel.replace(/\./g, "-")}`} className="text-white/80 text-sm font-mono hover:text-white transition-colors">
                    {office.tel}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <Printer className="w-4 h-4 text-white/60" />
                </div>
                <div>
                  <p className="text-white/40 text-xs font-bold tracking-widest uppercase mb-1.5">FAX</p>
                  <p className="text-white/80 text-sm font-mono">{office.fax}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Map Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl mb-5">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
              <MapPin className="w-4 h-4 text-[#0298c2]" />
              <span className="text-white/60 text-sm font-medium">위치</span>
              <div className="ml-auto flex items-center gap-3">
                <a href={office.kakaoMapUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#FEE500] hover:text-white transition-colors font-semibold flex items-center gap-1">
                  카카오맵 <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-white/20">|</span>
                <a href={office.naverMapUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#02c75a] hover:text-white transition-colors font-semibold flex items-center gap-1">
                  네이버지도 <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Leaflet Interactive Map */}
            <LeafletMap lat={office.lat} lng={office.lng} />

            <div className="px-6 py-4 border-t border-white/10 flex items-center gap-3">
              <MapPin className="w-4 h-4 text-[#0298c2] shrink-0" />
              <span className="text-white/60 text-sm">{office.address}</span>
            </div>
          </div>

        </div>
      </main>

      <PublicFooter />


    </div>
  )
}
