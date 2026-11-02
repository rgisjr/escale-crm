"use client";
import { useMemo, useState } from "react";

import { BotaoDaJanela, CabecaDaJanela, CampoDeTexto, JanelaDaCasca, RodapeDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { codigoDoErro, usePublicacoesDaConta } from "@/hooks/escale/useComentarios";
import { useT } from "@/hooks/i18n/useT";
import { semAcento } from "@/lib/escale/automacoes/regras";
import { MAXIMO_DE_CAMINHOS, MAXIMO_DE_PUBLICACOES } from "@/lib/escale/comentarios/constantes";
import type { PublicacaoDoCaminho } from "@/lib/escale/comentarios/schema";
import type { PublicacaoDaConta } from "@/lib/escale/comentarios/zernio";
import { Check, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

type Aba = "pesquisar" | "id";
type Tipo = "todos" | "imagem" | "video" | "reel" | "carrossel";

const TIPOS: readonly { valor: Tipo; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "imagem", rotulo: "Imagem" },
  { valor: "video", rotulo: "Vídeo" },
  { valor: "reel", rotulo: "Reel" },
  { valor: "carrossel", rotulo: "Carrossel" },
];
const TIPO_DA_API: Record<string, Tipo> = {
  IMAGE: "imagem",
  VIDEO: "video",
  REELS: "reel",
  REEL: "reel",
  CAROUSEL_ALBUM: "carrossel",
};
const ID_VALIDO = /^\d{5,40}(_\d{5,40})?$/;

const tipoDe = (p: PublicacaoDaConta): Tipo | null => TIPO_DA_API[(p.tipo ?? "").toUpperCase()] ?? null;
const dataBr = (iso: string | null): string => {
  const quando = iso ? new Date(iso) : null;
  return quando && !Number.isNaN(quando.getTime()) ? quando.toLocaleDateString("pt-BR") : "";
};
const daConta = (p: PublicacaoDaConta): PublicacaoDoCaminho => ({
  id: p.id,
  legenda: p.legenda ? p.legenda.slice(0, 300) : null,
  miniatura: p.miniatura,
  tipo: p.tipo,
});

/**
 * "SELECIONAR PUBLICAÇÕES" (fork Escale, Fase 10B, D6): as 25 mais recentes da conta (a API não
 * pagina), com busca por legenda, filtro por tipo e a aba para digitar o ID. Provisório: sem print.
 */
export function SeletorDePublicacoes({
  aberta,
  conta,
  emUso,
  totalCaminhos,
  totalPublicacoes,
  aoFechar,
  aoConcluir,
}: {
  aberta: boolean;
  conta: { id: string; nome: string };
  /** Os ids que já estão em algum caminho do gatilho. */
  emUso: ReadonlySet<string>;
  totalCaminhos: number;
  totalPublicacoes: number;
  aoFechar: () => void;
  aoConcluir: (publicacoes: PublicacaoDoCaminho[], agrupar: boolean) => void;
}) {
  const t = useT();
  const consulta = usePublicacoesDaConta(aberta ? conta.id : null);
  const [aba, setAba] = useState<Aba>("pesquisar");
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<Tipo>("todos");
  const [escolhidas, setEscolhidas] = useState<readonly PublicacaoDoCaminho[]>([]);
  const [idDigitado, setIdDigitado] = useState("");
  const [erroDoId, setErroDoId] = useState<string | null>(null);
  const [agrupar, setAgrupar] = useState(false);

  const visiveis = useMemo(() => {
    const termo = semAcento(busca.trim());
    return (consulta.data ?? []).filter(
      (p) => (tipo === "todos" || tipoDe(p) === tipo) && (!termo || semAcento(p.legenda ?? "").includes(termo)),
    );
  }, [consulta.data, busca, tipo]);

  const ids = new Set(escolhidas.map((p) => p.id));
  const alternar = (p: PublicacaoDoCaminho) =>
    setEscolhidas((atual) => (atual.some((x) => x.id === p.id) ? atual.filter((x) => x.id !== p.id) : [...atual, p]));

  function adicionarId() {
    const id = idDigitado.trim();
    if (!ID_VALIDO.test(id)) return setErroDoId(t("Use o ID numérico da publicação ou busque pela legenda."));
    if (ids.has(id)) return setErroDoId(t("Esta publicação já está selecionada."));
    if (emUso.has(id)) return setErroDoId(t("Esta publicação já está no fluxo."));
    setErroDoId(null);
    setIdDigitado("");
    setEscolhidas((atual) => [...atual, { id, legenda: null, miniatura: null, tipo: null }]);
  }

  const novosCaminhos = escolhidas.length === 0 ? 0 : agrupar ? 1 : escolhidas.length;
  const limite =
    totalCaminhos + novosCaminhos > MAXIMO_DE_CAMINHOS
      ? t("O gatilho aceita até 10 caminhos de publicação.")
      : totalPublicacoes + escolhidas.length > MAXIMO_DE_PUBLICACOES
        ? t("O gatilho aceita até 20 publicações.")
        : null;

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(720px,calc(100vw-2rem))]">
      <CabecaDaJanela
        titulo={t("Selecionar publicações")}
        descricao={t("{conta} · cada publicação vira um caminho no fluxo").replace("{conta}", conta.nome)}
      />
      <p className="text-[12px] text-casca-suave">{t("Escolha como deseja encontrar a publicação")}</p>
      <AbasDaCasca
        aria-label={t("Como encontrar a publicação")}
        valor={aba}
        aoMudar={setAba}
        abas={[
          { valor: "pesquisar", rotulo: t("Pesquisar publicação") },
          { valor: "id", rotulo: t("Digitar o ID da publicação") },
        ]}
      />

      {aba === "pesquisar" ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <CampoDeTexto
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={t("Buscar por legenda")}
              aria-label={t("Buscar por legenda")}
              className="max-w-[260px]"
            />
            <div className="flex items-center gap-1.5" role="group" aria-label={t("Tipo de publicação")}>
              {TIPOS.map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  aria-pressed={tipo === o.valor}
                  onClick={() => setTipo(o.valor)}
                  className={cn(
                    "h-7 rounded-full border px-3 text-[12px]",
                    tipo === o.valor ? "border-casca-marca bg-casca-marca-suave text-casca-texto" : "border-casca-divisoria text-casca-texto-2",
                  )}
                >
                  {t(o.rotulo)}
                </button>
              ))}
            </div>
          </div>
          <ListaDePublicacoes
            carregando={consulta.isLoading}
            codigoDoErro={consulta.isError ? codigoDoErro(consulta.error) : null}
            aoTentarDeNovo={() => void consulta.refetch()}
            total={consulta.data?.length ?? 0}
            visiveis={visiveis}
            escolhidas={ids}
            emUso={emUso}
            aoAlternar={(p) => alternar(daConta(p))}
            aoLimparFiltro={() => {
              setBusca("");
              setTipo("todos");
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-casca-texto">{t("ID da publicação")}</p>
          <div className="flex gap-2">
            <CampoDeTexto
              value={idDigitado}
              onChange={(e) => setIdDigitado(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && adicionarId()}
              placeholder={t("Ex: 17912345678901234")}
              aria-label={t("ID da publicação")}
            />
            <BotaoDaCasca variante="marca" onClick={adicionarId}>
              {t("Adicionar")}
            </BotaoDaCasca>
          </div>
          <p className={cn("text-[11px]", erroDoId ? "text-casca-alerta" : "text-casca-suave")} role={erroDoId ? "alert" : undefined}>
            {erroDoId ?? t("Cole o ID da publicação do Instagram. Útil para posts antigos ou fora da lista.")}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {escolhidas
              .filter((p) => p.legenda === null && p.miniatura === null)
              .map((p) => (
                <li key={p.id} className="flex items-center gap-1 rounded-md bg-casca-marca-suave px-2 py-0.5 text-[12px] text-casca-texto">
                  {p.id}
                  <button type="button" aria-label={t("Remover o ID {id}").replace("{id}", p.id)} onClick={() => alternar(p)}>
                    <X size={10} aria-hidden />
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

      {escolhidas.length >= 2 ? (
        <div className="flex items-center justify-between rounded-lg bg-casca-raia px-3 py-2">
          <div>
            <p className="text-[13px] text-casca-texto">{t("Agrupar em um único caminho")}</p>
            <p className="text-[11px] text-casca-suave">{t("As publicações compartilham o mesmo filtro e a mesma resposta")}</p>
          </div>
          <InterruptorDaCasca ligado={agrupar} aoMudar={setAgrupar} aria-label={t("Agrupar em um único caminho")} />
        </div>
      ) : null}
      {limite ? (
        <p role="alert" className="text-[12px] text-casca-alerta">
          {limite}
        </p>
      ) : null}
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={aoFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaCasca variante="marca" disabled={escolhidas.length === 0 || limite !== null} onClick={() => aoConcluir([...escolhidas], agrupar)}>
          {t("Concluir")}
        </BotaoDaCasca>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}

function ListaDePublicacoes(props: {
  carregando: boolean;
  codigoDoErro: string | null;
  aoTentarDeNovo: () => void;
  total: number;
  visiveis: readonly PublicacaoDaConta[];
  escolhidas: ReadonlySet<string>;
  emUso: ReadonlySet<string>;
  aoAlternar: (p: PublicacaoDaConta) => void;
  aoLimparFiltro: () => void;
}) {
  const t = useT();
  if (props.carregando) {
    return (
      <div aria-label={t("Carregando publicações")} className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-lg bg-casca-raia" />
        ))}
      </div>
    );
  }
  if (props.codigoDoErro === "conta_desconectada") {
    return <p className="text-[13px] text-casca-texto-2">{t("Esta conta do Instagram está desconectada. Vá até Canais e conecte a conta novamente para carregar as publicações.")}</p>;
  }
  if (props.codigoDoErro === "acesso_recusado") {
    return <p className="text-[13px] text-casca-texto-2">{t("Não foi possível acessar esta conta do Instagram. Vá até Canais, desconecte a conta e conecte-a novamente para carregar as publicações.")}</p>;
  }
  if (props.codigoDoErro) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-[13px] text-casca-texto-2">{t("Erro ao carregar publicações")}</p>
        <button type="button" onClick={props.aoTentarDeNovo} className="text-[13px] font-medium text-casca-marca-forte hover:underline">
          {t("Tentar novamente")}
        </button>
      </div>
    );
  }
  if (props.total === 0) return <p className="text-[13px] text-casca-texto-2">{t("Nenhuma publicação encontrada")}</p>;
  if (props.visiveis.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-[13px] text-casca-texto-2">{t("Nenhuma publicação corresponde aos filtros")}</p>
        <button type="button" onClick={props.aoLimparFiltro} className="text-[13px] font-medium text-casca-marca-forte hover:underline">
          {t("Limpar filtro")}
        </button>
      </div>
    );
  }
  return (
    <>
      <div className="grid max-h-[340px] grid-cols-3 gap-3 overflow-y-auto">
        {props.visiveis.map((p) => {
          const noFluxo = props.emUso.has(p.id);
          const marcada = props.escolhidas.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={marcada}
              disabled={noFluxo}
              onClick={() => props.aoAlternar(p)}
              className={cn(
                "relative flex flex-col gap-1 rounded-lg border p-2 text-left disabled:cursor-not-allowed disabled:opacity-60",
                marcada ? "border-2 border-casca-marca" : "border-casca-divisoria hover:bg-casca-raia",
              )}
            >
              {p.miniatura ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.miniatura} alt="" className="aspect-square w-full rounded-md object-cover" />
              ) : (
                <span className="aspect-square w-full rounded-md bg-casca-raia" aria-hidden />
              )}
              <span className="line-clamp-2 text-[12px] text-casca-texto">{p.legenda ?? t("Sem legenda")}</span>
              <span className="text-[10px] text-casca-suave">{[dataBr(p.criadaEm), tipoDe(p) ? t(TIPOS.find((o) => o.valor === tipoDe(p))!.rotulo) : ""].filter(Boolean).join(" · ")}</span>
              {marcada ? <Check size={14} className="absolute top-2 right-2 rounded-full bg-casca-marca p-0.5 text-white" aria-hidden /> : null}
              {noFluxo ? <span className="absolute top-2 left-2 rounded bg-casca-raia px-1.5 text-[10px] text-casca-texto-2">{t("No fluxo")}</span> : null}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-casca-suave">{t("Exibindo as publicações mais recentes. Para uma específica, use o ID.")}</p>
    </>
  );
}
