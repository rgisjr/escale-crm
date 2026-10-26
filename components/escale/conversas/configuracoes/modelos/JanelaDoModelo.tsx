"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BotaoDaJanela, JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { SeletorDeVariaveis } from "@/components/escale/variaveis/SeletorDeVariaveis";
import { useSalvarVariaveisDoModelo } from "@/hooks/escale/useModelosDaConta";
import { useVariaveisDisponiveis } from "@/hooks/escale/useVariaveisDisponiveis";
import { useT } from "@/hooks/i18n/useT";
import { pedacosDaPrevia, type ModeloDaConta } from "@/lib/escale/conversas/modelos";
import { Briefcase, Building2, User } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";
import type { ChaveDoGrupo, GrupoDeVariaveis } from "@/lib/variaveis/catalogo";
import {
  erroDoSlot,
  tokenDoCampoAntigo,
  type MapeamentoDoModelo,
  type SlotDoMapeamento,
  type VariavelDoModelo,
} from "@/lib/variaveis/mapeamento";

/**
 * A JANELA "MODELO DE MENSAGEM" (fork Escale, Frente V; prints v02, v08 e v09
 * da Clint): de onde vem cada valor destacado na mensagem. "Buscar na Escale"
 * (um campo da lista única, com o valor alternativo) ou "Escrever um valor"
 * (o mesmo texto para todos). Salva no modelo; a conversa, a campanha e o
 * follow-up usam o que ficou salvo.
 */
export function JanelaDoModelo({
  modelo,
  aoFechar,
  somenteLeitura = false,
}: {
  modelo: ModeloDaConta;
  aoFechar: () => void;
  somenteLeitura?: boolean;
}) {
  const t = useT();
  const salvar = useSalvarVariaveisDoModelo();
  const { grupos } = useVariaveisDisponiveis(true);
  const [mapa, setMapa] = useState<MapeamentoDoModelo>(() => ({ ...modelo.mapeamento.variaveis }));
  const [alternativosAbertos, setAlternativosAbertos] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        Object.entries(modelo.mapeamento.variaveis)
          .filter(([, v]) => v.fonte === "campo" && v.alternativo)
          .map(([k]) => k),
      ),
  );
  const slots = modelo.mapeamento.slots;
  // "Escrever um valor" ainda sem texto é pendência, não erro: pode salvar
  // (o slot fica sem definição) e o envio espera, como na Clint.
  const definido = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(mapa).filter(([, v]) => !(v.fonte === "fixo" && v.valor.trim() === "")),
      ) as MapeamentoDoModelo,
    [mapa],
  );
  const erros = useMemo(
    () => Object.fromEntries(slots.map((s) => [s.chave, erroDoSlot(s, definido[s.chave])] as const)),
    [slots, definido],
  );
  const temErro = Object.values(erros).some(Boolean);
  const faltaAlgo = slots.some((s) => !definido[s.chave]);

  const mudar = (chave: string, v: VariavelDoModelo | null) =>
    setMapa((atual) => {
      const novo = { ...atual };
      if (v) novo[chave] = v;
      else delete novo[chave];
      return novo;
    });

  const confirmar = () => {
    if (temErro || somenteLeitura) return;
    salvar.mutate(
      { name: modelo.name, language: modelo.language, variaveis: definido },
      {
        onSuccess: () => {
          toast.success(t("As variáveis foram salvas com sucesso!"));
          aoFechar();
        },
        onError: () => toast.error(t("Erro ao salvar as variáveis.")),
      },
    );
  };

  return (
    <JanelaDaCasca aberta onFechar={aoFechar} className="w-[min(760px,calc(100vw-2rem))] gap-0 p-0">
      <div className="px-5 pt-5 pb-3 pr-12">
        <p className="flex items-center gap-2 text-[16px] font-semibold text-casca-texto">
          {t("Modelo de mensagem")}
          <span className="rounded-[4px] bg-casca-raia px-1.5 py-0.5 font-mono text-[11px] font-normal text-casca-suave">
            {modelo.name}
          </span>
        </p>
        <p className="text-[13px] text-casca-suave">
          {somenteLeitura
            ? t("Origem de cada valor, somente leitura.")
            : t("Diga de onde vem cada valor destacado na mensagem.")}
        </p>
      </div>
      <div className="max-h-[60dvh] overflow-y-auto px-5 pb-5">
        {modelo.mapeamento.desatualizado ? (
          <p role="status" className="mb-3 rounded-[4px] bg-casca-alerta/10 px-3 py-2 text-[13px] text-casca-alerta">
            {t("O modelo mudou na Meta. Confira as variáveis.")}
          </p>
        ) : null}
        <p className="mb-2 text-[11px] font-medium tracking-[.06em] text-casca-meta uppercase">
          {t("Prévia do envio")}
        </p>
        <Previa modelo={modelo} mapa={mapa} grupos={grupos} />
        <p className="mt-5 mb-3 text-[16px] font-semibold text-casca-texto">{t("Variáveis")}</p>
        <div className="grid gap-3">
          {slots.map((s) => (
            <BlocoDaVariavel
              key={s.chave}
              slot={s}
              valor={mapa[s.chave]}
              erro={erros[s.chave] ?? null}
              grupos={grupos}
              alternativoAberto={alternativosAbertos.has(s.chave)}
              somenteLeitura={somenteLeitura}
              aoMudar={(v) => mudar(s.chave, v)}
              aoAlternar={(aberto) =>
                setAlternativosAbertos((atual) => {
                  const novo = new Set(atual);
                  if (aberto) novo.add(s.chave);
                  else novo.delete(s.chave);
                  return novo;
                })
              }
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 border-t border-casca-borda px-5 py-4">
        <p className={cn("flex-1 text-[13px]", temErro ? "text-casca-alerta" : "text-casca-suave")}>
          {somenteLeitura
            ? t("Somente leitura. As variáveis deste modelo não podem ser alteradas nesta visualização.")
            : temErro
              ? t("Corrija o valor destacado para salvar.")
              : faltaAlgo
                ? t("Pode salvar agora. O envio libera quando tudo estiver definido.")
                : ""}
        </p>
        <BotaoDaJanela variante="cancelar" onClick={aoFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        {somenteLeitura ? null : (
          <BotaoDaCasca variante="marca" disabled={temErro || salvar.isPending} onClick={confirmar}>
            {t("Salvar")}
          </BotaoDaCasca>
        )}
      </div>
    </JanelaDaCasca>
  );
}

function rotuloDoCampo(grupos: readonly GrupoDeVariaveis[], campo: string) {
  const token = tokenDoCampoAntigo(campo);
  for (const g of grupos) {
    const achado = g.itens.find((i) => i.token === token);
    if (achado) return { rotulo: achado.rotulo, grupo: g.chave };
  }
  return { rotulo: token, grupo: null as ChaveDoGrupo | null };
}

const ICONE: Partial<Record<ChaveDoGrupo, typeof User>> = {
  DEAL: Briefcase,
  CONTACT: User,
  ORGANIZATION: Building2,
  USER: User,
};

function ChipDaPrevia({ texto, vazio = false }: { texto: string; vazio?: boolean }) {
  return (
    <span
      className={cn(
        "mx-0.5 inline-block rounded-[4px] px-1 font-mono text-[11px] leading-5",
        vazio ? "bg-white text-casca-suave" : "bg-white text-casca-marca",
      )}
    >
      {texto}
    </span>
  );
}

function Previa({
  modelo,
  mapa,
  grupos,
}: {
  modelo: ModeloDaConta;
  mapa: MapeamentoDoModelo;
  grupos: readonly GrupoDeVariaveis[];
}) {
  const t = useT();
  const pedacos = pedacosDaPrevia(modelo.components);
  return (
    <p className="rounded-[6px] bg-casca-raia px-3 py-2.5 text-[13px] leading-6 whitespace-pre-wrap text-casca-texto">
      {pedacos.map((p, i) => {
        if (p.tipo === "texto") return <span key={i}>{p.texto}</span>;
        const v = mapa[p.chave];
        if (!v) return <ChipDaPrevia key={i} vazio texto={`${t("variável")} ${p.chave.replace(/^\D+:/, "")} ${t("sem valor")}`} />;
        if (v.fonte === "fixo") return <ChipDaPrevia key={i} texto={v.valor} />;
        return <ChipDaPrevia key={i} texto={t(rotuloDoCampo(grupos, v.campo).rotulo)} />;
      })}
    </p>
  );
}

function CartaoDaOrigem({
  ativo,
  titulo,
  dica,
  desligado = false,
  aoEscolher,
}: {
  ativo: boolean;
  titulo: string;
  dica: string;
  desligado?: boolean;
  aoEscolher: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      disabled={desligado}
      onClick={aoEscolher}
      className={cn(
        "flex-1 rounded-[6px] border px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50",
        ativo ? "border-casca-marca bg-casca-marca-suave" : "border-casca-borda bg-white hover:bg-casca-raia/50",
      )}
    >
      <span className="block text-[13px] text-casca-texto">{titulo}</span>
      <span className="block text-[13px] text-casca-suave">{dica}</span>
    </button>
  );
}

function BlocoDaVariavel({
  slot,
  valor,
  erro,
  grupos,
  alternativoAberto,
  somenteLeitura,
  aoMudar,
  aoAlternar,
}: {
  slot: SlotDoMapeamento;
  valor: VariavelDoModelo | undefined;
  erro: string | null;
  grupos: readonly GrupoDeVariaveis[];
  alternativoAberto: boolean;
  somenteLeitura: boolean;
  aoMudar: (v: VariavelDoModelo | null) => void;
  aoAlternar: (aberto: boolean) => void;
}) {
  const t = useT();
  const fixo = valor?.fonte === "fixo";
  const trecho = `"…${slot.antes.slice(-12)}{{${slot.numero}}}${slot.depois.slice(0, 12)}…"`;
  const campo = valor?.fonte === "campo" ? rotuloDoCampo(grupos, valor.campo) : null;
  const Icone = campo?.grupo ? (ICONE[campo.grupo] ?? User) : User;
  const escolherCampo = (token: string) =>
    aoMudar({ fonte: "campo", campo: token, alternativo: valor?.fonte === "campo" ? valor.alternativo : null });

  return (
    <section
      aria-label={`${slot.botao ? t("Variável do botão") : t("Variável")} ${slot.numero}`}
      className={cn("rounded-[6px] border bg-casca-raia/40 p-3", erro ? "border-casca-alerta" : "border-casca-borda")}
    >
      <p className="mb-2 flex items-center gap-2 text-[13px] text-casca-suave">
        <span className="grid size-6 place-items-center rounded-[4px] bg-white text-[11px] text-casca-texto">
          {slot.numero}
        </span>
        {trecho}
        {erro ? <span className="ml-auto text-[12px] font-medium text-casca-alerta">{t("Corrigir")}</span> : null}
      </p>
      {slot.botao ? (
        <p className="mb-2 flex items-center gap-2 text-[12px] text-casca-suave">
          <span className="rounded-[4px] bg-white px-1.5 py-0.5 text-[11px] text-casca-texto">{t("Botão")}</span>
          {t("Variável de botão: aceita apenas campo da Escale, não aceita texto fixo.")}
        </p>
      ) : null}
      <div className="flex gap-2">
        <CartaoDaOrigem
          ativo={!fixo}
          titulo={t("Buscar na Escale")}
          dica={t("Vem do cadastro e muda em cada envio.")}
          desligado={somenteLeitura}
          aoEscolher={() => fixo && aoMudar(null)}
        />
        <CartaoDaOrigem
          ativo={fixo}
          titulo={t("Escrever um valor")}
          dica={t("O mesmo texto para todos os contatos.")}
          desligado={somenteLeitura || slot.botao}
          aoEscolher={() => !fixo && aoMudar({ fonte: "fixo", valor: "" })}
        />
      </div>
      {fixo ? (
        <div className="mt-3">
          <label className="block text-[13px] text-casca-texto">
            {t("Texto enviado no lugar da variável")}
            <input
              value={valor.valor}
              disabled={somenteLeitura}
              onChange={(e) => aoMudar({ fonte: "fixo", valor: e.target.value })}
              placeholder={t("Digite o texto")}
              className="mt-1.5 h-9 w-full rounded-[4px] border-0 bg-white px-3 text-[13px] outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca"
            />
          </label>
          <p className={cn("mt-1 text-[12px]", erro ? "text-casca-alerta" : "text-casca-suave")}>
            {t(
              "O WhatsApp recusa quebras de linha, tabulações, quatro ou mais espaços seguidos e textos acima de 1024 caracteres.",
            )}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[4px] border border-casca-borda bg-white px-3 text-[13px] text-casca-texto">
              {campo ? (
                <>
                  <Icone size={14} aria-hidden className="shrink-0 text-casca-marca" />
                  <span className="truncate">{t(campo.rotulo)}</span>
                </>
              ) : (
                <span className="text-casca-meta">{t("Nenhum campo escolhido")}</span>
              )}
            </span>
            {somenteLeitura ? null : (
              <SeletorDeVariaveis
                alinhar="end"
                aoEscolher={escolherCampo}
                gatilho={
                  <button type="button" className="shrink-0 text-[13px] font-medium text-casca-marca hover:underline">
                    {campo ? t("Trocar campo") : t("Escolher o campo da Escale")}
                  </button>
                }
              />
            )}
          </div>
          {alternativoAberto && valor?.fonte === "campo" ? (
            <div className="mt-3 border-t border-casca-borda pt-3">
              <div className="flex justify-end">
                {somenteLeitura ? null : (
                  <button
                    type="button"
                    className="text-[13px] text-casca-suave hover:underline"
                    onClick={() => {
                      aoMudar({ ...valor, alternativo: null });
                      aoAlternar(false);
                    }}
                  >
                    {t("Remover")}
                  </button>
                )}
              </div>
              <input
                aria-label={t("Valor alternativo")}
                value={valor.alternativo ?? ""}
                disabled={somenteLeitura}
                onChange={(e) => aoMudar({ ...valor, alternativo: e.target.value })}
                placeholder={t("Digite o valor alternativo")}
                className="mt-1.5 h-9 w-full rounded-[4px] border-0 bg-white px-3 text-[13px] outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca"
              />
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-3 border-t border-casca-borda pt-3 text-[13px]">
              <span className="flex-1 text-casca-suave">
                {t("Se o campo estiver vazio no envio, a mensagem não sai para esse contato.")}
              </span>
              {somenteLeitura || valor?.fonte !== "campo" ? null : (
                <button
                  type="button"
                  className="font-medium text-casca-marca hover:underline"
                  onClick={() => aoAlternar(true)}
                >
                  {t("Definir um valor alternativo")}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
