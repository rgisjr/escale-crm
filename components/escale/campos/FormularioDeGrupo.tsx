"use client";

import { useState } from "react";

import { BotaoDaJanela, CabecaDaJanela, Campo, CampoDeTexto, JanelaDaCasca, RodapeDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { useT } from "@/hooks/i18n/useT";

/** "Adicionar grupo" (AddFieldGroup da Clint). */
export function FormularioDeGrupo({ aoFechar, aoSalvar }: { aoFechar: () => void; aoSalvar: (nome: string) => Promise<unknown> }) {
  const t = useT();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const salvar = async () => {
    if (!nome.trim()) return setErro(t("O nome do grupo é obrigatório!"));
    setSalvando(true);
    try {
      await aoSalvar(nome.trim());
    } catch (e) {
      setErro(e instanceof Error ? e.message : t("Ocorreu um erro ao salvar"));
    } finally {
      setSalvando(false);
    }
  };
  return (
    <JanelaDaCasca aberta onFechar={aoFechar} className="w-[min(480px,100%)]">
      <CabecaDaJanela titulo={t("Adicionar grupo")} />
      <div className="px-6 py-4">
        <Campo rotulo={t("Nome do Grupo")} obrigatorio>
          <CampoDeTexto autoFocus value={nome} onChange={(e) => { setNome(e.target.value); setErro(null); }} placeholder={t("Digite para criar um novo grupo")} />
        </Campo>
        {erro && <p className="mt-2 text-[12px] text-casca-alerta">{erro}</p>}
      </div>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={aoFechar}>{t("Cancelar")}</BotaoDaJanela>
        <BotaoDaJanela variante="salvar" onClick={salvar} disabled={salvando}>{t("Salvar")}</BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
