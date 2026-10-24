"use client";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import Link from "next/link";

import { JanelaDeGerenciarCampos } from "@/components/escale/campos/JanelaDeGerenciarCampos";
import { type EscolhaDeEmpresa, SeletorDeEmpresa } from "@/components/escale/empresas/SeletorDeEmpresa";
import { JanelaTrocarEmpresa } from "@/components/escale/empresas/JanelaTrocarEmpresa";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { useContact } from "@/hooks/contacts/useContact";
import { useCatalogoDeCampos } from "@/hooks/escale/useCatalogoDeCampos";
import { useMudarEmpresa } from "@/hooks/escale/useEmpresa";
import { useEmpresaDoContato, useTrocarEmpresa } from "@/hooks/escale/useEmpresaDoContato";
import { useGravarContato } from "@/hooks/escale/useGravarContato";
import { useOcultosDaOrigem } from "@/hooks/escale/useOcultosDaOrigem";
import { useT } from "@/hooks/i18n/useT";
import { useEditLead } from "@/hooks/kanban/useUpdateLead";
import {
  camposDaEmpresaComGrupos,
  camposDoContatoComGrupos,
  gruposDaFicha,
} from "@/lib/escale/campos/da-ficha";
import { esconderOcultos } from "@/lib/escale/campos/ocultos";
import { GRUPO_PADRAO } from "@/lib/escale/campos/regras";
import { dadosDeFiltro } from "@/lib/escale/filtros/dados-do-quadro";
import {
  CHAVE_EMAIL,
  CHAVE_TELEFONE,
  patchDoContato,
  type CampoEditavel,
} from "@/lib/escale/negocio/campos";
import type { Pipeline } from "@/lib/kanban/types";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import { MOEDA_PADRAO } from "@/lib/money";
import { camposVisiveis } from "@/lib/schemas/mostrar-quando";
import type { Lead } from "@/lib/types/leads";
import { Building2, ExternalLink, Target, User } from "@/lib/ui/icons-da-casca";

import { CamposDaFicha, ROTA_DE_GERENCIAR_CAMPOS } from "./CamposDaFicha";

/** FORK ESCALE · Fases 1G e 1H (C2, C10, C14): as abas de campos (prints 02 a 04). */

const CHAVE_DO_VALOR = "valor";

export function AbaContato({ lead, pipeline }: { lead: Lead; pipeline: Pipeline }) {
  const t = useT();
  if (!lead.contact_id) {
    return (
      <>
        <CamposDaFicha
          icone={<User size={16} />}
          titulo={t("Campos de contato")}
          tipo="contato"
          campos={[]}
        />
        <p className="px-4 text-[13px] text-casca-suave">{t("Este negócio não tem contato.")}</p>
      </>
    );
  }
  return (
    <ContatoEditavel
      contatoId={lead.contact_id}
      pipeline={pipeline}
      reserva={{
        nome: dadosDeFiltro(lead)?.contato_nome ?? null,
        telefone: lead.contact_phone ?? null,
        email: lead.contact_email ?? null,
      }}
    />
  );
}

/**
 * FORK ESCALE · Fase 2E (N5): os campos do contato servem à ficha do negócio e à
 * janela do contato. Sem origem (`pipeline` nulo), nenhum campo fica oculto por
 * origem e a gravação não refaz o quadro. A `reserva` (nome, telefone e e-mail do
 * negócio) só vale enquanto o contato carrega.
 */
export function ContatoEditavel({
  contatoId,
  pipeline,
  reserva,
}: {
  contatoId: string;
  pipeline: Pipeline | null;
  reserva?: { nome: string | null; telefone: string | null; email: string | null };
}) {
  const t = useT();
  const administra = usePermission("settings.write");
  const { data, isError } = useContact(contatoId);
  const { gravar } = useGravarContato(contatoId, pipeline?.id ?? null);
  const contato = data?.data ?? null;
  const carregado = contato !== null;
  const reservaNome = reserva?.nome ?? null;
  const reservaTelefone = reserva?.telefone ?? null;
  const reservaEmail = reserva?.email ?? null;
  const [janela, setJanela] = useState(false);
  const { catalogo } = useCatalogoDeCampos("contato");
  const ocultos = useOcultosDaOrigem(pipeline);

  // Fase 2C: fixos + catálogo do contato em grupos; o oculto sem valor some.
  const campos: CampoEditavel[] = useMemo(
    () =>
      esconderOcultos(
        camposDoContatoComGrupos(contato, catalogo, t, { nome: reservaNome, telefone: reservaTelefone, email: reservaEmail }),
        ocultos.contato,
      ),
    [contato, catalogo, t, reservaNome, reservaTelefone, reservaEmail, ocultos.contato],
  );

  const aoSalvar = useCallback(
    async (campo: CampoEditavel, valor: unknown) => {
      // Sem o contato não há base para o `custom_fields` inteiro (revisão final, C1).
      if (!carregado) throw new Error(t("Não consegui carregar o contato."));
      // O schema do original não aceita apagar telefone nem e-mail (Q4): explica e não grava.
      if (campo.origem === "coluna" && campo.chave === CHAVE_EMAIL && valor == null) {
        throw new Error(t("Para apagar o e-mail, use a ficha do contato."));
      }
      if (campo.origem === "coluna" && campo.chave === CHAVE_TELEFONE && valor == null) {
        throw new Error(t("Para apagar o telefone, use a ficha do contato."));
      }
      try {
        // O PATCH do contato substitui `custom_fields`: o patch é montado sobre o
        // contato mais recente, na hora de enviar, e leva o objeto inteiro.
        const enviou = await gravar((atual) => patchDoContato(atual, campo, valor));
        if (enviou) toast.success(t("As alterações foram salvas com sucesso."));
      } catch {
        // O `useUpdateContact` já mostra o toast do erro da API (showApiError).
        throw new Error(t("Ocorreu um erro ao salvar o campo"));
      }
    },
    [carregado, gravar, t],
  );

  // Carregando ou com erro: a moldura só leitura, sem nenhum editor (C1).
  return (
    <>
      <CamposDaFicha
        icone={<User size={16} />}
        titulo={t("Campos de contato")}
        tipo="contato"
        campos={campos}
        grupos={gruposDaFicha(catalogo)}
        aoSalvar={carregado ? aoSalvar : undefined}
        dicaDoVazio={null}
        aviso={!carregado && isError ? t("Não consegui carregar o contato.") : undefined}
        gerenciarHref={administra ? ROTA_DE_GERENCIAR_CAMPOS : null}
        aoGerenciar={administra ? () => setJanela(true) : undefined}
      />
      {janela ? <JanelaDeGerenciarCampos aberta aoFechar={() => setJanela(false)} objetoInicial="contato" /> : null}
    </>
  );
}

export function AbaEmpresa({ contatoId }: { contatoId: string | null }) {
  const t = useT();
  const podeEditar = usePermission("contact.update"); // atendente ou acima (PRD §5)
  const administra = usePermission("settings.write");
  const [janela, setJanela] = useState<"gerenciar" | { nova: string } | null>(null);
  const { catalogo } = useCatalogoDeCampos("empresa");
  const { data: empresa, isLoading } = useEmpresaDoContato(contatoId);
  const trocar = useTrocarEmpresa(contatoId);
  const mudar = useMudarEmpresa(empresa?.id ?? null);

  // Os oito campos da empresa na Clint (print 03), com os valores da empresa do contato.
  const campos = useMemo(() => {
    const valores = empresa
      ? { nome: empresa.nome, cidade: empresa.cidade, estado: empresa.estado, cnpj: empresa.cnpj, ...empresa.campos }
      : null;
    return camposDaEmpresaComGrupos(valores, catalogo).map((c) => ({
      ...c,
      rotulo: t(c.rotulo),
      origem: c.chave === "nome" ? ("empresa" as const) : c.origem,
      // Sem empresa só o nome (o seletor) se mexe; com ela, quem edita contato edita a empresa.
      travado: c.chave === "nome" ? !podeEditar : !empresa || !podeEditar,
    }));
  }, [empresa, catalogo, t, podeEditar]);

  const escolher = (e: EscolhaDeEmpresa) => {
    if ("id" in e) {
      trocar.mutate({ empresa_id: e.id });
      return;
    }
    // Já tem empresa e o nome é novo: a Clint pergunta o que fazer com os campos.
    if (empresa) setJanela({ nova: e.nova });
    else trocar.mutate({ nova: { nome: e.nova, campos: "limpar" } });
  };

  if (!contatoId) {
    return (
      <CamposDaFicha
        icone={<Building2 size={16} />}
        titulo={t("Campos de empresa")}
        tipo="empresa"
        campos={[]}
        dicaDoVazio={t("Este negócio não tem contato.")}
      />
    );
  }

  return (
    <>
      <CamposDaFicha
        icone={<Building2 size={16} />}
        titulo={t("Campos de empresa")}
        tipo="empresa"
        campos={isLoading ? [] : campos}
        grupos={gruposDaFicha(catalogo)}
        aoSalvar={
          empresa && podeEditar
            ? async (campo, valor) => {
                try {
                  await mudar.mudarCampo.mutateAsync({ chave: campo.chave, valor });
                } catch {
                  throw new Error(t("Ocorreu um erro ao salvar o campo"));
                }
              }
            : undefined
        }
        dicaDoVazio={null}
        aoGerenciar={administra ? () => setJanela("gerenciar") : undefined}
        linhaEspecial={(campo) =>
          campo.origem === "empresa" ? (
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <SeletorDeEmpresa
                  atual={empresa ? { id: empresa.id, nome: empresa.nome } : null}
                  aoEscolher={escolher}
                  desabilitado={!podeEditar}
                />
              </div>
              {empresa ? (
                <Link
                  href={`/app/companies/${empresa.id}?aba=dados`}
                  aria-label={t("Ver dados da empresa {companyName}").replace("{companyName}", empresa.nome)}
                  title={t("Ver dados da empresa {companyName}").replace("{companyName}", empresa.nome)}
                  className="shrink-0 text-casca-marca"
                >
                  <ExternalLink size={14} aria-hidden />
                </Link>
              ) : null}
            </div>
          ) : null
        }
      />
      {janela === "gerenciar" ? (
        <JanelaDeGerenciarCampos aberta aoFechar={() => setJanela(null)} objetoInicial="empresa" />
      ) : null}
      {janela && janela !== "gerenciar" ? (
        <JanelaTrocarEmpresa
          aberta
          nome={janela.nova}
          aoFechar={() => setJanela(null)}
          aoConfirmar={(modo) =>
            trocar.mutate({ nova: { nome: janela.nova, campos: modo } }, { onSuccess: () => setJanela(null) })
          }
        />
      ) : null}
    </>
  );
}

/** As definições do CRM (1F-a) como campos editáveis, já sem os condicionais escondidos. */
export function camposDoCrm(pipeline: Pipeline, valores: Record<string, unknown>): CampoEditavel[] {
  const defs = camposDoFunil(pipeline.settings ?? null);
  return camposVisiveis(defs, valores).map((def) => ({
    chave: def.key,
    origem: "crm" as const,
    rotulo: def.label,
    tipo: def.type,
    valor: valores[def.key],
    opcoes: def.options,
  }));
}

export function AbaNegocio({ lead, pipeline }: { lead: Lead; pipeline: Pipeline }) {
  const t = useT();
  const administra = usePermission("settings.write");
  const editar = useEditLead(pipeline.id);
  const moeda = lead.currency ?? MOEDA_PADRAO;
  const [janela, setJanela] = useState(false);
  const { catalogo } = useCatalogoDeCampos("negocio");
  const ocultos = useOcultosDaOrigem(pipeline);
  // O grupo de cada campo do negócio, pelo catálogo; sem grupo, o padrão.
  const grupoPorChave = useMemo(() => {
    const chaveDoGrupo = new Map(catalogo.grupos.map((g) => [g.id, g.chave]));
    return new Map(
      catalogo.campos.map((c) => [c.chave, (c.grupo_id && chaveDoGrupo.get(c.grupo_id)) || GRUPO_PADRAO]),
    );
  }, [catalogo]);
  const campos: CampoEditavel[] = useMemo(
    () =>
      esconderOcultos(
        [
          {
            chave: CHAVE_DO_VALOR,
            origem: "coluna" as const,
            rotulo: t("Valor"),
            tipo: "currency" as const,
            valor: lead.value_cents == null ? null : lead.value_cents / 100,
            grupo: GRUPO_PADRAO,
          },
          ...camposDoCrm(pipeline, lead.custom_fields ?? {}).map((c) => ({
            ...c,
            grupo: grupoPorChave.get(c.chave) ?? GRUPO_PADRAO,
          })),
        ],
        ocultos.negocio,
      ),
    [t, lead.value_cents, lead.custom_fields, pipeline, grupoPorChave, ocultos.negocio],
  );

  const aoSalvar = useCallback(
    async (campo: CampoEditavel, valor: unknown) => {
      const ehValor = campo.origem === "coluna" && campo.chave === CHAVE_DO_VALOR;
      // O schema do negócio recusa valor negativo (422): explica antes de enviar.
      if (ehValor && typeof valor === "number" && valor < 0) {
        throw new Error(t("O valor não pode ser negativo."));
      }
      // `custom_fields` é mesclado no banco (fn_lead_anotar_campos): vai só a chave que mudou.
      // O roteamento é pela origem: um campo do CRM chamado `valor` vai para `custom_fields`.
      const patch = ehValor
        ? { value_cents: valor == null ? null : Math.round(Number(valor) * 100) }
        : { custom_fields: { [campo.chave]: valor } };
      try {
        await editar.mutateAsync({ leadId: lead.id, patch });
        toast.success(t("As alterações foram salvas com sucesso."));
      } catch {
        throw new Error(t("Ocorreu um erro ao salvar o campo"));
      }
    },
    [editar, lead.id, t],
  );

  return (
    <>
      <CamposDaFicha
        icone={<Target size={16} />}
        titulo={t("Campos de negócio")}
        tipo="negocio"
        campos={campos}
        grupos={gruposDaFicha(catalogo)}
        moeda={moeda}
        aoSalvar={aoSalvar}
        gerenciarHref={administra ? ROTA_DE_GERENCIAR_CAMPOS : null}
        aoGerenciar={administra ? () => setJanela(true) : undefined}
      />
      {janela ? <JanelaDeGerenciarCampos aberta aoFechar={() => setJanela(false)} objetoInicial="negocio" /> : null}
    </>
  );
}
