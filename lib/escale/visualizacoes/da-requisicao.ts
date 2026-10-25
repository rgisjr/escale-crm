import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import { lerVisualizacoes } from "./ler-visualizacoes";

/** As visualizações lidas UMA vez por requisição (ver `origens/da-requisicao.ts`). */
export const visualizacoesDaRequisicao = cache(async (orgId: string) =>
  lerVisualizacoes(await createClient(), orgId),
);
