"use client";
import { useState } from "react";

import { CLASSE_DA_LINHA_DO_MENU, CLASSE_DO_CAMPO } from "@/components/escale/filtros/controles";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  CONTEM_MAX,
  ROTULO_DO_OPERADOR,
  contarContem,
  operadoresDoTipo,
  precisaDeValor,
  type CampoDoFiltro,
  type CondicaoDoFiltro,
  type FiltrosDeContatos,
  type GrupoDoFiltro,
  type Operador,
} from "@/lib/escale/contatos/filtros";
import { numeroDoValor } from "@/lib/escale/filtros/campos";
import { dataBrDoIso, isoDaDataBr } from "@/lib/escale/filtros/periodo";
import { ChevronDown, ChevronRight, Search } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { BotaoVoltar, GruposDoFiltro, OpcaoDeRadio } from "./PecasDoFiltro";

type Traduzir = (texto: string) => string;

/** O valor digitado → o valor guardado (número com ponto, data ISO), ou null se não vale. */
function valorDigitado(campo: CampoDoFiltro, texto: string): string | null {
  const limpo = texto.trim();
  if (!limpo) return null;
  if (campo.tipo === "numero") {
    const n = numeroDoValor(limpo);
    return n === null ? null : String(n);
  }
  if (campo.tipo === "data") return isoDaDataBr(limpo);
  return limpo;
}

function valorLegivel(c: CondicaoDoFiltro, campo: CampoDoFiltro | undefined, t: Traduzir): string {
  const v = c.valor ?? "";
  if (c.tipo === "data") return dataBrDoIso(v);
  if (c.tipo === "booleano") return v === "true" ? t("Sim") : t("Não");
  if (c.tipo === "numero") return Number(v).toLocaleString("pt-BR");
  const opcao = campo?.opcoes?.find((o) => o.value === v);
  return opcao ? opcao.label : `"${v}"`;
}

function ValorDaCondicao({
  campo,
  texto,
  aoMudar,
}: {
  campo: CampoDoFiltro;
  texto: string;
  aoMudar: (texto: string) => void;
}) {
  const t = useT();
  if (campo.tipo === "booleano") {
    return (
      <SeletorDaCasca
        valor={texto}
        opcoes={[
          { valor: "true", rotulo: t("Sim") },
          { valor: "false", rotulo: t("Não") },
        ]}
        aoMudar={aoMudar}
        vazio={t("Selecione...")}
        aria-label={t("Valor")}
      />
    );
  }
  if ((campo.tipo === "opcao" || campo.tipo === "opcoes") && campo.opcoes?.length) {
    return (
      <SeletorDaCasca
        valor={texto}
        opcoes={campo.opcoes.map((o) => ({ valor: o.value, rotulo: o.label }))}
        aoMudar={aoMudar}
        vazio={t("Selecione...")}
        aria-label={t("Valor")}
      />
    );
  }
  const dica =
    campo.tipo === "data"
      ? t("DD/MM/AAAA")
      : campo.tipo === "numero"
        ? t("Digite o valor")
        : t("Digite o texto a buscar");
  return (
    <input
      value={texto}
      onChange={(e) => aoMudar(e.target.value)}
      placeholder={dica}
      aria-label={t("Valor")}
      inputMode={campo.tipo === "numero" ? "decimal" : undefined}
      className={CLASSE_DO_CAMPO}
    />
  );
}

export type GrupoDoSeletor = "contato" | "negocio" | "empresa";
const GRUPOS_PADRAO: readonly GrupoDoSeletor[] = ["contato", "negocio", "empresa"];
const GRUPOS_DO_SELETOR: ReadonlyArray<{ chave: GrupoDoSeletor; rotulo: string }> = [
  { chave: "contato", rotulo: "Contato" },
  { chave: "negocio", rotulo: "Negócio" },
  { chave: "empresa", rotulo: "Empresa" },
];

/**
 * O SELETOR DE CAMPO (Clint `FieldFilterBuilder`; prints 2b-21 a 2b-23): a busca e
 * os grupos "Contato", "Negócio" e "Empresa", que abrem e fecham pelo chevron (a
 * busca abre os que acharam algo). "Empresa" liga com a 2D
 * (N19). Escolhido o campo: "← Voltar", o grupo e o campo, os operadores em rádio
 * com o valor logo abaixo do marcado (o primeiro do tipo já vem marcado: "Contém"
 * no texto) e "Aplicar" embaixo à esquerda.
 */
function SeletorDeCampo({
  campos,
  grupos,
  contemBloqueado,
  aoEscolher,
}: {
  campos: readonly CampoDoFiltro[];
  grupos: readonly GrupoDoSeletor[];
  contemBloqueado: boolean;
  aoEscolher: (c: CondicaoDoFiltro) => void;
}) {
  const t = useT();
  const [campo, setCampo] = useState<CampoDoFiltro | null>(null);
  const [busca, setBusca] = useState("");
  const [abertos, setAbertos] = useState<ReadonlySet<GrupoDoSeletor>>(new Set());
  const [op, setOp] = useState<Operador | null>(null);
  const [texto, setTexto] = useState("");

  const operadores = (c: CampoDoFiltro) =>
    operadoresDoTipo(c.tipo).filter(
      (o) => !(contemBloqueado && (o === "contem" || o === "nao_contem")),
    );

  function escolherCampo(c: CampoDoFiltro) {
    setCampo(c);
    setOp(operadores(c)[0] ?? null);
    setTexto("");
  }

  function alternar(g: GrupoDoSeletor) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(g)) novo.delete(g);
      else novo.add(g);
      return novo;
    });
  }

  if (!campo) {
    const termo = busca.trim().toLowerCase();
    const achados = campos.filter((c) => t(c.rotulo).toLowerCase().includes(termo));
    return (
      <div role="region" aria-label={t("Escolher campo")} className="p-2">
        <label className="relative block">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar por...")}
            aria-label={t("Buscar campo")}
            className={cn(CLASSE_DO_CAMPO, "pr-8")}
          />
          <Search
            size={14}
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave"
          />
        </label>
        {termo && achados.length === 0 ? (
          <p className="px-1 pt-2 text-[12px] text-casca-suave">{t("Nenhum campo encontrado")}</p>
        ) : (
          <div className="mt-1 max-h-64 overflow-y-auto">
            {GRUPOS_DO_SELETOR.filter((g) => grupos.includes(g.chave)).map((g) => {
              const doGrupo = achados.filter((c) => c.alvo === g.chave);
              if (termo && doGrupo.length === 0) return null;
              const aberto = abertos.has(g.chave) || (termo !== "" && doGrupo.length > 0);
              return (
                <div key={g.chave} className="border-b border-casca-borda last:border-b-0">
                  <button
                    type="button"
                    aria-expanded={aberto}
                    onClick={() => alternar(g.chave)}
                    className="flex h-9 w-full items-center gap-2 px-2 text-left text-[13px] font-semibold text-casca-texto hover:bg-casca-raia disabled:cursor-not-allowed disabled:text-casca-meta"
                  >
                    {aberto ? (
                      <ChevronDown size={14} aria-hidden />
                    ) : (
                      <ChevronRight size={14} aria-hidden />
                    )}
                    {t(g.rotulo)}
                  </button>
                  {aberto ? (
                    <div className="pb-1">
                      {doGrupo.map((c) => (
                        <button
                          key={c.chave}
                          type="button"
                          onClick={() => escolherCampo(c)}
                          className={cn(CLASSE_DA_LINHA_DO_MENU, "pl-7")}
                        >
                          {t(c.rotulo)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const valor = valorDigitado(campo, texto);
  const pode = op !== null && (!precisaDeValor(op) || valor !== null);
  return (
    <div role="region" aria-label={t("Escolher campo")} className="space-y-3 p-3">
      <BotaoVoltar onClick={() => setCampo(null)} />
      <div>
        <p className="text-[10px] font-semibold tracking-[0.06em] text-casca-meta uppercase">
          {campo.alvo === "contato" ? t("Contato") : campo.alvo === "empresa" ? t("Empresa") : t("Negócio")}
        </p>
        <p className="text-[13px] font-semibold text-casca-texto">{t(campo.rotulo)}</p>
      </div>
      <div
        role="radiogroup"
        aria-label={t("Operador")}
        className="max-h-56 space-y-0.5 overflow-y-auto"
      >
        {operadores(campo).map((o) => (
          <div key={o}>
            <OpcaoDeRadio marcada={op === o} onClick={() => setOp(o)}>
              {t(ROTULO_DO_OPERADOR[o])}
            </OpcaoDeRadio>
            {op === o && precisaDeValor(o) ? (
              <div className="pb-1 pl-6">
                <ValorDaCondicao campo={campo} texto={texto} aoMudar={setTexto} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <BotaoDaCasca
        type="button"
        variante="marca"
        tamanho="sm"
        disabled={!pode}
        title={pode ? undefined : t("Escolha o operador e o valor.")}
        onClick={() => {
          if (!op) return;
          aoEscolher({
            alvo: campo.alvo,
            chave: campo.chave,
            tipo: campo.tipo,
            op,
            ...(precisaDeValor(op) && valor !== null ? { valor } : {}),
          });
        }}
      >
        {t("Aplicar")}
      </BotaoDaCasca>
    </div>
  );
}

/**
 * Seção Campos (Clint `FieldFilterBuilder`; prints 2b-21 a 2b-23): os mesmos grupos
 * da seção Tags (`GruposDoFiltro`), com o seletor de campo e o limite de 10
 * "contém / não contém" por filtro.
 */
export function SecaoCamposDoFiltro({
  filtros,
  aoMudar,
  camposDoNegocio,
  camposDoContato,
  camposDaEmpresa,
  gruposDoSeletor = GRUPOS_PADRAO,
}: {
  filtros: FiltrosDeContatos;
  aoMudar: (f: FiltrosDeContatos) => void;
  camposDoNegocio: readonly CampoDoFiltro[];
  camposDoContato: readonly CampoDoFiltro[];
  camposDaEmpresa: readonly CampoDoFiltro[];
  /** Fase 2D: a lista de empresas só mostra o grupo "Empresa". */
  gruposDoSeletor?: readonly GrupoDoSeletor[];
}) {
  const t = useT();
  const grupos: GrupoDoFiltro[] = filtros.campos?.grupos ?? [];
  const todos = [...camposDoContato, ...camposDoNegocio, ...camposDaEmpresa];
  const noLimite = contarContem(filtros) >= CONTEM_MAX;

  return (
    <div className="space-y-3">
      <GruposDoFiltro
        grupos={grupos}
        combinar={filtros.campos?.combinar ?? "ou"}
        aoMudar={(novos, combinar) =>
          aoMudar({
            ...filtros,
            campos:
              novos.length > 0
                ? {
                    combinar,
                    grupos: novos.map((g) => ({ modo: g.modo, condicoes: [...g.condicoes] })),
                  }
                : undefined,
          })
        }
        textoDaCondicao={(c: CondicaoDoFiltro) => {
          const campo = todos.find((x) => x.alvo === c.alvo && x.chave === c.chave);
          return (
            <span className="min-w-0 truncate">
              <span className="font-medium">{campo ? t(campo.rotulo) : c.chave}</span>{" "}
              {t(ROTULO_DO_OPERADOR[c.op]).toLowerCase()}
              {precisaDeValor(c.op) ? ` ${valorLegivel(c, campo, t)}` : ""}
            </span>
          );
        }}
        seletor={(aoEscolher) => (
          <SeletorDeCampo campos={todos} grupos={gruposDoSeletor} contemBloqueado={noLimite} aoEscolher={aoEscolher} />
        )}
      />
      {noLimite ? (
        <p className="text-[11px] text-casca-alerta">
          {t(
            "Limite de {max} condições contém / não contém atingido neste filtro. Use Igual, ou remova uma condição para liberar.",
          ).replace("{max}", String(CONTEM_MAX))}
        </p>
      ) : null}
    </div>
  );
}
