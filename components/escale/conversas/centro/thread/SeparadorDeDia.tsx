/** O separador de dia (c56): linha dos dois lados e "HOJE"/"ONTEM"/dd/mm/aaaa em 11px. */
export function SeparadorDeDia({ rotulo }: { rotulo: string }) {
  return (
    <div className="my-3 flex items-center gap-3" role="separator" aria-label={rotulo}>
      <span className="h-px flex-1 bg-casca-borda" />
      <span className="text-[11px] font-medium tracking-wide text-casca-suave uppercase">
        {rotulo}
      </span>
      <span className="h-px flex-1 bg-casca-borda" />
    </div>
  );
}
