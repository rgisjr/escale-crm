"use client";

import { useEffect, useState } from "react";

import { CampoDeTexto, Campo } from "@/components/escale/origens/JanelaDaCasca";
import { AlternanciaDaCasca } from "@/components/escale/ui/AlternanciaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import { Search, Star } from "@/lib/ui/icons-da-casca";

export type EscolhaDoContato =
  | { modo: "existente"; contato: { id: string; nome: string; temEmpresa?: boolean } | null }
  | { modo: "novo"; nome: string; ddi: string; telefone: string; email: string };

interface Achado { id: string; nome: string; telefone: string | null; email: string | null; empresa?: { id: string; nome: string } | null }

/** O passo "Contato" da "Nova empresa": vincular existente ou criar novo (vira o principal). */
export function PassoContatoDaEmpresa({
  valor,
  aoMudar,
  soExistente = false,
}: {
  valor: EscolhaDoContato;
  aoMudar: (v: EscolhaDoContato) => void;
  /** A janela "Vincular existente" não oferece "Criar novo". */
  soExistente?: boolean;
}) {
  const t = useT();
  const [busca, setBusca] = useState("");
  const [achados, setAchados] = useState<Achado[] | null>(null);

  useEffect(() => {
    if (valor.modo !== "existente") return;
    const termo = busca.trim();
    // Cancela a busca anterior: a resposta de um termo velho não pode chegar por último.
    const cancelar = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/v1/lista-de-contatos?n=10${termo.length >= 2 ? `&q=${encodeURIComponent(termo)}` : ""}`, { signal: cancelar.signal });
        if (!r.ok) return;
        const corpo = await r.json();
        setAchados(((corpo?.data?.linhas ?? []) as Achado[]).map((l) => ({ id: l.id, nome: l.nome, telefone: l.telefone, email: l.email, empresa: l.empresa ?? null })));
      } catch {
        // Busca cancelada ou sem rede: fica a lista anterior em vez de uma rejeição solta.
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      cancelar.abort();
    };
  }, [busca, valor.modo]);

  return (
    <div className="flex flex-col gap-4">
      {soExistente ? null : (
      <AlternanciaDaCasca
        aria-label={t("Contato")}
        valor={valor.modo}
        opcoes={[{ valor: "existente", rotulo: t("Vincular existente") }, { valor: "novo", rotulo: t("Criar novo") }]}
        aoMudar={(m) => aoMudar(m === "novo" ? { modo: "novo", nome: "", ddi: "55", telefone: "", email: "" } : { modo: "existente", contato: null })}
      />
      )}
      {valor.modo === "existente" ? (
        <div className="flex flex-col gap-2">
          <label className="relative block">
            <CampoDeTexto value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t("Buscar contato por nome, telefone ou e-mail")} />
            <Search size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-casca-meta" />
          </label>
          {!busca.trim() && <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-casca-meta">{t("Contatos recentes")}</p>}
          <ul role="listbox" aria-label={t("Contatos")} className="max-h-[260px] overflow-y-auto">
            {achados?.length === 0 && (
              <li className="py-6 text-center text-[13px] text-casca-suave">{busca.trim() ? t("Nenhum contato encontrado.") : t("Nenhum contato cadastrado ainda.")}</li>
            )}
            {achados?.map((c) => {
              const escolhido = valor.contato?.id === c.id;
              return (
                <li
                  key={c.id}
                  role="option"
                  aria-selected={escolhido}
                  onClick={() => aoMudar({ modo: "existente", contato: { id: c.id, nome: c.nome, temEmpresa: Boolean(c.empresa) } })}
                  className={`flex cursor-pointer items-center justify-between rounded-[6px] px-3 py-2 ${escolhido ? "bg-casca-marca-suave" : "hover:bg-casca-raia"}`}
                >
                  <span>
                    <span className="block text-[13px] font-medium text-casca-texto">{c.nome}</span>
                    <span className="block text-[12px] text-casca-suave">{c.telefone ? formatarTelefone(c.telefone) : (c.email ?? "")}</span>
                  </span>
                  {escolhido && <Star size={14} className="fill-current text-casca-marca" />}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Campo rotulo={t("Nome do contato")} obrigatorio>
            <CampoDeTexto autoFocus value={valor.nome} onChange={(e) => aoMudar({ ...valor, nome: e.target.value })} placeholder={t("Digite o nome do contato")} />
          </Campo>
          <Campo rotulo={t("Telefone")}>
            <CampoDeTexto inputMode="tel" value={valor.telefone} onChange={(e) => aoMudar({ ...valor, telefone: e.target.value })} placeholder="(11) 99999-9999" />
          </Campo>
          <Campo rotulo={t("Email")}>
            <CampoDeTexto type="email" value={valor.email} onChange={(e) => aoMudar({ ...valor, email: e.target.value })} />
          </Campo>
          <p className="rounded-[6px] bg-casca-marca-suave px-3 py-2 text-[12px] text-casca-texto">
            {t("Será definido como contato principal da empresa e aparecerá em destaque na listagem.")}
          </p>
        </div>
      )}
    </div>
  );
}
