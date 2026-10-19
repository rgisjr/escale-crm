"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CelulaTags } from "@/components/escale/contatos/CelulasDoContato";
import { FotoDaLinha } from "@/components/escale/contatos/FotoDaLinha";
import { JanelaNovoContato } from "@/components/escale/contatos/JanelaNovoContato";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useMudarEmpresa } from "@/hooks/escale/useEmpresa";
import { useT } from "@/hooks/i18n/useT";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import type { ContatoDaEmpresa } from "@/lib/escale/empresas/banco";
import { MoreVertical, Star } from "@/lib/ui/icons-da-casca";

import { JanelaRemoverDaEmpresa } from "./JanelaRemoverDaEmpresa";
import { JanelaVincularContato } from "./JanelaVincularContato";

const TH = "h-[44px] px-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-casca-texto";

/** A aba Contatos da ficha da empresa (Clint `OrgContactsTab`). */
export function AbaContatosDaEmpresa({
  empresaId,
  contatos,
  podeEditar,
}: {
  empresaId: string;
  contatos: ContatoDaEmpresa[];
  podeEditar: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const mudar = useMudarEmpresa(empresaId);
  const [vincularAberto, setVincularAberto] = useState(false);
  const [novoAberto, setNovoAberto] = useState(false);
  const [removendo, setRemovendo] = useState<ContatoDaEmpresa | null>(null);

  async function tornarPrincipal(contatoId: string | null) {
    try {
      await mudar.tornarPrincipal.mutateAsync(contatoId);
      toast.success(
        contatoId ? t("Contato definido como principal.") : t("Contato removido como principal."),
      );
    } catch {
      toast.error(t("Não foi possível atualizar o contato principal."));
    }
  }

  async function remover(novoPrincipal: string | null) {
    if (!removendo) return;
    try {
      const r = await mudar.remover.mutateAsync({ contatoId: removendo.id, novoPrincipal });
      setRemovendo(null);
      if (r.desfecho === "empresa_excluida") {
        toast.success(t("Empresa removida."));
        router.push("/app/companies");
        return;
      }
      toast.success(t("Contato removido da empresa."));
    } catch {
      toast.error(t("Não foi possível remover o contato da empresa."));
    }
  }

  return (
    <div className="px-6 py-4">
      {podeEditar ? (
        <div className="mb-3 flex justify-end gap-2">
          <BotaoDaCasca type="button" variante="novo" onClick={() => setVincularAberto(true)}>
            {t("Vincular existente")}
          </BotaoDaCasca>
          <BotaoDaCasca type="button" variante="marca" onClick={() => setNovoAberto(true)}>
            {t("Novo contato")}
          </BotaoDaCasca>
        </div>
      ) : null}
      {contatos.length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-16 text-center">
          <p className="text-[14px] font-medium text-casca-texto">{t("Nenhum contato nesta empresa")}</p>
          <p className="text-[13px] text-casca-suave">
            {t("Os contatos vinculados a esta empresa aparecerão aqui.")}
          </p>
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-casca-borda">
              <th className={TH}>{t("Nome")}</th>
              <th className={TH}>{t("Contato")}</th>
              <th className={TH}>{t("Tags")}</th>
              <th className={TH}>{t("Negócios")}</th>
              <th className={`${TH} w-10`}>
                <span className="sr-only">{t("Ações")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {contatos.map((c) => (
              <tr key={c.id} className="h-16 border-b border-casca-borda hover:bg-casca-raia">
                <td className="px-3">
                  <div className="flex items-center gap-3">
                    <FotoDaLinha id={c.id} nome={c.nome} temFoto={c.tem_foto} />
                    {c.principal ? (
                      podeEditar ? (
                        <button
                          type="button"
                          aria-label={t("Contato principal · clique para remover")}
                          title={t("Contato principal · clique para remover")}
                          onClick={() => void tornarPrincipal(null)}
                          className="text-casca-marca"
                        >
                          <Star size={13} aria-hidden className="fill-current" />
                        </button>
                      ) : (
                        <Star size={13} aria-hidden className="fill-current text-casca-marca" />
                      )
                    ) : null}
                    <Link
                      href={`/app/contacts/${c.id}`}
                      className="truncate text-[14px] font-medium text-casca-texto hover:underline"
                    >
                      {c.nome}
                    </Link>
                  </div>
                </td>
                <td className="px-3 text-[13px] text-casca-suave">
                  <span className="block">{c.telefone ? formatarTelefone(c.telefone) : "—"}</span>
                  {c.email ? <span className="block text-[12px]">{c.email}</span> : null}
                </td>
                <td className="px-3">
                  <CelulaTags tags={c.tags} />
                </td>
                <td className="px-3">
                  {c.negocios > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(c.negocio_unico ? `/app/negocios/${c.negocio_unico}` : `/app/contacts/${c.id}`)
                      }
                      className="inline-flex h-6 items-center rounded-[6px] border border-casca-borda px-2 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
                    >
                      {(c.negocios === 1 ? t("Ver {n} negócio") : t("Ver {n} negócios")).replace(
                        "{n}",
                        String(c.negocios),
                      )}
                    </button>
                  ) : (
                    <span className="text-[12px] text-casca-meta">—</span>
                  )}
                </td>
                <td className="px-3 text-right">
                  {podeEditar ? (
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          type="button"
                          aria-label={`${t("Ações de")} ${c.nome}`}
                          className="rounded-[6px] p-1 text-casca-suave hover:bg-casca-raia"
                        >
                          <MoreVertical size={18} aria-hidden />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          align="end"
                          sideOffset={6}
                          className="z-[70] w-[220px] rounded-[8px] border border-casca-borda bg-casca-superficie p-1 shadow-casca"
                        >
                          {!c.principal ? (
                            <DropdownMenu.Item
                              onSelect={() => void tornarPrincipal(c.id)}
                              className="flex h-8 cursor-pointer items-center rounded-[6px] px-2 text-[13px] text-casca-texto outline-hidden data-[highlighted]:bg-casca-raia"
                            >
                              {t("Tornar contato principal")}
                            </DropdownMenu.Item>
                          ) : null}
                          <DropdownMenu.Item
                            onSelect={() => setRemovendo(c)}
                            className="flex h-8 cursor-pointer items-center rounded-[6px] px-2 text-[13px] text-casca-alerta outline-hidden data-[highlighted]:bg-casca-raia"
                          >
                            {t("Remover da empresa")}
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <JanelaVincularContato aberta={vincularAberto} empresaId={empresaId} aoFechar={() => setVincularAberto(false)} />
      <JanelaNovoContato
        aberta={novoAberto}
        aoFechar={() => setNovoAberto(false)}
        origens={[]}
        aoCriar={(c) => {
          void mudar.vincular
            .mutateAsync(c.id)
            .then(() => toast.success(t("Contato {name} adicionado à empresa.").replace("{name}", c.nome)))
            .catch(() => toast.error(t("Não foi possível adicionar o contato. Tente novamente.")));
        }}
      />
      <JanelaRemoverDaEmpresa
        alvo={removendo}
        contatos={contatos}
        ocupado={mudar.remover.isPending}
        aoFechar={() => setRemovendo(null)}
        aoConfirmar={(novo) => void remover(novo)}
      />
    </div>
  );
}
