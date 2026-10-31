import type pg from "pg";

import type { FaixaComercial } from "@/lib/canais/horario-comercial";
import { fusoUtilizavel } from "@/lib/tempo/fusos";

/** As faixas do horário comercial de um número, lidas pelo `pg.Pool` do worker (o mesmo dado de `lerHorarioComercial`). */
export async function faixasComerciaisPg(
  pool: pg.Pool,
  organizationId: string,
  channelSessionId: string,
): Promise<FaixaComercial[]> {
  const { rows } = await pool.query<{ dia_da_semana: number; inicio_min: number; fim_min: number }>(
    `select dia_da_semana, inicio_min, fim_min
       from channel_business_hours
      where organization_id = $1 and channel_session_id = $2`,
    [organizationId, channelSessionId],
  );
  return rows.map((r) => ({ diaDaSemana: r.dia_da_semana, inicioMin: r.inicio_min, fimMin: r.fim_min }));
}

/** O fuso do número (`channel_knobs.timezone`) ou, sem ele, o da organização: a mesma escada da janela do canal. */
export async function fusoDoCanalPg(
  pool: pg.Pool,
  organizationId: string,
  channelSessionId: string,
  fusoDaOrganizacao: string,
): Promise<string> {
  const { rows } = await pool.query<{ timezone: string | null }>(
    `select timezone from channel_knobs where organization_id = $1 and channel_session_id = $2`,
    [organizationId, channelSessionId],
  );
  return fusoUtilizavel(rows[0]?.timezone, fusoDaOrganizacao);
}
