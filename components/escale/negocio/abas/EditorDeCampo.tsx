"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  dataBrDeIso,
  simboloDaMoeda,
  textoDeNumero,
  textoDeReais,
  textoDeTelefone,
  valorParaGravar,
  type CampoEditavel,
} from "@/lib/escale/negocio/campos";
import { CircleCheck, Loader2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O INPUT EM LINHA DA CLINT (fork Escale, Fase 1H; N1, N2; prints 02 e 04).
 *
 * O valor é sempre um input. Digitar mostra "Cancelar" e "Salvar" embaixo;
 * Enter salva; Esc e Cancelar voltam ao valor gravado; sair do campo não
 * salva. Depois de salvar, o ✓ verde por 1s. Lista, múltipla e Sim/Não gravam
 * ao escolher. `aoSalvar` rejeita com a mensagem que vai para a tela.
 *
 * Revisão final do PR A: as gravações do campo vão em FILA (uma de cada vez,
 * na ordem); a múltipla guarda a seleção aqui dentro, para a segunda marcação
 * não partir da lista antiga enquanto a primeira ainda está no servidor; Enter
 * sem mudança não grava; e, depois de salvar, a caixa mostra o valor gravado
 * (sem Cancelar/Salvar) mesmo quando o normalizado é igual ao que já havia.
 */
const CAIXA =
  "h-8 w-full rounded-md bg-casca-busca px-3 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca disabled:cursor-not-allowed disabled:text-casca-meta";
const CHECK_POR_MS = 1000;

type Estado =
  { fase: "parado" } | { fase: "salvando" } | { fase: "salvo" } | { fase: "erro"; erro: string };

export function EditorDeCampo({
  campo,
  aoSalvar,
  moeda = "BRL",
}: {
  campo: CampoEditavel;
  aoSalvar: (valor: unknown) => Promise<void>;
  moeda?: string;
}) {
  const t = useT();
  const id = useId();
  const gravado = textoDoValor(campo);
  const [texto, setTexto] = useState(gravado);
  const [estado, setEstado] = useState<Estado>({ fase: "parado" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fila = useRef<Promise<unknown>>(Promise.resolve());
  const pendentes = useRef(0);
  const gravadosDaMultipla = Array.isArray(campo.valor) ? campo.valor.map(String) : [];
  const chaveDaMultipla = JSON.stringify(gravadosDaMultipla);
  const [selecao, setSelecao] = useState<string[]>(gravadosDaMultipla);

  // O valor que chega do servidor (tempo real, outra aba) vence o rascunho parado.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o valor gravado muda por fora (tempo real) e o rascunho parado o acompanha
    setTexto(gravado);
  }, [gravado]);
  // A múltipla acompanha o servidor só quando não há gravação dela no caminho.
  useEffect(() => {
    if (pendentes.current === 0) setSelecao(JSON.parse(chaveDaMultipla) as string[]);
  }, [chaveDaMultipla]);
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  /** Põe a gravação na fila do campo. Devolve se deu certo. */
  function gravar(valor: unknown): Promise<boolean> {
    clearTimeout(timer.current ?? undefined);
    pendentes.current += 1;
    setEstado({ fase: "salvando" });
    const vez = fila.current.then(async () => {
      try {
        await aoSalvar(valor);
        return true;
      } catch (err) {
        setEstado({
          fase: "erro",
          erro:
            err instanceof Error && err.message
              ? err.message
              : t("Ocorreu um erro ao salvar o campo"),
        });
        return false;
      } finally {
        pendentes.current -= 1;
      }
    });
    fila.current = vez;
    return vez.then((ok) => {
      if (ok && pendentes.current === 0) {
        setEstado({ fase: "salvo" });
        timer.current = setTimeout(() => setEstado({ fase: "parado" }), CHECK_POR_MS);
      }
      return ok;
    });
  }

  function salvarTexto() {
    if (texto === gravado) return;
    const resultado = valorParaGravar(campo.tipo, texto);
    if (!resultado.ok) return setEstado({ fase: "erro", erro: t(resultado.erro) });
    void gravar(resultado.valor).then((ok) => {
      // O normalizado pode ser igual ao gravado ("CEO " → "CEO"): aí o valor de
      // fora não muda e o rascunho ficaria com Cancelar/Salvar na tela.
      if (ok) setTexto(textoDoValor({ ...campo, valor: resultado.valor }));
    });
  }

  function cancelar() {
    setTexto(gravado);
    setEstado({ fase: "parado" });
  }

  function tecla(e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === "Enter" && !(campo.tipo === "textarea" && e.shiftKey)) {
      e.preventDefault();
      salvarTexto();
    }
    if (e.key === "Escape") cancelar();
  }

  const editando = texto !== gravado && estado.fase !== "salvando";
  const dica = campo.travado ? t("Este campo não pode ser editado aqui.") : undefined;

  if (campo.tipo === "select" || campo.tipo === "boolean") {
    const opcoes =
      campo.tipo === "boolean"
        ? [
            { valor: "true", rotulo: t("Sim") },
            { valor: "false", rotulo: t("Não") },
          ]
        : (campo.opcoes ?? []).map((o) => ({ valor: o.value, rotulo: o.label }));
    const valor =
      campo.valor === null || campo.valor === undefined || campo.valor === ""
        ? ""
        : String(campo.valor);
    return (
      <Moldura estado={estado}>
        <SeletorDaCasca
          valor={valor}
          opcoes={opcoes}
          vazio={t("Clique aqui para adicionar")}
          aria-label={campo.rotulo}
          desabilitado={campo.travado}
          dica={dica}
          className="h-8"
          aoMudar={(v) =>
            void gravar(v === "" ? null : campo.tipo === "boolean" ? v === "true" : v)
          }
        />
      </Moldura>
    );
  }

  if (campo.tipo === "multiselect") {
    return (
      <Moldura estado={estado}>
        <SeletorMultiploDaCasca
          valores={selecao}
          opcoes={(campo.opcoes ?? []).map((o) => ({ valor: o.value, rotulo: o.label }))}
          vazio={t("Clique aqui para adicionar")}
          aria-label={campo.rotulo}
          desabilitado={campo.travado}
          dica={dica}
          aoMudar={(v) => {
            setSelecao(v);
            void gravar(v.length ? v : null);
          }}
        />
      </Moldura>
    );
  }

  const comuns = {
    id,
    "aria-label": campo.rotulo,
    value: texto,
    disabled: campo.travado,
    title: dica,
    placeholder: t("Clique aqui para adicionar"),
    onChange: (e: { target: { value: string } }) => {
      setTexto(e.target.value);
      if (estado.fase === "erro") setEstado({ fase: "parado" });
    },
    onKeyDown: tecla,
  };
  return (
    <Moldura estado={estado}>
      <div className="flex items-center gap-2">
        {campo.tipo === "currency" ? (
          <span className="text-[13px] text-casca-texto-2">{simboloDaMoeda(moeda)}</span>
        ) : null}
        {campo.tipo === "textarea" ? (
          <textarea {...comuns} rows={3} className={cn(CAIXA, "h-auto min-h-16 py-2")} />
        ) : (
          <input
            {...comuns}
            type="text"
            inputMode={campo.tipo === "number" || campo.tipo === "currency" ? "decimal" : undefined}
            className={CAIXA}
          />
        )}
      </div>
      {editando ? (
        <div className="mt-1.5 flex justify-end gap-2">
          <BotaoDaCasca variante="texto" tamanho="sm" onClick={cancelar}>
            {t("Cancelar")}
          </BotaoDaCasca>
          <BotaoDaCasca variante="marca" tamanho="sm" onClick={salvarTexto}>
            {t("Salvar")}
          </BotaoDaCasca>
        </div>
      ) : null}
    </Moldura>
  );
}

/** O que a Clint mostra ao lado e embaixo da caixa: spinner, ✓ por 1s ou o erro. */
function Moldura({ estado, children }: { estado: Estado; children: ReactNode }) {
  const t = useT();
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">{children}</div>
        {estado.fase === "salvando" ? (
          <Loader2
            size={16}
            aria-label={t("Salvando…")}
            className="shrink-0 animate-spin text-casca-suave"
          />
        ) : estado.fase === "salvo" ? (
          <CircleCheck
            size={16}
            aria-label={t("Salvo")}
            className="shrink-0 text-[var(--escale-status-ganho)]"
          />
        ) : null}
      </div>
      {estado.fase === "erro" ? (
        <p className="mt-1 text-[11px] text-destructive">{estado.erro}</p>
      ) : null}
    </div>
  );
}

/** O texto que o input mostra para o valor gravado. */
function textoDoValor(campo: CampoEditavel): string {
  const v = campo.valor;
  if (v === null || v === undefined || v === "") return "";
  if (campo.tipo === "currency" && typeof v === "number") return textoDeReais(v);
  if (campo.tipo === "number" && typeof v === "number") return textoDeNumero(v);
  if (campo.tipo === "date" && typeof v === "string") return dataBrDeIso(v);
  if (campo.tipo === "phone") return textoDeTelefone(v);
  return String(v);
}
