/** Original LEAP monogram: lived experience (L), a person, and an ascending path. */
export function LeapMark({ className = "h-full w-full" }: { className?: string }) {
  return <img src="/leap-mark.svg" alt="" aria-hidden="true" width={80} height={80} className={className} />;
}
export function LeapLogo() {
  return <span className="brand"><span className="brand-icon"><LeapMark /></span><span><strong>LEAP AI</strong><small>Livelihood pathways</small></span></span>;
}
