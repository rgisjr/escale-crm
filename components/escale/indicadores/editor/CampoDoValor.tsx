"use client";
import { useState } from "react";

import { CalendarioDePeriodo } from "@/components/escale/ui/CalendarioDePeriodo";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useOpcoesDaDimensao } from "@/hooks/escale/useOpcoesDaDimensao";
import { useT } from "@/hooks/i18n/useT";
import type { FonteDeOpcoes } from "@/lib/escale/indicadores/catalogo/tipos";
import { tipoDoCampo, variavelDoCatalogo, type CatalogoDaTela } from "@/lib/escale/indicadores/editor/catalogo-da-tela";
import { usaLista } from "@/lib/escale/indicadores/editor/operadores";
import type { CondicaoDoRascunho, ValorDaCondicao } from "@/lib/escale/indicadores/editor/rascunho";
import { formatarDataBr } from "@/lib/escale/ui/periodos";
import { CalendarDays } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** Os textos da Clint por fonte (10-038); as outras fontes usam o texto nosso. */
const VAZIO_POR_FONTE: Partial<Record<FonteDeOpcoes, string>> = {
  etapas: "Selecione a(s) etapa(s)",
  usuarios: "Selecione usuário(s)",
  origens: "Selecione a origem",
  grupos_de_origem: "Selecione o(s) grupo(s) de origem",
  status_do_negocio: "Selecione o status",
};
const CAMPO = "h-8 w-full rounded-[4px] bg-casca-busca px-3 text-[13px] text-casca-texto outline-none focus-visible:ring-2 focus-visible:ring-casca-marca";

type Props = {
  condicao: CondicaoDoRascunho;
  catalogo: CatalogoDaTela;
  aoMudar: (valor: ValorDaCondicao) => void;
  comErro: boolean;
};

const comoTexto = (v: ValorDaCondicao | undefined): string =>
  v === undefined || Array.isArray(v) ? "" : typeof v === "number" ? String(v).replace(".", ",") : String(v);

/** O valor da condição por tipo (10-038, 10-064): lista, texto, número com vírgula, data e sim/não. */
export function CampoDoValor({ condicao, catalogo, aoMudar, comErro }: Props) {
  const t = useT();
  const campo = condicao.campo ?? "";
  const tipo = tipoDoCampo(campo, catalogo) ?? "texto";
  const variavel = variavelDoCatalogo(campo, catalogo);
  const objeto = /^campo:(negocio|contato|empresa):/.exec(campo)?.[1] as "negocio" | "contato" | "empresa" | undefined;
  const campoComLista = objeto ? Boolean(catalogo.camposPersonalizados[objeto]?.find((c) => c.id === campo)?.opcoes?.length) : false;
  const temLista = Boolean(variavel?.opcoes) || campoComLista;
  const lista = usaLista(temLista ? { opcoes: variavel?.opcoes ?? "campo" } : undefined, condicao.op);
  const opcoes = useOpcoesDaDimensao(campo || null, lista);
  const [calendario, setCalendario] = useState(false);

  let controle;
  if (lista) {
    const vazio = t(VAZIO_POR_FONTE[variavel?.opcoes ?? "tags"] ?? "Selecione o(s) valor(es)");
    controle = opcoes.isLoading ? (
      <div className={cn(CAMPO, "flex items-center text-casca-suave")}>{t("Carregando opções...")}</div>
    ) : (
      <SeletorMultiploDaCasca
        aria-label={vazio}
        vazio={vazio}
        valores={Array.isArray(condicao.valor) ? condicao.valor : []}
        opcoes={(opcoes.data ?? []).map((o) => ({ valor: o.valor, rotulo: o.rotulo }))}
        aoMudar={aoMudar}
      />
    );
  } else if (tipo === "booleano") {
    controle = (
      <SeletorDaCasca
        aria-label={t("Valor")}
        className="h-8"
        vazio={t("Selecione o(s) valor(es)")}
        valor={condicao.valor === true ? "sim" : condicao.valor === false ? "nao" : ""}
        opcoes={[
          { valor: "sim", rotulo: t("Sim") },
          { valor: "nao", rotulo: t("Não") },
        ]}
        aoMudar={(v) => v && aoMudar(v === "sim")}
      />
    );
  } else if (tipo === "data") {
    const iso = typeof condicao.valor === "string" ? condicao.valor : undefined;
    controle = (
      <Popover open={calendario} onOpenChange={setCalendario}>
        <PopoverTrigger asChild>
          <button type="button" aria-label={t("Valor")} className={cn(CAMPO, "flex items-center justify-between text-left")}>
            <span className={iso ? "" : "text-casca-suave"}>{iso ? formatarDataBr(iso) : "dd/mm/aaaa"}</span>
            <CalendarDays size={14} aria-hidden className="text-casca-suave" />
          </button>
        </PopoverTrigger>
        <PainelSuspenso className="w-auto p-0">
          <CalendarioDePeriodo
            valor={{ tipo: "criacao", ...(iso ? { de: iso, ate: iso } : {}) }}
            semAbas
            umMes
            aoMudar={(p) => {
              if (!p.de) return;
              aoMudar(p.de);
              setCalendario(false);
            }}
          />
        </PainelSuspenso>
      </Popover>
    );
  } else {
    controle = (
      <input
        aria-label={t("Valor")}
        inputMode={tipo === "numero" ? "decimal" : undefined}
        value={comoTexto(condicao.valor)}
        onChange={(e) => aoMudar(e.target.value)}
        className={CAMPO}
      />
    );
  }
  return (
    <div>
      {controle}
      {comErro ? <p className="mt-1 text-[12px] text-casca-alerta">{t("campo obrigatório")}</p> : null}
    </div>
  );
}
