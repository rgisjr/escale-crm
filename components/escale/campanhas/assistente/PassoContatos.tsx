"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { JanelaNovoContato } from "@/components/escale/contatos/JanelaNovoContato";
import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
import { ConfirmacaoDaCasca } from "@/components/escale/ui/ConfirmacaoDaCasca";
import {
  contatosDaImportacao,
  useAcompanharImportacao,
  usePaginaDoPublico,
} from "@/hooks/escale/useAssistenteDeCampanha";
import { useT } from "@/hooks/i18n/useT";
import { PUBLICO_VAZIO } from "@/lib/escale/campanhas/assistente";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import {
  errosDoPasso,
  type AcaoDoAssistente,
  type EstadoDoAssistente,
} from "@/lib/escale/campanhas/estado-do-assistente";
import { comAvulsos, comSelecao, publicoVazio, semContato } from "@/lib/escale/campanhas/publico";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import { Loader2, Pencil, Trash2, Upload, UserPlus, Users } from "@/lib/ui/icons-da-casca";

import { BOTAO_CONTORNADO, SUBTITULO_DO_PASSO, TITULO_DO_PASSO } from "../molde/estilos";
import { JanelaImportarCsv } from "./JanelaImportarCsv";
import { JanelaSelecionarContatos } from "./JanelaSelecionarContatos";
import { ListaDeDestinatarios } from "./ListaDeDestinatarios";

type Janela = "adicionar" | "selecionar" | "csv" | null;

/** PASSO 2 — "Escolha seus contatos" (fork Escale, Fase 8B; 09-027 a 09-037; N7–N10). */
export function PassoContatos({
  estado,
  despachar,
  numeroOficial,
  origens,
  opcoesDoFiltro,
}: {
  estado: EstadoDoAssistente;
  despachar: (a: AcaoDoAssistente) => void;
  numeroOficial: boolean;
  origens: OrigemParaCriar[];
  opcoesDoFiltro: OpcoesDoFiltro;
}) {
  const t = useT();
  const publico = estado.dados.publico;
  const [janela, setJanela] = useState<Janela>(null);
  const [importacaoId, setImportacaoId] = useState<string | null>(null);
  const importacao = useAcompanharImportacao(importacaoId);
  const total = usePaginaDoPublico(publico, 1, 10, !publicoVazio(publico)).data?.total ?? 0;
  const erros = estado.tentou
    ? errosDoPasso(1, estado.dados, { numero: null, agora: new Date() })
    : {};
  const publicoAtual = useRef(publico);
  useEffect(() => {
    publicoAtual.current = publico;
  });

  useEffect(() => {
    const status = importacao.data?.status;
    if (!importacaoId || !status) return;
    if (status === "concluida") {
      const id = importacaoId;
      setImportacaoId(null);
      contatosDaImportacao(id)
        .then((ids) => {
          despachar({ tipo: "mudarPublico", publico: comAvulsos(publicoAtual.current, ids) });
          toast.success(t("{n} contatos adicionados.").replace("{n}", numeroBr(ids.length)));
        })
        .catch(() => toast.error(t("Não foi possível ler os contatos importados. Tente de novo.")));
    } else if (status === "cancelada" || status === "falhou") {
      setImportacaoId(null);
      toast.error(t("A importação não terminou. Veja o relatório em Importações."));
    }
  }, [importacao.data?.status, importacaoId, despachar, t]);

  const mudarPublico = (p: typeof publico) => despachar({ tipo: "mudarPublico", publico: p });
  const cartoes = [
    {
      janela: "adicionar" as const,
      icone: <UserPlus className="size-5" aria-hidden />,
      titulo: t("Adicionar contato"),
      descricao: t("Cadastre um contato manualmente"),
    },
    {
      janela: "selecionar" as const,
      icone: <Users className="size-5" aria-hidden />,
      titulo: t("Selecionar contatos"),
      descricao: t("Escolha da sua base de contatos"),
    },
    {
      janela: "csv" as const,
      icone: <Upload className="size-5" aria-hidden />,
      titulo: t("Importar telefones .csv"),
      descricao: t("Importe uma lista .csv"),
    },
  ];

  return (
    <div>
      <h1 className={TITULO_DO_PASSO}>
        {numeroOficial ? t("Mensagem de WhatsApp Oficial") : t("Mensagem de WhatsApp")}
      </h1>
      <p className={SUBTITULO_DO_PASSO}>{t("Escolha para quem você quer enviar Whatsapp")}</p>

      {estado.publicoAntigo && (
        <p
          role="status"
          className="mt-4 rounded-[8px] bg-casca-marca-suave px-4 py-3 text-[13px] text-casca-texto"
        >
          {t(
            "Esta campanha usava o público por filtro da tela antiga; escolha os destinatários de novo.",
          )}
        </p>
      )}

      {publicoVazio(publico) && !importacaoId ? (
        <div className="mt-6 grid grid-cols-3 gap-4">
          {cartoes.map((c) => (
            <button
              key={c.janela}
              type="button"
              onClick={() => setJanela(c.janela)}
              className="flex h-[146px] flex-col items-center justify-center rounded-[10px] border border-casca-borda bg-casca-raia px-4 text-center hover:border-casca-marca-media"
            >
              <span
                aria-hidden
                className="flex size-11 items-center justify-center rounded-[8px] bg-surface text-casca-marca"
              >
                {c.icone}
              </span>
              <span className="mt-3 text-[13px] font-semibold text-casca-texto">{c.titulo}</span>
              <span className="mt-1 text-[13px] text-casca-suave">{c.descricao}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="text-[13px] text-casca-texto-2">{t("Destinatários")}</span>
            <span className="-ml-2 text-[13px] font-semibold text-casca-marca">
              {numeroBr(total)}
            </span>
            <button
              type="button"
              onClick={() => setJanela("selecionar")}
              className="flex items-center gap-1 text-[13px] font-medium text-casca-marca"
            >
              <Pencil className="size-3" aria-hidden />
              {t("editar seleção")}
            </button>
            <span className="ml-auto flex items-center gap-2">
              {cartoes.map((c) => (
                <button
                  key={c.janela}
                  type="button"
                  onClick={() => setJanela(c.janela)}
                  className={BOTAO_CONTORNADO}
                >
                  {c.titulo}
                </button>
              ))}
              <ConfirmacaoDaCasca
                texto={t("Remover todos os destinatários?")}
                aoConfirmar={() => mudarPublico(PUBLICO_VAZIO)}
              >
                <button
                  type="button"
                  aria-label={t("Remover contatos")}
                  className="flex size-8 items-center justify-center rounded-[6px] text-casca-texto-2 hover:bg-casca-busca"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </ConfirmacaoDaCasca>
            </span>
          </div>
          {importacaoId && (
            <p
              role="status"
              className="mb-2 flex items-center gap-2 text-[13px] text-casca-texto-2"
            >
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {importacao.data?.status === "aguardando_revisao"
                ? t(
                    "A importação espera a sua revisão em Importações; os contatos entram aqui quando ela terminar.",
                  )
                : t("Importando contatos…")}
            </p>
          )}
          {!publicoVazio(publico) && (
            <ListaDeDestinatarios
              publico={publico}
              aoRemover={(id) => mudarPublico(semContato(publico, id))}
            />
          )}
        </div>
      )}

      {erros.publico && (
        <p role="alert" className="mt-3 text-[12px] text-casca-alerta">
          {t(erros.publico)}
        </p>
      )}

      <JanelaNovoContato
        aberta={janela === "adicionar"}
        aoFechar={() => setJanela(null)}
        origens={origens}
        aoCriar={(c) => {
          mudarPublico(comAvulsos(publico, [c.id]));
          setJanela(null);
        }}
      />
      {janela === "selecionar" && (
        <JanelaSelecionarContatos
          aberta
          aoFechar={() => setJanela(null)}
          inicial={publico.selecao}
          opcoesDoFiltro={opcoesDoFiltro}
          aoAdicionar={(s) => mudarPublico(comSelecao(publico, s))}
        />
      )}
      {janela === "csv" && (
        <JanelaImportarCsv aberta aoFechar={() => setJanela(null)} aoImportar={setImportacaoId} />
      )}
    </div>
  );
}
