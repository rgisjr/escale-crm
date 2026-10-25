"use client";
import { useState } from "react";

import {
  BotaoDaJanela,
  CabecaDaJanela,
  Campo,
  CampoDeTexto,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { RecusaDeCampos } from "@/hooks/kanban/useMoveCard";

export type ModoDosPendentes = "mover" | "status" | "criar";

/** "1.250,00", "1.250", "R$ 1250" e "12,5" viram número; o que não for número vira NaN. */
function numeroBr(texto: string): number {
  const limpo = texto.replace(/R\$|\s/g, "");
  if (limpo.includes(",")) return Number(limpo.replace(/\./g, "").replace(",", "."));
  // Sem vírgula, ponto em grupos de três é milhar brasileiro ("1.250" = 1250); ponto solto, decimal.
  return Number(/^\d{1,3}(\.\d{3})+$/.test(limpo) ? limpo.replace(/\./g, "") : limpo);
}

/** dd/mm/aaaa → aaaa-mm-dd (como o dossiê grava data); inexistente (31/02) = null. */
function dataIso(texto: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const [dia, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const existe =
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
  return existe ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

type Valores = { customFields: Record<string, unknown>; wonReason?: string };

type PropsDaJanela = {
  aberta: boolean;
  onFechar: () => void;
  recusa: RecusaDeCampos | null;
  modo: ModoDosPendentes;
  etapa?: string;
  ocupado?: boolean;
  onConfirmar: (valores: Valores) => void;
};

/**
 * CAMPOS OBRIGATÓRIOS PENDENTES (Fase 1F; `RequiredFieldsModal` da Clint).
 * Não grava nada: devolve os valores para quem abriu reenviar a MESMA ação
 * (mover com `custom_fields`, ou gravar e então mudar o status).
 */
export function JanelaDeCamposPendentes(props: PropsDaJanela) {
  const { recusa, aberta, onFechar } = props;
  // O corpo guarda o que a pessoa digitou. Ele nasce de novo a cada abertura (o
  // conteúdo do Radix desmonta ao fechar) e a cada recusa nova, sem efeito.
  const chave = recusa ? `${recusa.args.leadId}:${recusa.args.stageId}` : "vazio";
  return (
    <JanelaDaCasca aberta={aberta} onFechar={onFechar}>
      <CorpoDosPendentes key={chave} {...props} />
    </JanelaDaCasca>
  );
}

function CorpoDosPendentes({
  recusa,
  modo,
  etapa,
  ocupado = false,
  onFechar,
  onConfirmar,
}: PropsDaJanela) {
  const t = useT();
  const [valores, setValores] = useState<Record<string, string>>({});
  const campos = recusa?.faltando ?? [];

  const preenchido = (chave: string, tipo?: string) => {
    if (tipo === "boolean") return true;
    const v = (valores[chave] ?? "").trim();
    if (!v) return false;
    if (tipo === "number" || tipo === "currency") return Number.isFinite(numeroBr(v));
    if (tipo === "date") return dataIso(v) !== null;
    return true;
  };
  const valido = campos.every((c) => preenchido(c.chave, c.tipo));

  function confirmar() {
    if (!valido || ocupado) return;
    const customFields: Record<string, unknown> = {};
    let wonReason: string | undefined;
    for (const c of campos) {
      const v = (valores[c.chave] ?? "").trim();
      if (c.chave === "won_reason") wonReason = v;
      else if (c.tipo === "boolean") customFields[c.chave] = valores[c.chave] === "true";
      else if (c.tipo === "number" || c.tipo === "currency") customFields[c.chave] = numeroBr(v);
      else if (c.tipo === "date") customFields[c.chave] = dataIso(v);
      else customFields[c.chave] = v;
    }
    onConfirmar({ customFields, ...(wonReason !== undefined ? { wonReason } : {}) });
  }

  const descricao =
    modo === "status"
      ? t("Preencha os campos abaixo para alterar o status deste negócio.")
      : modo === "criar"
        ? etapa
          ? t("Para criar o negócio em {stage}, preencha os campos abaixo.").replace(
              "{stage}",
              etapa,
            )
          : t("Preencha os campos abaixo para criar o negócio.")
        : etapa
          ? t("Para mover para {stage}, preencha os campos abaixo.").replace("{stage}", () => etapa)
          : t("Preencha os campos abaixo para mover este negócio.");
  const botao =
    modo === "status"
      ? t("Salvar e alterar status")
      : modo === "criar"
        ? t("Salvar e criar")
        : t("Salvar e mover");

  return (
    <>
      <CabecaDaJanela titulo={t("Campos obrigatórios pendentes")} descricao={descricao} />
      <div className="grid gap-4">
        {campos.map((c) => {
          const nome = c.chave === "won_reason" ? t("Motivo do ganho") : c.rotulo;
          if (c.tipo === "boolean") {
            return (
              <CaixaDaCasca
                key={c.chave}
                marcada={valores[c.chave] === "true"}
                aoMudar={(v) => setValores((x) => ({ ...x, [c.chave]: v ? "true" : "false" }))}
                rotulo={nome}
              />
            );
          }
          return (
            <Campo key={c.chave} rotulo={nome} obrigatorio>
              {c.tipo === "select" && c.opcoes?.length ? (
                <SeletorDaCasca
                  valor={valores[c.chave] ?? ""}
                  vazio={t("Selecionar campo")}
                  opcoes={c.opcoes.map((o) => ({ valor: o.value, rotulo: o.label }))}
                  aoMudar={(v) => setValores((x) => ({ ...x, [c.chave]: v }))}
                  aria-label={nome}
                />
              ) : (
                <>
                  <CampoDeTexto
                    aria-label={nome}
                    inputMode={c.tipo === "number" || c.tipo === "currency" ? "decimal" : undefined}
                    placeholder={c.tipo === "date" ? "dd/mm/aaaa" : undefined}
                    value={valores[c.chave] ?? ""}
                    onChange={(e) => setValores((x) => ({ ...x, [c.chave]: e.target.value }))}
                  />
                  {(valores[c.chave] ?? "").trim() !== "" && !preenchido(c.chave, c.tipo) && (
                    <p role="alert" className="text-xs text-casca-alerta">
                      {c.tipo === "date" ? t("Data inválida.") : t("Número inválido.")}
                    </p>
                  )}
                </>
              )}
            </Campo>
          );
        })}
      </div>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" disabled={!valido || ocupado} onClick={confirmar}>
          {botao}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </>
  );
}
