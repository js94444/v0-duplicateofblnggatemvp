import Link from "next/link"

export function PublicFooter() {
  return (
    <footer className="relative z-10 py-6 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center text-[10px] text-white/30 tracking-widest uppercase border-t border-white/5">
      <div className="mb-4 md:mb-0">
        © BORYEONG LNG Terminal Management System
      </div>
      <div className="flex gap-8 font-bold">
        <a href="/docs/privacy-policy.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors">Privacy Policy</a>
        <Link href="/contact" className="hover:text-amber-500 transition-colors">Contact Us</Link>
      </div>
    </footer>
  )
}
