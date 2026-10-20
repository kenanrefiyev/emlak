/** Centered Homelengo section heading: small blue subtitle over a 40px title. */
export function SectionHead({ subtitle, title, lead, id, align = "center" }: { subtitle?: string; title: string; lead?: string; id?: string; align?: "center" | "left" }) {
  return (
    <div className={`mb-10 lg:mb-12 ${align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}`}>
      {subtitle && <p className="t-subtitle">{subtitle}</p>}
      <h2 id={id} className="t-h2 mt-2">
        {title}
      </h2>
      {lead && <p className="mt-3 text-[0.9375rem] text-ink-2">{lead}</p>}
    </div>
  );
}

export function EmptyState({ title, body, children, icon }: { title: string; body?: string; children?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-paper px-6 py-12 text-center">
      {icon && <div className="grid size-14 place-items-center rounded-full bg-mist text-brand">{icon}</div>}
      <h3 className="t-h5">{title}</h3>
      {body && <p className="max-w-md text-[0.9375rem] text-ink-2">{body}</p>}
      {children && <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
