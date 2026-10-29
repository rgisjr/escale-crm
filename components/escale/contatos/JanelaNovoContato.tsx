"use client";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import {
  BotaoDaJanela,
  CabecaDaJanela,
  Campo,
  CampoDeTexto,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import { PAISES_DO_TELEFONE, linkDoInstagram, telefoneE164 } from "@/lib/escale/contatos/regras";

import { CamposDaOportunidade, type OrigemParaCriar } from "./CamposDaOportunidade";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function codigoDoErro(err: unknown): string | null {
  const e = err as { code?: string; body?: { error?: { code?: string } } };
  return e?.code ?? e?.body?.error?.code ?? null;
}

/**
 * A JANELA "NOVO CONTATO" DA CLINT (`NewContactModal`, Fase 2A, C1): Nome*,
 * Email, Telefone (país + número), Instagram e "Desejo criar uma oportunidade de
 * negócio" (Origem* e Etapa*). Grava pelas rotas do original: o contato em
 * `POST /api/v1/contacts` e, se marcado, o negócio em `POST /api/v1/leads`.
 * Sem print da janela: o desenho segue a `JanelaDaCasca` (01-013).
 */
export function JanelaNovoContato({
  aberta,
  aoFechar,
  origens,
  // FORK ESCALE · Fase 3A: "Criar "{termo}"" da Nova conversa abre a janela com o nome já escrito
  // e recebe o contato criado para seguir à escolha do dispositivo.
  nomeInicial,
  aoCriar,
}: {
  aberta: boolean;
  aoFechar: () => void;
  origens: OrigemParaCriar[];
  nomeInicial?: string;
  aoCriar?: (contato: { id: string; nome: string }) => void;
}) {
  const t = useT();
  const qc = useQueryClient();
  const [nome, setNome] = useState(nomeInicial ?? "");
  const [vistoInicial, setVistoInicial] = useState(nomeInicial);
  if (vistoInicial !== nomeInicial) {
    setVistoInicial(nomeInicial);
    setNome(nomeInicial ?? "");
  }
  const [email, setEmail] = useState("");
  const [ddi, setDdi] = useState<string>(PAISES_DO_TELEFONE[0].ddi);
  const [numero, setNumero] = useState("");
  const [instagram, setInstagram] = useState("");
  const [comNegocio, setComNegocio] = useState(false);
  const [destino, setDestino] = useState({ origemId: "", etapaId: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  const limpar = () => {
    setNome("");
    setEmail("");
    setNumero("");
    setInstagram("");
    setComNegocio(false);
    setDestino({ origemId: "", etapaId: "" });
    setErro(null);
  };
  const fechar = () => {
    limpar();
    aoFechar();
  };

  async function adicionar() {
    setErro(null);
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return setErro(t("Informe o nome do contato."));
    const emailLimpo = email.trim();
    if (emailLimpo && !EMAIL.test(emailLimpo)) return setErro(t("E-mail deve ser válido"));
    const telefone = numero.trim() ? telefoneE164(ddi, numero) : null;
    if (numero.trim() && !telefone) return setErro(t("O telefone informado está inválido."));
    const link = linkDoInstagram(instagram);
    if (link === false) return setErro(t("Instagram inválido."));
    if (comNegocio && (!destino.origemId || !destino.etapaId))
      return setErro(t("Escolha a origem e a etapa."));

    setGravando(true);
    try {
      if (emailLimpo) {
        const achados = await apiClient.get<{ data: Array<{ email: string | null }> }>(
          `/api/v1/contacts?search=${encodeURIComponent(emailLimpo)}&limit=100`,
        );
        if (achados.data.some((c) => c.email?.toLowerCase() === emailLimpo.toLowerCase())) {
          setErro(t("Email já cadastrado"));
          return;
        }
      }
      const corpo: Record<string, unknown> = { source: "manual", name: nomeLimpo };
      if (telefone) corpo.phone_number = telefone;
      if (emailLimpo) corpo.email = emailLimpo;
      if (link) corpo.custom_fields = { link_instagram: link };
      let contatoId: string;
      try {
        const criado = await apiClient.post<{ data: { contact: { id: string } } }>(
          "/api/v1/contacts",
          corpo,
        );
        contatoId = criado.data.contact.id;
      } catch (err) {
        setErro(
          codigoDoErro(err) === "contact_exists"
            ? t("Telefone já cadastrado")
            : t("Não foi possível criar o contato."),
        );
        return;
      }
      let negocioId: string | null = null;
      if (comNegocio) {
        try {
          const negocio = await apiClient.post<{ data: { id: string } }>("/api/v1/leads", {
            pipeline_id: destino.origemId,
            stage_id: destino.etapaId,
            title: nomeLimpo.length >= 2 ? nomeLimpo : t("Novo negócio"),
            contact_id: contatoId,
            source: "manual",
          });
          negocioId = negocio.data.id;
        } catch {
          toast.error(t("O contato foi criado, mas o negócio não."));
        }
      }
      // Sem esperar: a janela não pode ficar em "gravando" até as listas refazerem.
      void qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(t("Contato criado com sucesso!"), {
        description: negocioId ? (
          <Link href={`/app/leads/${negocioId}`} className="font-medium underline">
            {t("Ver novo negócio")}
          </Link>
        ) : undefined,
      });
      aoCriar?.({ id: contatoId, nome: nomeLimpo });
      fechar();
    } catch {
      // A checagem de e-mail falhou (rede, 500): sem isto o botão voltava e nada aparecia.
      setErro(t("Não foi possível criar o contato."));
    } finally {
      setGravando(false);
    }
  }

  return (
    <JanelaDaCasca aberta={aberta} onFechar={fechar} ocupado={gravando}>
      <CabecaDaJanela titulo={t("Informações do contato")} />
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void adicionar();
        }}
      >
        <Campo rotulo={t("Nome")} obrigatorio>
          <CampoDeTexto
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={t("Digite o nome do contato")}
          />
        </Campo>
        <Campo rotulo={t("Email")}>
          <CampoDeTexto
            aria-label={t("Email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Campo>
        <Campo rotulo={t("Telefone")}>
          <div className="flex gap-2">
            <SeletorDaCasca
              aparencia="janela"
              valor={ddi}
              opcoes={PAISES_DO_TELEFONE.map((p) => ({
                valor: p.ddi,
                rotulo: `${p.sigla} +${p.ddi}`,
              }))}
              aoMudar={(v) => v && setDdi(v)}
              aria-label={t("País")}
              className="w-[110px] shrink-0"
            />
            <CampoDeTexto
              aria-label={t("Telefone")}
              inputMode="tel"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          </div>
        </Campo>
        <Campo rotulo={t("Instagram")}>
          <CampoDeTexto
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder={t("Ex: @escaleia")}
          />
        </Campo>
        <CaixaDaCasca
          marcada={comNegocio}
          aoMudar={(v) => setComNegocio(v === true)}
          rotulo={t("Desejo criar uma oportunidade de negócio")}
        />
        {comNegocio && (
          <CamposDaOportunidade
            origens={origens}
            origemId={destino.origemId}
            etapaId={destino.etapaId}
            aoMudar={setDestino}
          />
        )}
        {erro && (
          <p role="alert" className="text-[13px] text-casca-alerta">
            {erro}
          </p>
        )}
        <RodapeDaJanela>
          <BotaoDaJanela variante="cancelar" onClick={fechar} disabled={gravando}>
            {t("Cancelar")}
          </BotaoDaJanela>
          {/* "Salvando…" enquanto grava (Frente F, 29/10/2026): o botão só desbotado parecia travado, e o duplo clique criava dois contatos. */}
          <BotaoDaJanela variante="salvar" enviar disabled={gravando}>
            {gravando ? t("Salvando…") : t("Adicionar contato")}
          </BotaoDaJanela>
        </RodapeDaJanela>
      </form>
    </JanelaDaCasca>
  );
}
