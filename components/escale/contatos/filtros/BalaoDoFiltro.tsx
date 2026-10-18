"use client";
import { useState, type ReactElement } from "react";

import { CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";

/**
 * "SALVAR FILTRO" DA CLINT (`SaveFilterPopover`): "Nome do filtro", "Ex: Clientes
 * em aberto", "Cancelar" e "Salvar"; Enter salva, Esc cancela. A caixinha
 * "Compartilhar com a equipe" é nossa (PRD B2, Q2). `aoSalvar` devolve a
 * mensagem do problema, ou null quando deu certo.
 */
export function BalaoDoFiltro({
  gatilho,
  aoSalvar,
}: {
  gatilho: ReactElement;
  aoSalvar: (nome: string, compartilhado: boolean) => Promise<string | null>;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [compartilhado, setCompartilhado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function mudarAberto(v: boolean) {
    setAberto(v);
    if (!v) {
      setNome("");
      setCompartilhado(false);
      setErro(null);
    }
  }

  async function salvar() {
    if (!nome.trim() || salvando) return;
    setSalvando(true);
    const problema = await aoSalvar(nome, compartilhado);
    setSalvando(false);
    if (problema) return setErro(problema);
    mudarAberto(false);
  }

  return (
    <Popover open={aberto} onOpenChange={mudarAberto}>
      <PopoverTrigger asChild>{gatilho}</PopoverTrigger>
      <PainelSuspenso align="start" className="w-72 space-y-3 p-4">
        <label className="grid gap-1.5">
          <span className="text-[12px] font-medium text-casca-texto">{t("Nome do filtro")}</span>
          <CampoDeTexto
            value={nome}
            maxLength={60}
            placeholder={t("Ex: Clientes em aberto")}
            onChange={(e) => {
              setNome(e.target.value);
              setErro(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void salvar();
              }
              if (e.key === "Escape") mudarAberto(false);
            }}
            className="h-8 px-3"
          />
        </label>
        <CaixaDaCasca
          marcada={compartilhado}
          aoMudar={setCompartilhado}
          rotulo={t("Compartilhar com a equipe")}
        />
        {erro ? (
          <p role="alert" className="text-[12px] text-casca-alerta">
            {erro}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <BotaoDaCasca
            type="button"
            variante="texto"
            tamanho="sm"
            onClick={() => mudarAberto(false)}
          >
            {t("Cancelar")}
          </BotaoDaCasca>
          <BotaoDaCasca
            type="button"
            variante="marca"
            tamanho="sm"
            disabled={!nome.trim() || salvando}
            title={!nome.trim() ? t("Dê um nome ao filtro.") : salvando ? t("Aguarde…") : undefined}
            onClick={() => void salvar()}
          >
            {t("Salvar")}
          </BotaoDaCasca>
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
