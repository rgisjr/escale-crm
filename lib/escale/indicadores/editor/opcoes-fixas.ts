/**
 * As opções das fontes fixas do seletor do filtro (fork Escale, Fase 7D). Valores e rótulos vêm dos
 * vocabulários que o código já tem; as fontes sem lista fixa verificada saem pelo motor (valores reais).
 */
import { STATUS_DA_CAMPANHA } from "@/lib/campanhas/tipos";
import { ROTULO_DO_STATUS } from "@/lib/escale/campanhas/apresentacao";
import { ROTULO_DO_TIPO } from "@/lib/escale/playbook/regras";

import type { FonteDeOpcoes } from "../catalogo/tipos";

export type OpcaoDoFiltro = { valor: string; rotulo: string; grupo?: string };

const STATUS_DO_NEGOCIO: OpcaoDoFiltro[] = [
  { valor: "open", rotulo: "Em aberto" },
  { valor: "won", rotulo: "Ganho" },
  { valor: "lost", rotulo: "Perdido" },
];

export const OPCOES_FIXAS: Partial<Record<FonteDeOpcoes, OpcaoDoFiltro[]>> = {
  status_do_negocio: STATUS_DO_NEGOCIO,
  status_da_campanha: STATUS_DA_CAMPANHA.map((valor) => ({ valor, rotulo: ROTULO_DO_STATUS[valor] })),
  tipos_de_atividade: (Object.entries(ROTULO_DO_TIPO) as Array<[string, string]>).map(([valor, rotulo]) => ({ valor, rotulo })),
};
