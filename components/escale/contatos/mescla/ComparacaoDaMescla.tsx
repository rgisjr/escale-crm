"use client";
import { useMemo, useState } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  CAMPOS_DA_MESCLA,
  ROTULO_DA_REGRA,
  ROTULO_DO_CAMPO_DA_MESCLA,
  contatoResultante,
  escolhasPadrao,
  estadoDoCampo,
  principalDasEscolhas,
  valorDoCampo,
  type CampoDaMescla,
  type ContatoDaMescla,
  type Escolhas,
  type Sugestao,
} from "@/lib/escale/mescla/regras";
import { cn } from "@/lib/utils";

import { SeloDaConfianca } from "./SeloDaConfianca";

export type PedidoDaComparacao = { principal: ContatoDaMescla; secundarios: string[]; escolhas: Escolhas };

/**
 * A COMPARAÇÃO DA DIREITA (Clint `DuplicateContactsV2`): uma coluna por contato
 * (desmarcar tira o contato; mínimo 2), uma linha por campo; clicar na célula
 * escolhe o valor que fica; "Contato resultante"; o botão "Mesclar contatos para
 * {nome}". Os campos já resolvidos (iguais ou únicos) ficam escondidos até
 * "Mostrar todos os campos".
 */
export function ComparacaoDaMescla({ sugestao, aoMesclar }: { sugestao: Sugestao; aoMesclar: (p: PedidoDaComparacao) => void }) {
  const t = useT();
  const [fora, setFora] = useState<ReadonlySet<string>>(new Set());
  const contatos = useMemo(() => sugestao.contatos.filter((c) => !fora.has(c.id)), [sugestao, fora]);
  const [escolhas, setEscolhas] = useState<Escolhas>(() => escolhasPadrao(sugestao.contatos));
  const [todos, setTodos] = useState(false);
  const validas: Escolhas = useMemo(() => {
    const padrao = escolhasPadrao(contatos);
    const juntas: Escolhas = { ...padrao };
    for (const campo of CAMPOS_DA_MESCLA) {
      if (escolhas[campo] && contatos.some((c) => c.id === escolhas[campo])) juntas[campo] = escolhas[campo];
    }
    return juntas;
  }, [contatos, escolhas]);
  const estados = CAMPOS_DA_MESCLA.map((campo) => ({ campo, estado: estadoDoCampo(contatos, campo) }));
  const aDecidir = estados.filter((e) => e.estado === "decidir").length;
  const resolvidos = estados.filter((e) => e.estado === "igual" || e.estado === "unico").length;
  const visiveis = estados.filter((e) => todos || e.estado === "decidir");
  const resultante = contatoResultante(contatos, validas);
  const principalId = contatos.length > 0 ? principalDasEscolhas(contatos, validas) : null;
  const principal = contatos.find((c) => c.id === principalId) ?? null;
  const poucos = contatos.length < 2;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-casca-borda px-5 py-3">
        <span className="truncate text-[15px] font-medium text-casca-texto">{sugestao.contatos.map((c) => c.nome ?? "—").join(", ")}</span>
        <span
          className="flex items-center gap-2"
          title={`${t("Confiança calculada a partir dos critérios que casaram e dos que conflitam entre os contatos.")} ${t("Casou por")}: ${sugestao.casou.map((r) => t(ROTULO_DA_REGRA[r])).join(", ")}${sugestao.conflitos.length ? ` · ${t("Conflito por")}: ${sugestao.conflitos.map((r) => t(ROTULO_DA_REGRA[r])).join(", ")}` : ""}`}
        >
          <SeloDaConfianca confianca={sugestao.confianca} />
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[14px] font-medium text-casca-texto">{t("Comparar contatos e escolher por campo")}</p>
        <p className="mt-1 text-[12px] text-casca-suave">
          {`${aDecidir} ${t("campos a decidir")} · ${resolvidos} ${t("campos já resolvidos")}`}
        </p>
        <p className="mt-1 text-[12px] text-casca-meta">
          {t("Toque em uma célula para escolher o valor que prevalece.")} {t("Desmarque uma coluna para excluir o contato da mescla.")}
        </p>
        <table className="mt-3 w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-casca-borda">
              <th className="w-32" />
              {sugestao.contatos.map((c) => (
                <th key={c.id} className="px-2 py-2 text-left font-medium">
                  <CaixaDaCasca
                    marcada={!fora.has(c.id)}
                    aoMudar={(m) => setFora((atual) => { const novo = new Set(atual); if (m) novo.delete(c.id); else novo.add(c.id); return novo; })}
                    rotulo={c.nome ?? "—"}
                    aria-label={c.nome ?? "—"}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visiveis.map(({ campo, estado }) => (
              <tr key={campo} className="border-b border-casca-borda">
                <td className="py-2 pr-2 text-casca-suave">
                  {t(ROTULO_DO_CAMPO_DA_MESCLA[campo])}
                  {estado === "igual" ? <span className="block text-[11px] text-casca-meta">{t("igual em todos")}</span> : null}
                  {estado === "unico" ? <span className="block text-[11px] text-casca-meta">{t("único disponível")}</span> : null}
                </td>
                {sugestao.contatos.map((c) => (
                  <td key={c.id} className="px-2 py-1.5">
                    <Celula campo={campo} contato={c} ativa={!fora.has(c.id)} escolhida={validas[campo] === c.id} aoEscolher={() => setEscolhas((e) => ({ ...e, [campo]: c.id }))} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {resolvidos > 0 ? (
          <button type="button" onClick={() => setTodos((v) => !v)} className="mt-2 text-[12px] font-medium text-casca-marca hover:underline">
            {todos ? t("Ocultar campos já resolvidos") : `${t("Mostrar todos os campos")} (${CAMPOS_DA_MESCLA.length})`}
          </button>
        ) : null}
        <p className="mt-2 text-[12px] text-casca-meta">{t("Tags: sempre unidas")}</p>
        <section aria-label={t("Contato resultante")} className="mt-4 rounded-lg border border-casca-borda bg-casca-raia p-3">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-casca-suave uppercase">{t("Contato resultante")}</p>
          <dl className="mt-2 grid grid-cols-[120px_1fr] gap-y-1 text-[13px]">
            {CAMPOS_DA_MESCLA.map((campo) => (
              <div key={campo} className="contents">
                <dt className="text-casca-suave">{t(ROTULO_DO_CAMPO_DA_MESCLA[campo])}</dt>
                <dd className="text-casca-texto">{resultante[campo] ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </section>
        {poucos ? <p className="mt-3 text-[12px] text-casca-alerta">{t("São necessários ao menos 2 contatos.")}</p> : null}
        {sugestao.bloqueada ? <p className="mt-3 text-[12px] text-casca-alerta">{t("Atendimento ativo impede a mescla deste grupo.")}</p> : null}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-casca-borda px-5 py-3">
        <span className="text-[12px] text-casca-meta">{t("A mescla é definitiva e não pode ser desfeita.")}</span>
        <BotaoDaCasca
          variante="marca"
          tamanho="md"
          disabled={poucos || sugestao.bloqueada || !principal}
          onClick={() =>
            principal &&
            aoMesclar({ principal, secundarios: contatos.map((c) => c.id).filter((id) => id !== principal.id), escolhas: validas })
          }
        >
          {`${t("Mesclar contatos para")} ${principal?.nome ?? resultante.nome ?? "—"}`}
        </BotaoDaCasca>
      </div>
    </div>
  );
}

function Celula({
  campo,
  contato,
  ativa,
  escolhida,
  aoEscolher,
}: {
  campo: CampoDaMescla;
  contato: ContatoDaMescla;
  ativa: boolean;
  escolhida: boolean;
  aoEscolher: () => void;
}) {
  const t = useT();
  const valor = valorDoCampo(contato, campo);
  if (!valor) return <span className="text-casca-meta">—</span>;
  return (
    <button
      type="button"
      aria-label={`${t(ROTULO_DO_CAMPO_DA_MESCLA[campo])}: ${valor}`}
      aria-pressed={escolhida}
      disabled={!ativa}
      onClick={aoEscolher}
      className={cn(
        "w-full truncate rounded-md border px-2 py-1 text-left",
        escolhida ? "border-casca-marca bg-casca-marca-suave text-casca-marca" : "border-casca-borda text-casca-texto hover:bg-casca-raia",
        !ativa && "opacity-40",
      )}
    >
      {valor}
    </button>
  );
}
