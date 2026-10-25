"use client";
import { useState, type ReactElement } from "react";

import { CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { LinhaCriarTag } from "@/components/escale/ui/LinhaCriarTag";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";

/**
 * O BALÃO "NOME" DA CLINT (P05 e P09 de docs/clint/prints-1f): abre acima do
 * gatilho, com o título "Nome", um campo e "Cancelar" + "Salvar" (menta, claro
 * enquanto vazio). Serve à tag, ao motivo de perda e ao grupo.
 * `aoSalvar` devolve o erro (já traduzido) ou null; com null, o balão fecha.
 */
export function BalaoDoNome({
  gatilho,
  placeholder,
  "aria-label": rotulo,
  aoSalvar,
  sugestoes = [],
  maxLength = 80,
  align = "start",
  tagParaCriar,
}: {
  gatilho: ReactElement;
  placeholder: string;
  "aria-label": string;
  aoSalvar: (texto: string) => string | null;
  sugestoes?: readonly string[];
  maxLength?: number;
  align?: "start" | "end";
  /** Só o balão da tag: devolve a tag que o texto cria (null = não há o que criar) e liga a linha "Criar". */
  tagParaCriar?: (texto: string) => string | null;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const termo = texto.trim().toLowerCase();
  const nova = tagParaCriar?.(texto) ?? null;
  const achadas = sugestoes.filter((s) => s.toLowerCase().includes(termo)).slice(0, 8);

  function mudarAberto(v: boolean) {
    setAberto(v);
    if (!v) {
      setTexto("");
      setErro(null);
    }
  }

  function salvar(valor: string) {
    const problema = aoSalvar(valor);
    if (problema) return setErro(problema);
    mudarAberto(false);
  }

  return (
    <Popover open={aberto} onOpenChange={mudarAberto}>
      <PopoverTrigger asChild>{gatilho}</PopoverTrigger>
      <PainelSuspenso
        side="top"
        align={align}
        sideOffset={8}
        aria-label={rotulo}
        className="w-[290px] p-3"
      >
        <p className="mb-2 text-[12px] font-medium text-casca-texto">{t("Nome")}</p>
        <CampoDeTexto
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              salvar(texto);
            }
          }}
          aria-label={rotulo}
          placeholder={placeholder}
          maxLength={maxLength}
          className="h-9 text-[11px]"
        />
        {nova ? (
          <div className="mt-1">
            <LinhaCriarTag tag={nova} aoCriar={salvar} />
          </div>
        ) : null}
        {achadas.length > 0 ? (
          <ul className="mt-1 max-h-40 overflow-y-auto">
            {achadas.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => salvar(s)}
                  className="w-full rounded-[2px] px-3 py-2 text-left text-[11px] text-casca-texto hover:bg-(--escale-seletor-hover)"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {erro ? (
          <p role="alert" className="mt-2 text-[11px] text-casca-alerta">
            {erro}
          </p>
        ) : null}
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => mudarAberto(false)}
            className="h-[22px] px-2 text-[11px] text-casca-texto hover:underline"
          >
            {t("Cancelar")}
          </button>
          <button
            type="button"
            disabled={!texto.trim()}
            onClick={() => salvar(texto)}
            className="h-[22px] rounded-[4px] bg-(--escale-salvar) px-2.5 text-[11px] font-medium text-(--escale-salvar-texto) disabled:opacity-50"
          >
            {t("Salvar")}
          </button>
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
