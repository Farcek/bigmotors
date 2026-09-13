export function BodyContainer({children}:{children: React.ReactNode}) {
  return <div className="max-w-[1200px] mx-auto">
    {children}
    </div>;
}

export function SectionDark({children}:{children: React.ReactNode}) {
  return <div className="bg-section-dark-bg text-section-dark-text">{children}</div>;
}