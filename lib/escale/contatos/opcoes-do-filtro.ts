import { rotuloDoMotivo } from "@/lib/escale/configuracoes/motivos";
import { CANONICAL_LOST_REASONS, rotuloDoMotivoDePerda } from "@/lib/schemas/leads";

import { CATALOGO_VAZIO } from "@/lib/escale/campos/regras";

import {
  camposDaEmpresaDoFiltro,
  camposDoContatoDoFiltro,
  camposDoNegocioDoFiltro,
  type CampoDoFiltro,
} from "./filtros";

/**
 * AS OPÇÕES DO PAINEL DE FILTROS (fork Escale, Fase 2B), lidas no servidor com a
 * sessão (`origensDaPagina`): as origens não arquivadas com TODAS as etapas não
 * arquivadas (ganho e perda também: filtrar "em etapa" vale para qualquer uma),
 * os motivos de perda (os canônicos do original e os das origens) e os campos do
 * negócio (o valor e o catálogo do CRM).
 */
export type OrigemDoFiltro = {
  id: string;
  nome: string;
  etapas: Array<{ id: string; nome: string }>;
};
export type OpcoesDoFiltro = {
  origens: OrigemDoFiltro[];
  motivos: Array<{ valor: string; rotulo: string }>;
  camposDoNegocio: CampoDoFiltro[];
  /** Fase 2C: os fixos do contato mais o catálogo (já filtrado pelo papel de quem olha). */
  camposDoContato: CampoDoFiltro[];
  /** Fase 2D: os campos da empresa (fixos + catálogo) para o grupo "Empresa" do seletor. */
  camposDaEmpresa: CampoDoFiltro[];
};
export const OPCOES_VAZIAS: OpcoesDoFiltro = {
  origens: [],
  motivos: [],
  camposDoNegocio: [],
  camposDoContato: camposDoContatoDoFiltro(CATALOGO_VAZIO),
  camposDaEmpresa: camposDaEmpresaDoFiltro(CATALOGO_VAZIO),
};

export type OrigemLidaParaFiltro = {
  id: string;
  name: string;
  settings: Record<string, unknown> | null;
  crm_stages: Array<{
    id: string;
    name: string;
    position: number | string;
    is_archived: boolean;
  }> | null;
};

export function opcoesDoFiltroDasOrigens(lidas: readonly OrigemLidaParaFiltro[]): OpcoesDoFiltro {
  const origens = lidas.map((p) => ({
    id: p.id,
    nome: p.name,
    etapas: [...(p.crm_stages ?? [])]
      .filter((s) => !s.is_archived)
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((s) => ({ id: s.id, nome: s.name })),
  }));

  const vistos = new Set<string>();
  const motivos: OpcoesDoFiltro["motivos"] = [];
  for (const valor of CANONICAL_LOST_REASONS) {
    const rotulo = rotuloDoMotivoDePerda(valor);
    vistos.add(rotulo.toLowerCase());
    motivos.push({ valor, rotulo });
  }
  const dasOrigens = lidas
    .flatMap((p) => {
      const lista = p.settings?.lost_reasons;
      return Array.isArray(lista) ? lista.map(rotuloDoMotivo) : [];
    })
    .filter((r): r is string => r !== null)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  for (const rotulo of dasOrigens) {
    if (vistos.has(rotulo.toLowerCase())) continue;
    vistos.add(rotulo.toLowerCase());
    motivos.push({ valor: rotulo, rotulo });
  }

  return {
    origens,
    motivos,
    camposDoNegocio: camposDoNegocioDoFiltro(lidas.map((p) => p.settings)),
    camposDoContato: camposDoContatoDoFiltro(CATALOGO_VAZIO),
    camposDaEmpresa: camposDaEmpresaDoFiltro(CATALOGO_VAZIO),
  };
}
