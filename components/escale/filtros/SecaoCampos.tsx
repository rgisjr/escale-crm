"use client";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  chaveDoCampo,
  condicaoNova,
  numeroDoValor,
  operadoresDoTipo,
  type CampoFiltravel,
} from "@/lib/escale/filtros/campos";
import {
  CONDICOES_DE_CAMPO_MAX,
  type CondicaoDeCampo,
  type FiltrosDoQuadro,
  type OperadorDeCampo,
} from "@/lib/escale/filtros/tipos";
import { Plus, X } from "@/lib/ui/icons-da-casca";

import { CampoDeData, CampoDeTexto, CampoNumerico } from "./controles";

/** Vírgula decimal: "0.125" seria relido como milhar (125) pela leitura brasileira. */
const textoDoNumero = (n: number): string => String(n).replace(".", ",");

const ROTULO_DO_OPERADOR: Record<OperadorDeCampo, string> = {
  contem: "contém",
  igual: "é igual a",
  entre: "está entre",
  preenchido: "está preenchido",
  vazio: "está vazio",
};

/**
 * Campos (gatilho "Campos" da Clint; o conteúdo aberto não tem print, PRINT 25):
 * condições sobre os campos personalizados do negócio e os campos fixos do
 * contato, somadas (E). A lógica é a da 1D; o visual, o da casca.
 */
export function SecaoCampos({
  filtros,
  onMudar,
  campos,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
  campos: readonly CampoFiltravel[];
}) {
  const t = useT();
  const condicoes = filtros.campos ?? [];
  const porChave = new Map(campos.map((c) => [chaveDoCampo(c), c]));
  const doNegocio = campos.filter((c) => c.alvo === "negocio");
  const doContato = campos.filter((c) => c.alvo === "contato");
  const primeiro = doNegocio[0] ?? doContato[0];
  const atingiuOLimite = condicoes.length >= CONDICOES_DE_CAMPO_MAX;
  // Um campo personalizado do negócio pode ter o mesmo nome de um do contato: nesse
  // caso (e só nele) o rótulo do contato carrega o grupo, para as opções não parecerem iguais.
  const rotulosDoNegocio = new Set(doNegocio.map((c) => c.rotulo));
  const opcoesDeCampo = [
    ...doNegocio.map((c) => ({ valor: chaveDoCampo(c), rotulo: c.rotulo, grupo: t("Negócio") })),
    ...doContato.map((c) => {
      const rotulo = t(c.rotulo);
      return {
        valor: chaveDoCampo(c),
        rotulo: rotulosDoNegocio.has(rotulo) ? `${t("Contato")} · ${rotulo}` : rotulo,
        grupo: t("Contato"),
      };
    }),
  ];

  function trocar(indice: number, nova: CondicaoDeCampo | null) {
    const proximas =
      nova === null
        ? condicoes.filter((_, j) => j !== indice)
        : condicoes.map((c, j) => (j === indice ? nova : c));
    onMudar({ ...filtros, campos: proximas.length > 0 ? proximas : undefined });
  }

  return (
    <div className="space-y-3">
      {condicoes.map((condicao, indice) => {
        const campo = porChave.get(chaveDoCampo(condicao));
        const tipo = campo?.tipo ?? "texto";
        return (
          <fieldset
            key={indice}
            className="space-y-2 rounded-casca-gatilho border border-casca-borda p-2"
          >
            <legend className="sr-only">{`${t("Condição")} ${indice + 1}`}</legend>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <SeletorDaCasca
                  aria-label={t("Campo")}
                  valor={chaveDoCampo(condicao)}
                  opcoes={
                    campo
                      ? opcoesDeCampo
                      : [
                          { valor: chaveDoCampo(condicao), rotulo: condicao.chave },
                          ...opcoesDeCampo,
                        ]
                  }
                  aoMudar={(chave) => {
                    // Escolher de novo o campo atual não é troca: manteria o operador e o valor.
                    if (!chave || chave === chaveDoCampo(condicao)) return;
                    const novo = porChave.get(chave);
                    if (novo) trocar(indice, condicaoNova(novo));
                  }}
                />
              </div>
              <button
                type="button"
                aria-label={t("Remover condição")}
                onClick={() => trocar(indice, null)}
                className="grid size-7 shrink-0 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
            <SeletorDaCasca<OperadorDeCampo>
              aria-label={t("Operador")}
              valor={condicao.op}
              opcoes={operadoresDoTipo(tipo).map((op) => ({
                valor: op,
                rotulo: t(ROTULO_DO_OPERADOR[op]),
              }))}
              aoMudar={(op) => {
                // Escolher de novo o operador atual não é troca: apagaria o valor digitado.
                if (!op || op === condicao.op) return;
                trocar(indice, {
                  alvo: condicao.alvo,
                  chave: condicao.chave,
                  op,
                  ...(tipo === "booleano" ? { valor: "true" } : {}),
                });
              }}
            />
            <ValorDaCondicao
              condicao={condicao}
              campo={campo}
              onMudar={(nova) => trocar(indice, nova)}
            />
          </fieldset>
        );
      })}
      <BotaoDaCasca
        type="button"
        variante="texto"
        tamanho="sm"
        disabled={!primeiro || atingiuOLimite}
        onClick={() =>
          primeiro && onMudar({ ...filtros, campos: [...condicoes, condicaoNova(primeiro)] })
        }
      >
        <Plus size={14} aria-hidden />
        {t("Adicionar condição")}
      </BotaoDaCasca>
    </div>
  );
}

function ValorDaCondicao({
  condicao: c,
  campo,
  onMudar,
}: {
  condicao: CondicaoDeCampo;
  campo: CampoFiltravel | undefined;
  onMudar: (nova: CondicaoDeCampo) => void;
}) {
  const t = useT();
  if (c.op === "preenchido" || c.op === "vazio") return null;
  const tipo = campo?.tipo ?? "texto";

  if (tipo === "booleano") {
    return (
      <SeletorDaCasca<"true" | "false">
        aria-label={t("Valor")}
        valor={c.valor === "false" ? "false" : "true"}
        opcoes={[
          { valor: "true", rotulo: t("Sim") },
          { valor: "false", rotulo: t("Não") },
        ]}
        aoMudar={(v) => onMudar({ ...c, valor: v || "true" })}
      />
    );
  }
  if ((tipo === "opcao" || tipo === "opcoes") && campo?.opcoes?.length) {
    return (
      <SeletorDaCasca
        aria-label={t("Valor")}
        valor={c.valor ?? ""}
        opcoes={[
          { valor: "", rotulo: t("Escolha") },
          ...campo.opcoes.map((o) => ({ valor: o.value, rotulo: o.label })),
        ]}
        aoMudar={(v) => onMudar({ ...c, valor: v || undefined })}
      />
    );
  }
  if (c.op === "entre" && tipo === "data") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <CampoDeData
          key={`de:${c.valor ?? ""}`}
          rotulo={t("De")}
          valor={c.valor}
          onMudar={(v) => onMudar({ ...c, valor: v })}
        />
        <CampoDeData
          key={`ate:${c.ate ?? ""}`}
          rotulo={t("Até")}
          valor={c.ate}
          onMudar={(v) => onMudar({ ...c, ate: v })}
        />
      </div>
    );
  }
  if (c.op === "entre") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <CampoNumerico
          key={`min:${c.valor ?? ""}`}
          rotulo={t("Mínimo")}
          valor={numeroDoValor(c.valor) ?? undefined}
          onMudar={(v) => onMudar({ ...c, valor: v === undefined ? undefined : textoDoNumero(v) })}
        />
        <CampoNumerico
          key={`max:${c.ate ?? ""}`}
          rotulo={t("Máximo")}
          valor={numeroDoValor(c.ate) ?? undefined}
          onMudar={(v) => onMudar({ ...c, ate: v === undefined ? undefined : textoDoNumero(v) })}
        />
      </div>
    );
  }
  return (
    <CampoDeTexto
      key={`txt:${c.valor ?? ""}`}
      rotulo={t("Valor")}
      valor={c.valor}
      onMudar={(v) => onMudar({ ...c, valor: v })}
    />
  );
}
