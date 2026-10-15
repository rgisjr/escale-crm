"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  // As opções ficam fora da caixa de seleção porque os testes do painel exigem a caixa
  // nativa (combobox com `selectOptions`), e não o `SearchableSelect`.
  const opcoesDoNegocio = doNegocio.map((c) => (
    <option key={chaveDoCampo(c)} value={chaveDoCampo(c)}>
      {c.rotulo}
    </option>
  ));
  const opcoesDoContato = doContato.map((c) => (
    <option key={chaveDoCampo(c)} value={chaveDoCampo(c)}>
      {t(c.rotulo)}
    </option>
  ));

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
        const opcoesDeOperador = operadoresDoTipo(tipo).map((op) => (
          <option key={op} value={op}>
            {t(ROTULO_DO_OPERADOR[op])}
          </option>
        ));
        return (
          <fieldset key={indice} className="space-y-2 rounded-md border border-border p-2">
            <legend className="sr-only">{`${t("Condição")} ${indice + 1}`}</legend>
            <div className="flex gap-2">
              <select
                aria-label={t("Campo")}
                className={classeDoSeletor}
                value={chaveDoCampo(condicao)}
                onChange={(e) => {
                  const novo = porChave.get(e.target.value);
                  if (novo) trocar(indice, condicaoNova(novo));
                }}
              >
                {campo ? null : <option value={chaveDoCampo(condicao)}>{condicao.chave}</option>}
                {doNegocio.length > 0 ? (
                  <optgroup label={t("Negócio")}>{opcoesDoNegocio}</optgroup>
                ) : null}
                <optgroup label={t("Contato")}>{opcoesDoContato}</optgroup>
              </select>
              <button
                type="button"
                aria-label={t("Remover condição")}
                onClick={() => trocar(indice, null)}
                className="shrink-0 rounded-md px-2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
            <select
              aria-label={t("Operador")}
              className={classeDoSeletor}
              value={condicao.op}
              onChange={(e) => {
                const op = e.target.value as OperadorDeCampo;
                trocar(indice, {
                  alvo: condicao.alvo,
                  chave: condicao.chave,
                  op,
                  ...(tipo === "booleano" ? { valor: "true" } : {}),
                });
              }}
            >
              {opcoesDeOperador}
            </select>
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
    const opcoesDoValor = campo.opcoes.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ));
    return (
      <select
        aria-label={t("Valor")}
        className={classeDoSeletor}
        value={c.valor ?? ""}
        onChange={(e) => onMudar({ ...c, valor: e.target.value || undefined })}
      >
        <option value="">{t("Escolha")}</option>
        {opcoesDoValor}
      </select>
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
