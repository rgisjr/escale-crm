"use client";
import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useGravarContato } from "@/hooks/escale/useGravarContato";
import { useT } from "@/hooks/i18n/useT";
import { useEditLead } from "@/hooks/kanban/useUpdateLead";
import { tituloDoCard } from "@/lib/escale/quadro/aparencia";
import type { Lead } from "@/lib/types/leads";
import { Check, Pencil, X } from "@/lib/ui/icons-da-casca";

/**
 * O NOME NO CABEÇALHO DA FICHA (fork Escale, Fase 1H; N5; print 01).
 *
 * Como na Clint: o lápis ("Editar nome") abre um input de 200px, até 80
 * caracteres, "Nome do contato"; ✓ "Salvar nome" e ✕; Enter salva, Esc
 * cancela; vazio ou igual só cancela. Grava o NOME DO CONTATO (é ele que o
 * card e o cabeçalho mostram); em negócio sem contato, o título do negócio.
 */
const MAX_NOME = 80;

export function NomeDaFicha({ lead, pipelineId }: { lead: Lead; pipelineId: string }) {
  const t = useT();
  const atual = tituloDoCard(lead);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(atual);
  const [salvando, setSalvando] = useState(false);
  const { gravar } = useGravarContato(lead.contact_id ?? "", pipelineId);
  const editarNegocio = useEditLead(pipelineId);

  function abrir() {
    setTexto(atual);
    setEditando(true);
  }
  function cancelar() {
    setEditando(false);
  }
  async function salvar() {
    const nome = texto.trim();
    if (!nome || nome === atual) return cancelar();
    setSalvando(true);
    try {
      if (lead.contact_id) await gravar({ name: nome });
      else await editarNegocio.mutateAsync({ leadId: lead.id, patch: { title: nome } });
      toast.success(t("Nome atualizado."));
      setEditando(false);
    } catch {
      toast.error(t("Não foi possível atualizar o nome. Tente novamente."));
    } finally {
      setSalvando(false);
    }
  }
  function tecla(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void salvar();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelar();
    }
  }

  if (!editando) {
    return (
      <div className="flex min-w-0 items-center gap-[3px]">
        <h1 className="truncate text-[15px] font-normal text-casca-texto">{atual}</h1>
        <BotaoDaCasca
          variante="icone"
          tamanho="sm"
          aria-label={t("Editar nome")}
          title={t("Editar nome")}
          onClick={abrir}
          className="[&_svg]:size-3!"
        >
          <Pencil aria-hidden />
        </BotaoDaCasca>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        aria-label={t("Nome do contato")}
        placeholder={t("Nome do contato")}
        maxLength={MAX_NOME}
        value={texto}
        disabled={salvando}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={tecla}
        className="h-7 w-[200px] rounded-md bg-casca-busca px-2 text-[15px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca"
      />
      <BotaoDaCasca
        variante="icone"
        tamanho="sm"
        aria-label={t("Salvar nome")}
        disabled={salvando}
        onClick={() => void salvar()}
        className="text-casca-marca"
      >
        <Check aria-hidden />
      </BotaoDaCasca>
      <BotaoDaCasca
        variante="icone"
        tamanho="sm"
        aria-label={t("Cancelar")}
        disabled={salvando}
        onClick={cancelar}
      >
        <X aria-hidden />
      </BotaoDaCasca>
    </div>
  );
}
