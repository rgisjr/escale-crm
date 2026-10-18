"use client";
import { useMemo, useState } from "react";

import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { TeamMember } from "@/hooks/team/useTeamMembers";
import { PESSOAS_MAX } from "@/lib/escale/acesso/regras";
import { ChevronLeft, ChevronRight, X } from "@/lib/ui/icons-da-casca";

/** A Clint pagina a tabela de 10 em 10 (`Ue=10` em `Ps`). */
export const POR_PAGINA = 10;

export interface MembroDaEquipe {
  id: string;
  nome: string;
  email: string | null;
}

/** Os membros ativos, em ordem alfabética sem acento, como a Clint lista. */
export function membrosAtivosDaEquipe(
  equipe: readonly TeamMember[] | undefined,
  semNome: string,
): MembroDaEquipe[] {
  return (equipe ?? [])
    .filter((m) => m.accepted_at && !m.revoked_at)
    .map((m) => ({
      id: m.user_id.toLowerCase(),
      nome: m.full_name ?? m.email ?? semNome,
      email: m.email,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
}

/**
 * A LISTA DE PESSOAS COM ACESSO (fork Escale, Fase 1J, D12; código `Ps` da Clint, sem print).
 *
 * A tabela "Usuários" com o ✕, a paginação "n / N" e o seletor com busca que
 * some quando todos já estão na lista. Controlada: quem a usa guarda `pessoas`
 * (a subaba da origem no rascunho da 1F).
 */
export function ListaDePessoas({
  pessoas,
  membros,
  aoMudar,
  placeholder,
}: {
  pessoas: readonly string[];
  membros: readonly MembroDaEquipe[];
  aoMudar: (pessoas: string[]) => void;
  placeholder: string;
}) {
  const t = useT();
  const [pagina, setPagina] = useState(1);
  const porId = useMemo(() => new Map(membros.map((m) => [m.id, m])), [membros]);
  const restantes = membros.filter((m) => !pessoas.includes(m.id));
  const totalDePaginas = Math.max(1, Math.ceil(pessoas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalDePaginas);
  const daPagina = pessoas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  return (
    <div className="grid gap-4">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="h-11 border-b border-casca-borda text-left">
            <th
              scope="col"
              className="text-[10px] font-semibold tracking-wide text-casca-meta uppercase"
            >
              {t("Usuários")}
            </th>
            <th scope="col" className="w-10">
              <span className="sr-only">{t("Remover")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {daPagina.map((id) => {
            const m = porId.get(id);
            const nome = m?.nome ?? id;
            return (
              <tr key={id} className="h-11 border-b border-casca-borda">
                <td className="text-casca-texto">
                  {nome}
                  {m?.email ? <span className="text-casca-suave"> &lt;{m.email}&gt;</span> : null}
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    aria-label={`${t("Remover")} ${nome}`}
                    onClick={() => aoMudar(pessoas.filter((p) => p !== id))}
                    className="rounded-[4px] p-1 text-casca-meta hover:text-casca-alerta"
                  >
                    <X size={14} aria-hidden />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {pessoas.length > POR_PAGINA ? (
        <div className="flex items-center justify-end gap-2 text-[12px] text-casca-suave">
          <button
            type="button"
            aria-label={t("Página anterior")}
            disabled={paginaAtual <= 1}
            title={paginaAtual <= 1 ? t("Primeira página") : t("Página anterior")}
            onClick={() => setPagina(paginaAtual - 1)}
            className="grid size-6 place-items-center rounded-[4px] text-casca-texto disabled:opacity-40"
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          <span>{`${paginaAtual} / ${totalDePaginas}`}</span>
          <button
            type="button"
            aria-label={t("Próxima página")}
            disabled={paginaAtual >= totalDePaginas}
            title={paginaAtual >= totalDePaginas ? t("Última página") : t("Próxima página")}
            onClick={() => setPagina(paginaAtual + 1)}
            className="grid size-6 place-items-center rounded-[4px] text-casca-texto disabled:opacity-40"
          >
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      ) : null}

      {restantes.length > 0 && pessoas.length < PESSOAS_MAX ? (
        <div className="w-[480px] max-w-full">
          <SeletorDaCasca
            aparencia="janela"
            valor=""
            vazio={placeholder}
            vazioSoNoGatilho
            buscaAPartirDe={1}
            opcoes={restantes.map((m) => ({ valor: m.id, rotulo: m.nome }))}
            aoMudar={(v) => v && aoMudar([...pessoas, v])}
            aria-label={placeholder}
            className="text-[11.9px] font-light"
          />
        </div>
      ) : null}
    </div>
  );
}

/** "1 usuário selecionado" / "N usuários selecionados" (Clint 11626); nada com 0. */
export function ContadorDePessoas({ total }: { total: number }) {
  const t = useT();
  if (total === 0) return null;
  return (
    <p className="text-[13px] text-casca-suave">
      {total === 1 ? t("1 usuário selecionado") : `${total} ${t("usuários selecionados")}`}
    </p>
  );
}
