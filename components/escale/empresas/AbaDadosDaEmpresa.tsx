"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { JanelaDeGerenciarCampos } from "@/components/escale/campos/JanelaDeGerenciarCampos";
import { CamposDaFicha } from "@/components/escale/negocio/abas/CamposDaFicha";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useCatalogoDeCampos } from "@/hooks/escale/useCatalogoDeCampos";
import { useMudarEmpresa } from "@/hooks/escale/useEmpresa";
import { useT } from "@/hooks/i18n/useT";
import { camposDaEmpresaComGrupos, gruposDaFicha } from "@/lib/escale/campos/da-ficha";
import { esconderOcultos } from "@/lib/escale/campos/ocultos";
import type { FichaDaEmpresa } from "@/lib/escale/empresas/banco";
import { Building2 } from "@/lib/ui/icons-da-casca";

/** A aba Dados da ficha da empresa: os campos da Clint (1g-03) em grupos, editáveis, mais a consulta do CNPJ. */
export function AbaDadosDaEmpresa({
  empresa,
  podeEditar,
  podeAdministrar,
  podeConsultarCnpj,
}: {
  empresa: FichaDaEmpresa;
  podeEditar: boolean;
  podeAdministrar: boolean;
  podeConsultarCnpj: boolean;
}) {
  const t = useT();
  const { catalogo } = useCatalogoDeCampos("empresa");
  const { mudarCampo } = useMudarEmpresa(empresa.id);
  const [janela, setJanela] = useState(false);
  const [consultando, setConsultando] = useState(false);

  const campos = useMemo(
    () =>
      esconderOcultos(
        camposDaEmpresaComGrupos(
          { nome: empresa.nome, cidade: empresa.cidade, estado: empresa.estado, cnpj: empresa.cnpj, ...empresa.campos },
          catalogo,
        ).map((c) => ({ ...c, rotulo: t(c.rotulo) })),
        [],
      ),
    [empresa, catalogo, t],
  );

  async function consultarCnpj() {
    if (!empresa.cnpj) return;
    setConsultando(true);
    try {
      const r = await fetch(`/api/v1/companies/lookup?cnpj=${encodeURIComponent(empresa.cnpj)}`);
      const corpo = await r.json().catch(() => null);
      if (!r.ok) {
        toast.error(corpo?.error?.message ?? t("Não foi possível consultar o CNPJ."));
        return;
      }
      const dados = (corpo?.data?.fields ?? {}) as { city?: string | null; state?: string | null };
      if (dados.city) await mudarCampo.mutateAsync({ chave: "cidade", valor: dados.city });
      if (dados.state) await mudarCampo.mutateAsync({ chave: "estado", valor: dados.state });
      toast.success(t("Dados do CNPJ aplicados."));
    } catch {
      toast.error(t("Não foi possível consultar o CNPJ."));
    } finally {
      setConsultando(false);
    }
  }

  return (
    <>
      <CamposDaFicha
        icone={<Building2 size={16} />}
        titulo={t("Campos de empresa")}
        tipo="empresa"
        campos={campos}
        grupos={gruposDaFicha(catalogo)}
        aoSalvar={
          podeEditar
            ? async (campo, valor) => {
                try {
                  await mudarCampo.mutateAsync({ chave: campo.chave, valor });
                } catch (e) {
                  throw new Error(e instanceof Error && e.message ? e.message : t("Ocorreu um erro ao salvar o campo"));
                }
              }
            : undefined
        }
        dicaDoVazio={null}
        aoGerenciar={podeAdministrar ? () => setJanela(true) : undefined}
      />
      {podeConsultarCnpj && empresa.cnpj ? (
        <div className="px-4 pb-6">
          <BotaoDaCasca type="button" variante="novo" disabled={consultando} onClick={() => void consultarCnpj()}>
            {consultando ? t("Consultando…") : t("Consultar CNPJ")}
          </BotaoDaCasca>
        </div>
      ) : null}
      {janela ? <JanelaDeGerenciarCampos aberta aoFechar={() => setJanela(false)} objetoInicial="empresa" /> : null}
    </>
  );
}
