"use client";
import { useMemo, useState } from "react";

import { CLASSE_DO_CAMPO } from "@/components/escale/filtros/controles";
import { AlternanciaDaCasca } from "@/components/escale/ui/AlternanciaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import type { CampoDeColuna } from "@/lib/escale/contatos/regras";
import { valorParaGravar } from "@/lib/escale/negocio/campos";
import { X } from "@/lib/ui/icons-da-casca";

type Modo = "alterar" | "limpar";
type Acao = "alterar_campo" | "limpar_campo";

/** O valor que o painel vai mandar, ou `null` enquanto não vale (e o motivo, se há). */
function valorDoPainel(
  campo: CampoDeColuna,
  texto: string,
  lista: string[],
): { ok: true; valor: unknown } | { ok: false } {
  if (campo.tipo === "multiselect") return lista.length ? { ok: true, valor: lista } : { ok: false };
  if (campo.tipo === "boolean") return texto ? { ok: true, valor: texto === "true" } : { ok: false };
  if (campo.tipo === "select") return texto ? { ok: true, valor: texto } : { ok: false };
  const r = valorParaGravar(campo.tipo, texto);
  return r.ok && r.valor !== null ? { ok: true, valor: r.valor } : { ok: false };
}

/**
 * O "CAMPOS" DA BARRA (Clint `FieldsBulkPopover`; prints 2b-32 e 2b-33): o campo
 * ("Selecione uma opção"), "Alterar campo" ou "Limpar campo", o valor pelo tipo
 * ("Digite o valor") e "Aplicar". Só os campos do catálogo do contato: o
 * nascimento e os links têm tela própria.
 */
export function PainelDeCampos({
  classeDoGatilho,
  camposDoContato,
  aoAplicar,
}: {
  classeDoGatilho: string;
  camposDoContato: CampoDeColuna[];
  aoAplicar: (acao: Acao, parametros: Record<string, unknown>) => Promise<boolean>;
}) {
  const t = useT();
  const campos = useMemo(
    () => camposDoContato.filter((c) => c.chave !== "nascimento" && !c.chave.startsWith("link_")),
    [camposDoContato],
  );
  const [aberto, setAberto] = useState(false);
  const [chave, setChave] = useState("");
  const [modo, setModo] = useState<Modo>("alterar");
  const [texto, setTexto] = useState("");
  const [lista, setLista] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const campo = campos.find((c) => c.chave === chave);
  const valor = campo ? valorDoPainel(campo, texto, lista) : ({ ok: false } as const);
  const pode = Boolean(campo) && (modo === "limpar" || valor.ok) && !enviando;

  const fechar = () => {
    setAberto(false);
    setChave("");
    setModo("alterar");
    setTexto("");
    setLista([]);
  };

  async function aplicar() {
    if (!campo) return;
    setEnviando(true);
    const deuCerto =
      modo === "limpar"
        ? await aoAplicar("limpar_campo", { chave: campo.chave })
        : valor.ok
          ? await aoAplicar("alterar_campo", { chave: campo.chave, valor: valor.valor })
          : false;
    setEnviando(false);
    if (deuCerto) fechar();
  }

  const opcoes = (campo?.opcoes ?? []).map((o) => ({ valor: o.value, rotulo: o.label }));
  const entrada = () => {
    if (!campo) return null;
    if (campo.tipo === "select") {
      return (
        <SeletorDaCasca
          valor={texto}
          opcoes={opcoes}
          aoMudar={setTexto}
          vazio={t("Selecione uma opção")}
          aria-label={t("Valor")}
        />
      );
    }
    if (campo.tipo === "multiselect") {
      return (
        <SeletorMultiploDaCasca
          valores={lista}
          opcoes={opcoes}
          aoMudar={setLista}
          vazio={t("Selecione uma opção")}
          aria-label={t("Valor")}
        />
      );
    }
    if (campo.tipo === "boolean") {
      return (
        <SeletorDaCasca
          valor={texto}
          opcoes={[
            { valor: "true", rotulo: t("Sim") },
            { valor: "false", rotulo: t("Não") },
          ]}
          aoMudar={setTexto}
          vazio={t("Selecione uma opção")}
          aria-label={t("Valor")}
        />
      );
    }
    return (
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={t("Digite o valor")}
        aria-label={t("Valor")}
        inputMode={campo.tipo === "number" || campo.tipo === "currency" ? "decimal" : undefined}
        className={CLASSE_DO_CAMPO}
      />
    );
  };

  return (
    <Popover open={aberto} onOpenChange={(a) => (a ? setAberto(true) : fechar())}>
      <PopoverTrigger asChild>
        <button type="button" className={classeDoGatilho}>
          {t("Campos")}
        </button>
      </PopoverTrigger>
      <PainelSuspenso side="top" align="center" sideOffset={12} className="w-[320px] p-0">
        <div className="flex h-11 items-center justify-between border-b border-casca-borda px-4">
          <p className="text-[13px] text-casca-texto">{t("Campos")}</p>
          <button
            type="button"
            aria-label={t("Fechar")}
            onClick={fechar}
            className="grid size-6 place-items-center text-casca-suave hover:text-casca-texto"
          >
            <X size={14} aria-hidden />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <SeletorDaCasca
            valor={chave}
            opcoes={campos.map((c) => ({ valor: c.chave, rotulo: c.rotulo }))}
            aoMudar={(v) => {
              setChave(v);
              setTexto("");
              setLista([]);
            }}
            vazio={t("Selecione uma opção")}
            aria-label={t("Campo")}
          />
          {campo ? (
            <>
              <AlternanciaDaCasca
                valor={modo}
                opcoes={[
                  { valor: "alterar", rotulo: t("Alterar campo") },
                  { valor: "limpar", rotulo: t("Limpar campo") },
                ]}
                aoMudar={setModo}
                aria-label={t("O que fazer com o campo")}
              />
              {modo === "alterar" ? entrada() : null}
            </>
          ) : null}
          <div className="flex justify-end">
            <BotaoDaCasca
              type="button"
              variante="marca"
              tamanho="sm"
              disabled={!pode}
              title={pode ? undefined : t("Selecione uma opção")}
              onClick={() => void aplicar()}
            >
              {t("Aplicar")}
            </BotaoDaCasca>
          </div>
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
