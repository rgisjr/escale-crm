"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useT } from "@/hooks/i18n/useT";
import {
  chaveDoCampo,
  condicaoNova,
  operadoresDoTipo,
  type CampoFiltravel,
} from "@/lib/escale/filtros/campos";
import {
  CONDICOES_DE_CAMPO_MAX,
  type CondicaoDeCampo,
  type FiltrosDoQuadro,
  type OperadorDeCampo,
} from "@/lib/escale/filtros/tipos";
import { Plus, X } from "@/lib/ui/icons";

import { CampoDeTexto, CampoNumerico, classeDoSeletor } from "./controles";

const ROTULO_DO_OPERADOR: Record<OperadorDeCampo, string> = {
  contem: "contém",
  igual: "é igual a",
  entre: "está entre",
  preenchido: "está preenchido",
  vazio: "está vazio",
};

/**
 * Campos (Clint: "Campos"): condições sobre os campos personalizados do negócio
 * e os campos fixos do contato. As condições se somam (E).
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
  // Com campos personalizados a lista de campos cresce: `SearchableSelect` mostra a busca a
  // partir de 8 opções, e o nome do grupo entra como palavra-chave ("Contato" acha os do contato).
  // Um campo personalizado do negócio pode ter o mesmo nome de um do contato: nesse caso (e só
  // nele) o rótulo do contato carrega o grupo, para as duas opções não parecerem iguais.
  const rotulosDoNegocio = new Set(doNegocio.map((c) => c.rotulo));
  const opcoesDeCampo = [
    ...doNegocio.map((c) => ({
      value: chaveDoCampo(c),
      label: c.rotulo,
      keywords: [t("Negócio")],
    })),
    ...doContato.map((c) => {
      const rotulo = t(c.rotulo);
      return {
        value: chaveDoCampo(c),
        label: rotulosDoNegocio.has(rotulo) ? `${t("Contato")} · ${rotulo}` : rotulo,
        keywords: [t("Contato")],
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
          <fieldset key={indice} className="space-y-2 rounded-md border border-border p-2">
            <legend className="sr-only">{`${t("Condição")} ${indice + 1}`}</legend>
            <div className="flex gap-2">
              <SearchableSelect
                aria-label={t("Campo")}
                className="min-w-0 flex-1"
                value={chaveDoCampo(condicao)}
                options={
                  campo
                    ? opcoesDeCampo
                    : [{ value: chaveDoCampo(condicao), label: condicao.chave }, ...opcoesDeCampo]
                }
                onValueChange={(chave) => {
                  // Escolher de novo o campo atual não é troca: manteria o operador e o valor.
                  if (chave === chaveDoCampo(condicao)) return;
                  const novo = porChave.get(chave);
                  if (novo) trocar(indice, condicaoNova(novo));
                }}
              />
              <button
                type="button"
                aria-label={t("Remover condição")}
                onClick={() => trocar(indice, null)}
                className="shrink-0 rounded-md px-2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
            <SearchableSelect
              aria-label={t("Operador")}
              value={condicao.op}
              options={operadoresDoTipo(tipo).map((op) => ({
                value: op,
                label: t(ROTULO_DO_OPERADOR[op]),
              }))}
              onValueChange={(valor) => {
                const op = valor as OperadorDeCampo;
                // Escolher de novo o operador atual não é troca: apagaria o valor digitado.
                if (op === condicao.op) return;
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!primeiro || atingiuOLimite}
        onClick={() =>
          primeiro && onMudar({ ...filtros, campos: [...condicoes, condicaoNova(primeiro)] })
        }
      >
        <Plus size={14} className="mr-1" aria-hidden />
        {t("Adicionar condição")}
      </Button>
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
      <select
        aria-label={t("Valor")}
        className={classeDoSeletor}
        value={c.valor ?? "true"}
        onChange={(e) => onMudar({ ...c, valor: e.target.value })}
      >
        <option value="true">{t("Sim")}</option>
        <option value="false">{t("Não")}</option>
      </select>
    );
  }
  if ((tipo === "opcao" || tipo === "opcoes") && campo?.opcoes?.length) {
    return (
      <SearchableSelect
        aria-label={t("Valor")}
        value={c.valor ?? ""}
        options={[{ value: "", label: t("Escolha") }, ...campo.opcoes]}
        onValueChange={(v) => onMudar({ ...c, valor: v || undefined })}
      />
    );
  }
  if (c.op === "entre" && tipo === "data") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="date"
          aria-label={t("De")}
          value={c.valor ?? ""}
          onChange={(e) => onMudar({ ...c, valor: e.target.value || undefined })}
          className="h-9"
        />
        <Input
          type="date"
          aria-label={t("Até")}
          value={c.ate ?? ""}
          onChange={(e) => onMudar({ ...c, ate: e.target.value || undefined })}
          className="h-9"
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
          valor={c.valor ? Number(c.valor) : undefined}
          onMudar={(v) => onMudar({ ...c, valor: v === undefined ? undefined : String(v) })}
        />
        <CampoNumerico
          key={`max:${c.ate ?? ""}`}
          rotulo={t("Máximo")}
          valor={c.ate ? Number(c.ate) : undefined}
          onMudar={(v) => onMudar({ ...c, ate: v === undefined ? undefined : String(v) })}
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
