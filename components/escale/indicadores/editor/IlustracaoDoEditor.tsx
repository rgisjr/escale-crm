/** O desenho lilás do vazio do editor (10-012): janela, pizza, barras e imagem, na escala da marca (provisório no traço). */
export function IlustracaoDoEditor() {
  const forte = "var(--color-casca-marca-media)";
  const suave = "var(--color-casca-marca-suave)";
  return (
    <svg width="150" height="95" viewBox="0 0 150 95" fill="none" aria-hidden>
      <rect x="6" y="6" width="138" height="83" rx="6" fill={suave} stroke={forte} strokeWidth="2" />
      <line x1="6" y1="22" x2="144" y2="22" stroke={forte} strokeWidth="2" />
      <circle cx="16" cy="14" r="2.5" fill={forte} />
      <circle cx="25" cy="14" r="2.5" fill={forte} />
      <path d="M38 62a14 14 0 1 1 14 14V62z" fill={forte} />
      <rect x="64" y="56" width="9" height="20" rx="1.5" fill={forte} />
      <rect x="77" y="46" width="9" height="30" rx="1.5" fill={forte} />
      <rect x="90" y="36" width="9" height="40" rx="1.5" fill={forte} />
      <rect x="108" y="36" width="26" height="22" rx="3" stroke={forte} strokeWidth="2" />
      <path d="m111 54 7-8 5 5 4-4 5 7" stroke={forte} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
