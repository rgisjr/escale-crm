// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { audit } = vi.hoisted(() => ({ audit: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit }));

import { gravarHorarioComercial } from "@/lib/canais/horario-comercial-escrita";

const ORG = "11111111-1111-4111-8111-111111111111";
const CANAL = "22222222-2222-4222-8222-222222222222";

function banco(canalExiste: boolean) {
  const operacoes: string[] = [];
  const inseridas: Array<Record<string, unknown>> = [];
  const db = {
    from: (tabela: string) => {
      const filtros: Record<string, unknown> = {};
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.eq = (c: string, v: unknown) => {
        filtros[c] = v;
        return q;
      };
      q.maybeSingle = async () => ({ data: tabela === "channel_sessions" && canalExiste ? { id: CANAL } : null, error: null });
      let apagando = false;
      q.delete = () => {
        apagando = true;
        return q;
      };
      q.insert = async (linhas: Array<Record<string, unknown>>) => {
        operacoes.push(`insert:${tabela}`);
        inseridas.push(...linhas);
        return { error: null };
      };
      q.then = (ok: (r: unknown) => unknown) => {
        if (apagando) operacoes.push(`delete:${tabela}:${String(filtros.organization_id ?? "")}`);
        return Promise.resolve({ error: null }).then(ok);
      };
      return q;
    },
  } as unknown as SupabaseClient;
  return { db, operacoes, inseridas };
}

const entrada = (faixas: Array<{ diaDaSemana: number; inicioMin: number; fimMin: number }>) => ({
  organizationId: ORG,
  channelSessionId: CANAL,
  faixas,
  requestId: "req",
  actorUserId: null,
});

beforeEach(() => audit.mockReset());

describe("gravarHorarioComercial", () => {
  it("troca a grade inteira, sempre com a organização do contexto", async () => {
    const { db, operacoes, inseridas } = banco(true);
    await gravarHorarioComercial(db, entrada([{ diaDaSemana: 1, inicioMin: 570, fimMin: 1080 }]));
    expect(operacoes).toEqual([`delete:channel_business_hours:${ORG}`, "insert:channel_business_hours"]);
    expect(inseridas[0]).toMatchObject({ organization_id: ORG, channel_session_id: CANAL, dia_da_semana: 1, inicio_min: 570, fim_min: 1080 });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "channel_business_hours.updated" }));
  });

  it("grade vazia só limpa (sem restrição)", async () => {
    const { db, operacoes } = banco(true);
    await gravarHorarioComercial(db, entrada([]));
    expect(operacoes).toEqual([`delete:channel_business_hours:${ORG}`]);
  });

  it("faixa inválida: recusa antes de tocar o banco", async () => {
    const { db, operacoes } = banco(true);
    await expect(gravarHorarioComercial(db, entrada([{ diaDaSemana: 9, inicioMin: 0, fimMin: 60 }]))).rejects.toThrow("dia_invalido");
    expect(operacoes).toHaveLength(0);
  });

  it("canal de outra organização: recusa sem apagar nada", async () => {
    const { db, operacoes } = banco(false);
    await expect(gravarHorarioComercial(db, entrada([{ diaDaSemana: 1, inicioMin: 0, fimMin: 60 }]))).rejects.toThrow("canal_nao_encontrado");
    expect(operacoes).toHaveLength(0);
  });
});
