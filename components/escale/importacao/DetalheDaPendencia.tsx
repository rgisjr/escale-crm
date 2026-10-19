"use client";
import { useState, type ReactNode } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useDestinosDaImportacao } from "@/hooks/escale/useImportacoes";
import { useT } from "@/hooks/i18n/useT";
import type { Resolucao, ResumoDoContato } from "@/lib/escale/importacao/classificar";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import { REGRAS, type Acao, type Motivo } from "@/lib/escale/importacao/regras";
import { ROTULO_DA_ACAO, ROTULO_DO_MOTIVO, rotuloDaAcao } from "@/lib/escale/importacao/textos";
import type { LinhaLida } from "@/lib/escale/importacao/tipos";
import { ArrowRight, MessageCircle, TriangleAlert } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const COMPARA: readonly Motivo[] = ["MATCH_OVERWRITE_FILLED_FIELD", "MATCH_INSTAGRAM_DIFFERS", "MATCH_PHONE_DIFFERS"];
const ROTULO_PEQUENO = "mb-1 text-[10px] tracking-[0.06em] text-[#86858F] uppercase";
const CAIXA_CINZA = "rounded-[6px] bg-[#F8F8FA] p-3";

const valor = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : Array.isArray(v) ? v.join(", ") : String(v));
const fone = (v: unknown) => (typeof v === "string" && v.startsWith("+") ? formatarTelefone(v) : valor(v));

function Caixa({ rotulo, valor: v, dica, destaque }: { rotulo: string; valor: string; dica?: string | null; destaque?: boolean }) {
  return (
    <div className={cn("min-h-[72px] flex-1 rounded-[6px] border p-3", destaque ? "border-casca-marca bg-casca-marca-suave" : "border-[#F1F0F5] bg-[#F8F8FA]")}>
      <p className={cn(ROTULO_PEQUENO, destaque && "text-casca-marca")}>{rotulo}</p>
      <p className={cn("text-[14px] text-casca-texto", destaque ? "font-semibold" : "font-medium")}>{v}</p>
      {dica ? <p className="mt-0.5 text-[12px] text-[#5A5964]">{dica}</p> : null}
    </div>
  );
}

function CartaoDoContato({ marca, contato, destaque }: { marca: string; contato: ResumoDoContato | undefined; destaque: "email" | "telefone" }) {
  return (
    <div className="flex-1 rounded-[8px] border border-casca-borda p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full bg-casca-marca-suave px-2 py-0.5 text-[11px] font-medium text-casca-marca">{marca}</span>
        {contato?.whatsapp ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#EEFBF2] px-2 py-0.5 text-[11px] text-[#1F9D55]">
            <MessageCircle size={11} aria-hidden /> WhatsApp
          </span>
        ) : null}
      </div>
      <p className="font-semibold text-casca-texto">{contato?.nome ?? "—"}</p>
      <p className={cn("text-[14px]", destaque === "email" ? "font-medium text-[#1F9D55]" : "text-[#5A5964]")}>{contato?.email ?? "—"}</p>
      <p className={cn("text-[14px]", destaque === "telefone" ? "font-medium text-[#1F9D55]" : "text-[#5A5964]")}>{fone(contato?.telefone)}</p>
    </div>
  );
}

export function DetalheDaPendencia({
  linha,
  ocupado,
  rotuloDoCampo,
  aoResolver,
}: {
  linha: LinhaLida;
  ocupado: boolean;
  rotuloDoCampo: (campo: string) => string;
  aoResolver: (acao: Acao, dados?: Resolucao["dados"]) => void;
}) {
  const t = useT();
  const motivo = linha.motivo as Motivo;
  const regra = REGRAS[motivo];
  const d = linha.detalhe;
  const n = linha.normalizado as Record<string, unknown>;
  const [escolha, setEscolha] = useState("");
  const [marcados, setMarcados] = useState<string[]>([]);
  const escolhendoOrigem = motivo === "ORIGIN_NAME_NOT_FOUND";
  const escolhendo = escolhendoOrigem || motivo === "STAGE_NAME_NOT_FOUND";
  const destinos = useDestinosDaImportacao(escolhendo).data ?? [];
  const outras = d.outrasDiferencas ?? [];
  const uma = outras.length === 1;

  function miolo(): ReactNode {
    if (escolhendo) {
      const opcoes = escolhendoOrigem
        ? destinos.map((o) => ({ valor: o.id, rotulo: o.nome }))
        : (destinos.find((o) => o.id === d.origemId)?.etapas ?? []).map((e) => ({ valor: e.id, rotulo: e.nome }));
      return (
        <div className="flex flex-col gap-3">
          <div className={CAIXA_CINZA}>
            <p className={ROTULO_PEQUENO}>{escolhendoOrigem ? t("Origem no arquivo") : t("Etapa no arquivo")}</p>
            <p className="text-[14px] font-medium text-casca-texto">{valor(escolhendoOrigem ? d.origemDoArquivo : d.etapaDoArquivo)}</p>
          </div>
          <SeletorDaCasca
            valor={escolha}
            opcoes={opcoes}
            aoMudar={setEscolha}
            vazio={escolhendoOrigem ? t("Escolha uma origem") : t("Escolha uma etapa")}
            vazioSoNoGatilho
            aria-label={escolhendoOrigem ? t("Escolha uma origem") : t("Escolha uma etapa")}
            className="h-8"
          />
        </div>
      );
    }
    if (motivo === "MERGE_HINT_EMAIL_PHONE_SPLIT") {
      const [a, b] = [d.contatos?.find((c) => c.casouPor === "email"), d.contatos?.find((c) => c.casouPor === "telefone")];
      return (
        <div className="flex flex-col gap-3">
          <div className={CAIXA_CINZA}>
            <p className={ROTULO_PEQUENO}>{t("Linha do arquivo")}</p>
            <p className="text-[14px] text-casca-texto">
              {valor(n.email)} → A · {fone(n.telefone)} → B
            </p>
          </div>
          <div className="flex gap-3">
            <CartaoDoContato marca={t("A · e-mail")} contato={a} destaque="email" />
            <CartaoDoContato marca={t("B · telefone")} contato={b} destaque="telefone" />
          </div>
        </div>
      );
    }
    if (COMPARA.includes(motivo)) {
      const [rotulo, atual, doArquivo] =
        motivo === "MATCH_PHONE_DIFFERS"
          ? [t("Telefone"), fone(d.telefoneAtual), fone(d.telefoneDoArquivo)]
          : motivo === "MATCH_INSTAGRAM_DIFFERS"
            ? [t("Instagram"), valor(d.instagramAtual), valor(d.instagramDoArquivo)]
            : [rotuloDoCampo(d.campo ?? ""), valor(d.valorAtual), valor(d.valorDoArquivo)];
      const manter =
        marcados.length > 0 && !uma ? `${t(ROTULO_DA_ACAO.KEEP_DB.rotulo)} ${t("e atualizar marcados")}` : t(ROTULO_DA_ACAO.KEEP_DB.rotulo);
      return (
        <div className="flex flex-col gap-2">
          <p className="text-[12px] font-medium tracking-[0.06em] text-[#86858F] uppercase">{rotulo}</p>
          <div className="flex items-stretch gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <Caixa rotulo={t("No sistema")} valor={atual} />
              <button
                type="button"
                disabled={ocupado}
                onClick={() => aoResolver("KEEP_DB", marcados.length > 0 ? { sobrescrever: marcados } : undefined)}
                className="h-8 rounded-[6px] border border-[#D9D8E0] text-[13px] text-casca-texto hover:bg-casca-raia disabled:opacity-50"
              >
                {manter}
              </button>
            </div>
            <ArrowRight size={16} aria-hidden className="mt-9 shrink-0 text-[#86858F]" />
            <div className="flex flex-1 flex-col gap-2">
              <Caixa rotulo={t("No arquivo")} valor={doArquivo} destaque />
              <button
                type="button"
                disabled={ocupado}
                onClick={() => aoResolver("OVERWRITE")}
                className="h-8 rounded-[6px] bg-casca-marca text-[13px] font-medium text-accent-foreground hover:bg-casca-marca-forte disabled:opacity-50"
              >
                {t(ROTULO_DA_ACAO.OVERWRITE.rotulo)}
              </button>
            </div>
          </div>
          {uma ? (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => aoResolver("KEEP_DB", { sobrescrever: [outras[0]?.campo ?? ""] })}
              className="h-8 self-start rounded-[6px] bg-casca-marca px-3 text-[13px] font-medium text-accent-foreground disabled:opacity-50"
            >
              {`${t(ROTULO_DA_ACAO.KEEP_DB.rotulo)} ${t("e atualizar {field}").replace("{field}", rotuloDoCampo(outras[0]?.campo ?? "").toLowerCase())}`}
            </button>
          ) : null}
        </div>
      );
    }
    if (motivo === "PHONE_HAS_ACTIVE_WHATSAPP") {
      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2 rounded-[6px] bg-[#EEFBF2] p-3 text-[14px] text-[#1F9D55]">
            <MessageCircle size={16} aria-hidden className="mt-0.5 shrink-0" />
            <div>
              <p>{t("Esse contato tem uma conversa de WhatsApp em andamento no telefone atual.")}</p>
              <p>{t("Por isso uma importação não pode substituir o telefone atual deste contato.")}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Caixa rotulo={t("No sistema")} valor={fone(d.telefoneAtual)} />
            <Caixa rotulo={t("No arquivo")} valor={fone(d.telefoneDoArquivo)} />
          </div>
        </div>
      );
    }
    if (motivo === "MATCH_FILL_EMPTY_FIELDS" && (d.preenchimentos ?? []).length === 0) {
      return <p className={cn(CAIXA_CINZA, "text-[14px] text-[#5A5964]")}>{t("Esta linha não altera nenhum campo — os dados do arquivo já constam neste contato.")}</p>;
    }
    if (motivo === "INVALID_PHONE_FORMAT") {
      const dados = [
        ["email", n.email],
        ["nome", n.nome],
        ["empresa", n.empresa],
        ["instagram", n.instagram],
      ].filter(([, v]) => v);
      return (
        <div className="flex flex-col gap-3">
          <div className={CAIXA_CINZA}>
            <p className={ROTULO_PEQUENO}>{t("Telefone do arquivo (inválido)")}</p>
            <p className="text-[14px] font-medium text-casca-texto">{valor(d.telefoneInvalido)}</p>
          </div>
          {dados.length > 0 ? (
            <div className="rounded-[6px] border border-[#F1F0F5] p-3">
              <p className="mb-1 text-[14px] font-medium text-casca-texto">{t("Dados desta linha")}</p>
              <p className="mb-3 text-[12px] text-[#5A5964]">{t("Serão usados se você ignorar o telefone; o telefone inválido é descartado.")}</p>
              {dados.map(([campo, v]) => (
                <p key={String(campo)} className="text-[14px] text-casca-texto">
                  <span className="font-medium">{rotuloDoCampo(String(campo))}</span>: {valor(v)}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      );
    }
    if (motivo === "DEAL_ID_NOT_FOUND") {
      return (
        <div className={CAIXA_CINZA}>
          <p className={ROTULO_PEQUENO}>{t("ID do negócio no arquivo")}</p>
          <p className="text-[14px] font-medium text-casca-texto">{valor(d.negocioIdDoArquivo)}</p>
        </div>
      );
    }
    if (motivo === "DEAL_DUPLICATE_OPEN") {
      const negocio = (n.negocio ?? {}) as { titulo?: string; origem?: string };
      return (
        <div className="flex items-stretch gap-3">
          <Caixa rotulo={t("Negócio em aberto (atual)")} valor={valor(d.negocioAtual)} />
          <ArrowRight size={16} aria-hidden className="shrink-0 self-center text-[#86858F]" />
          <Caixa rotulo={t("Negócio no arquivo")} valor={valor(negocio.titulo ?? n.nome)} dica={negocio.origem ?? null} destaque />
        </div>
      );
    }
    return <p className={cn(CAIXA_CINZA, "text-[14px] text-casca-texto")}>{valor(n.nome ?? n.email ?? n.telefone ?? d.valorInvalido)}</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5 py-2">
      <div>
        <p className="mb-1 flex items-center gap-2">
          <TriangleAlert size={16} aria-hidden className="text-[#C2570C]" />
          <span className="font-semibold text-casca-texto">{t(ROTULO_DO_MOTIVO[motivo].rotulo)}</span>
          <span className="text-[12px] text-[#86858F]">{t("Linha {n}").replace("{n}", String(linha.numero))}</span>
        </p>
        <p className="text-[14px] text-[#5A5964]">{t(ROTULO_DO_MOTIVO[motivo].descricao)}</p>
        {d.casouPor ? (
          <p className="mt-1 text-[12px] text-[#86858F]">{t("Match por {field}").replace("{field}", rotuloDoCampo(d.casouPor))}</p>
        ) : null}
      </div>
      {miolo()}
      {d.contato ? (
        <div className="rounded-[6px] border border-[#F1F0F5] p-3">
          <p className={cn(ROTULO_PEQUENO, "mb-2")}>{t("Contexto do contato")}</p>
          {(
            [
              [t("Nome"), d.contato.nome],
              [t("E-mail"), d.contato.email],
              [t("Telefone"), d.contato.telefone ? formatarTelefone(d.contato.telefone) : null],
            ] as const
          )
            .filter(([, v]) => v)
            .map(([r, v]) => (
              <p key={r} className="flex items-baseline gap-2">
                <span className="min-w-16 text-[12px] text-[#5A5964]">{r}</span>
                <span className="text-[14px] font-medium text-casca-texto">{v}</span>
              </p>
            ))}
        </div>
      ) : null}
      {motivo === "MATCH_OVERWRITE_FILLED_FIELD" && outras.length > 0 ? (
        <div className="rounded-[6px] border border-[#F1F0F5] p-3">
          <p className="mb-1 text-[14px] font-medium text-casca-texto">{t("Outras diferenças nesta linha")}</p>
          <p className="mb-3 text-[12px] text-[#5A5964]">
            {uma
              ? t("Por padrão mantemos o valor atual. Use o botão abaixo para atualizar com o valor do arquivo.")
              : t("Por padrão mantemos o valor atual. Marque para atualizar com o valor do arquivo.")}
          </p>
          <div className="flex flex-col gap-2">
            {outras.map((o) => {
              const texto = `${rotuloDoCampo(o.campo)} — ${t("Valor atual")}: ${valor(o.valorAtual)} · ${t("Valor do arquivo")}: ${valor(o.valorDoArquivo)}`;
              return uma ? (
                <p key={o.campo} className="text-[14px] text-casca-texto">
                  {texto}
                </p>
              ) : (
                <CaixaDaCasca
                  key={o.campo}
                  marcada={marcados.includes(o.campo)}
                  aoMudar={(m) => setMarcados((atual) => (m ? [...atual, o.campo] : atual.filter((x) => x !== o.campo)))}
                  rotulo={texto}
                />
              );
            })}
          </div>
        </div>
      ) : null}
      {(d.preenchimentos ?? []).length > 0 ? (
        <div className="rounded-[6px] border border-[#F1F0F5] p-3">
          <p className="mb-1 text-[14px] font-medium text-casca-texto">{t("Campos que serão preenchidos")}</p>
          <p className="mb-3 text-[12px] text-[#5A5964]">{t("Estavam vazios neste contato e serão preenchidos com o valor do arquivo.")}</p>
          {(d.preenchimentos ?? []).map((p) => (
            <p key={p.campo} className="text-[14px] text-casca-texto">
              <span className="font-medium">{rotuloDoCampo(p.campo)}</span>: {valor(p.valor)}
            </p>
          ))}
        </div>
      ) : null}
      {!COMPARA.includes(motivo) ? (
        <div className="pt-1">
          <p className="mb-2 text-[12px] text-[#86858F]">{t("O que fazer com esta linha?")}</p>
          <div className="flex flex-wrap gap-2">
            {regra.opcoes.map((acao) => {
              const emBreve = (regra.desligadas ?? []).includes(acao);
              const escolhaFalta = acao === "PICK_MANUALLY" && !escolha;
              const descartar = acao === "SKIP_ROW";
              return (
                <button
                  key={acao}
                  type="button"
                  disabled={ocupado || emBreve || escolhaFalta}
                  onClick={() =>
                    aoResolver(acao, acao === "PICK_MANUALLY" ? (escolhendoOrigem ? { origemId: escolha } : { etapaId: escolha }) : undefined)
                  }
                  className={cn(
                    "h-8 rounded-[6px] px-3 text-[13px] font-medium disabled:opacity-50",
                    descartar ? "border border-[#D9D8E0] text-casca-texto hover:bg-casca-raia" : "bg-casca-marca text-accent-foreground hover:bg-casca-marca-forte",
                  )}
                >
                  {t(rotuloDaAcao(acao, motivo).rotulo)}
                  {emBreve ? ` · ${t("em breve")}` : ""}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
