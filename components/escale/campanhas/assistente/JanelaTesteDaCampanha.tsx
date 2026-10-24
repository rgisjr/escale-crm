"use client";

import { useState } from "react";
import { toast } from "sonner";

import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { DialogTitle } from "@/components/ui/dialog";
import { useListaDeContatos } from "@/hooks/escale/useListaDeContatos";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import { Search } from "@/lib/ui/icons-da-casca";

import { BOTAO_CONTORNADO } from "../molde/estilos";

/**
 * "ENVIAR TESTE" (fork Escale, Fase 8B; P2): busca um contato e manda a
 * campanha só para ele, pelo mesmo caminho do envio (`testar` do original:
 * os mesmos vetos, o mesmo modelo).
 */
export function JanelaTesteDaCampanha({
  aberta,
  aoFechar,
  campanhaId,
}: {
  aberta: boolean;
  aoFechar: () => void;
  campanhaId: string;
}) {
  const t = useT();
  const [busca, setBusca] = useState("");
  const [enviando, setEnviando] = useState<string | null>(null);
  const lista = useListaDeContatos({
    q: busca.trim() || undefined,
    v: "todos",
    p: 1,
    n: 10,
    f: null,
  });
  const enviar = async (contactId: string) => {
    setEnviando(contactId);
    try {
      await apiClient.post(`/api/v1/campaigns/${campanhaId}/testar`, { contact_id: contactId });
      toast.success(t("Teste enviado."));
      aoFechar();
    } catch (e) {
      toast.error((e as Error).message || t("Não foi possível enviar o teste."));
    } finally {
      setEnviando(null);
    }
  };
  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(520px,calc(100vw-2rem))]">
      <DialogTitle className="text-[15px] font-medium text-casca-texto">
        {t("Enviar teste")}
      </DialogTitle>
      <label className="relative mt-4 block">
        <span className="sr-only">{t("Buscar por contato ou Empresa")}</span>
        <input
          autoFocus
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t("Buscar por contato ou Empresa")}
          className="h-8 w-full rounded-[6px] bg-casca-busca pr-8 pl-3 text-[13px]"
        />
        <Search className="absolute top-2 right-2 size-4 text-casca-suave" aria-hidden />
      </label>
      <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
        {(lista.data?.linhas ?? [])
          .filter((l) => l.telefone)
          .map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-3 rounded-[6px] px-2 py-2 hover:bg-casca-busca"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-casca-texto">
                  {nomeDoContato({ name: l.nome, display_name: l.display_name })}
                </span>
                <span className="block text-[12px] text-casca-suave">
                  {formatarTelefone(l.telefone)}
                </span>
              </span>
              <button
                type="button"
                disabled={enviando !== null}
                onClick={() => void enviar(l.id)}
                className={BOTAO_CONTORNADO}
              >
                {enviando === l.id ? t("Enviando…") : t("Enviar teste")}
              </button>
            </div>
          ))}
      </div>
    </JanelaDaCasca>
  );
}
