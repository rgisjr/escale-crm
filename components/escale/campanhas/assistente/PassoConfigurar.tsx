"use client";

import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import { NOME_MAX, type MensagemDeModelo } from "@/lib/escale/campanhas/assistente";
import {
  aoTrocarNumero,
  errosDoPasso,
  type AcaoDoAssistente,
  type EstadoDoAssistente,
} from "@/lib/escale/campanhas/estado-do-assistente";
import {
  rotuloDaCategoria,
  rotuloDoIdioma,
  siglaDoIdioma,
} from "@/lib/escale/campanhas/modelos-da-meta";
import { grupoDoNumero, type NumeroDaCampanha } from "@/lib/escale/campanhas/numeros";
import type { CampoPersonalizado } from "@/lib/escale/campanhas/previa";
import { MessageSquare, SquarePen, Trash2 } from "@/lib/ui/icons-da-casca";

import { CampoComContador } from "../molde/CampoComContador";
import { ROTULO, SUBTITULO_DO_PASSO, TITULO_DO_PASSO } from "../molde/estilos";
import { SeletorDeNumero } from "../molde/SeletorDeNumero";
import { BaseLegal } from "./BaseLegal";
import { JanelaEscolherMensagem } from "./JanelaEscolherMensagem";
import { MensagemLivre } from "./MensagemLivre";
import { QuandoEnviar } from "./QuandoEnviar";
import { VariaveisDoModelo } from "./VariaveisDoModelo";

const MODELO_VAZIO: MensagemDeModelo = {
  tipo: "modelo",
  nome: "",
  idioma: "",
  categoria: null,
  corpo: "",
  variaveis: {},
};

/** PASSO 1 — "Configure a sua campanha" (fork Escale, Fase 8B; 09-018 a 09-026; N3–N6, N19). */
export function PassoConfigurar({
  estado,
  despachar,
  numeros,
  personalizados,
  podeSincronizar,
}: {
  estado: EstadoDoAssistente;
  despachar: (a: AcaoDoAssistente) => void;
  numeros: NumeroDaCampanha[];
  personalizados: CampoPersonalizado[];
  podeSincronizar: boolean;
}) {
  const t = useT();
  const d = estado.dados;
  const numero = numeros.find((n) => n.id === d.numeroId) ?? null;
  const erros = estado.tentou ? errosDoPasso(0, d, { numero, agora: new Date() }) : {};
  const [janela, setJanela] = useState<"modelos" | "textos" | null>(null);
  const mudar = (campos: Partial<typeof d>) => despachar({ tipo: "mudar", campos });
  const visiveis = [...numeros]
    .filter((n) => n.conectado || n.id === d.numeroId)
    .sort((a, b) => Number(b.oficial) - Number(a.oficial))
    .map((n) => ({ ...n, grupo: t(grupoDoNumero(n)) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className={TITULO_DO_PASSO}>
          {numero?.oficial ? t("Mensagem de WhatsApp Oficial") : t("Mensagem de WhatsApp")}
        </h1>
        <p className={SUBTITULO_DO_PASSO}>
          {t("Defina os dados da campanha e escolha o modelo de mensagem que será enviado.")}
        </p>
      </div>

      <CampoComContador
        rotulo={t("Nome da campanha")}
        valor={d.nome}
        aoMudar={(nome) => mudar({ nome })}
        maximo={NOME_MAX}
        placeholder={t("Ex: Reativação de junho")}
        erro={erros.nome ? t(erros.nome) : null}
      />

      <div>
        <span className={ROTULO}>{t("Dispositivo de WhatsApp")}</span>
        <SeletorDeNumero
          numeros={visiveis}
          valor={d.numeroId || null}
          aoMudar={(id) => {
            const escolhido = numeros.find((n) => n.id === id);
            if (escolhido) mudar(aoTrocarNumero(d, escolhido));
          }}
        />
        {erros.numeroId && (
          <p role="alert" className="mt-1.5 text-[11px] text-casca-alerta">
            {t(erros.numeroId)}
          </p>
        )}
      </div>

      {d.mensagem.tipo === "modelo" ? (
        <div className="space-y-4">
          <div>
            <span className={ROTULO}>{t("Modelo de mensagem")}</span>
            {d.mensagem.nome === "" ? (
              <button
                type="button"
                onClick={() => setJanela("modelos")}
                className="flex h-11 w-full items-center justify-center rounded-[8px] bg-casca-busca text-[13px] font-medium text-casca-marca"
              >
                {t("+ Selecionar modelo existente")}
              </button>
            ) : (
              <div className="flex h-16 items-center gap-3 rounded-[8px] border border-casca-borda px-3">
                <span
                  aria-hidden
                  className="flex size-9 items-center justify-center rounded-[8px] bg-casca-marca-suave text-casca-marca"
                >
                  <MessageSquare className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-casca-texto uppercase">
                    {d.mensagem.nome}
                  </span>
                  <span className="block text-[12px] text-casca-suave">
                    {[
                      d.mensagem.categoria ? t(rotuloDaCategoria(d.mensagem.categoria)) : null,
                      `${siglaDoIdioma(d.mensagem.idioma)} ${t(rotuloDoIdioma(d.mensagem.idioma))}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setJanela("modelos")}
                  aria-label={t("Editar modelo")}
                  className="flex size-7 items-center justify-center rounded-[6px] text-casca-texto-2 hover:bg-casca-busca"
                >
                  <SquarePen className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => mudar({ mensagem: MODELO_VAZIO })}
                  aria-label={t("Remover selecionado")}
                  className="flex size-7 items-center justify-center rounded-[6px] text-casca-texto-2 hover:bg-casca-busca"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            )}
          </div>
          {d.mensagem.nome !== "" && (
            <VariaveisDoModelo
              mensagem={d.mensagem}
              personalizados={personalizados}
              aoMudar={(variaveis) =>
                d.mensagem.tipo === "modelo" && mudar({ mensagem: { ...d.mensagem, variaveis } })
              }
            />
          )}
          {erros.mensagem && (
            <p role="alert" className="text-[11px] text-casca-alerta">
              {t(erros.mensagem)}
            </p>
          )}
        </div>
      ) : (
        <MensagemLivre
          texto={d.mensagem.texto}
          aoMudar={(texto) => mudar({ mensagem: { tipo: "texto", texto } })}
          personalizados={personalizados}
          aoUsarTextoSalvo={() => setJanela("textos")}
          erro={erros.mensagem ? t(erros.mensagem) : null}
        />
      )}

      <QuandoEnviar
        quando={d.quando}
        aoMudar={(quando) => mudar({ quando })}
        erro={erros.quando ? t(erros.quando) : null}
      />

      <BaseLegal
        baseLegal={d.baseLegal}
        lia={d.lia}
        aoMudar={(v) => mudar(v)}
        erro={erros.lia ? t(erros.lia) : null}
      />

      {janela && (
        <JanelaEscolherMensagem
          aberta
          aoFechar={() => setJanela(null)}
          modo={janela}
          provider={numero?.provider ?? null}
          podeSincronizar={podeSincronizar}
          aoEscolherModelo={(m) => mudar({ mensagem: m })}
          aoEscolherTexto={(texto) => mudar({ mensagem: { tipo: "texto", texto } })}
        />
      )}
    </div>
  );
}
