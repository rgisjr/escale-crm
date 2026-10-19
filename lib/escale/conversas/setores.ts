import { z } from "zod";

/**
 * OS SETORES (fork Escale, Fase 3C; E1, decisão 1 da seção 9). A paleta é a
 * da janela "Crie um setor" (c42): 24 cores em duas linhas. As cores são DADO
 * do setor (como as cores das etiquetas do original), aplicadas por `style`.
 */
export const CORES_DO_SETOR = [
  "#2F2C5D",
  "#8B3DFF",
  "#B4A5F5",
  "#D96BE8",
  "#1C3FD8",
  "#7EA6F6",
  "#3CC38A",
  "#6DE8C4",
  "#A8765A",
  "#F0384B",
  "#F59AA0",
  "#F5A04A",
  "#FAD9B5",
  "#F7DB5A",
  "#B7E36A",
  "#8F8F8F",
  "#C9C9C9",
  "#E5E5E5",
  "#2D6E6E",
  "#57C5CF",
  "#D6E2FF",
  "#EEF2FF",
  "#0EA5C6",
  "#597EFF",
] as const;
export const COR_PADRAO_DO_SETOR = "#597EFF";

/** "Atendimento" → "AT"; "Suporte SAO" → "SS"; o selo da linha (c87) e da lista (c38). */
export function monograma(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return "";
  const [primeira = "", segunda] = palavras;
  if (segunda === undefined) return primeira.slice(0, 2).toUpperCase();
  return `${primeira.charAt(0)}${segunda.charAt(0)}`.toUpperCase();
}

export const setorSchema = z.object({
  nome: z.string().trim().min(1).max(60),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  membros: z.array(z.string().uuid()).max(500),
});
export type NovoSetor = z.infer<typeof setorSchema>;

export interface SetorLido {
  id: string;
  nome: string;
  cor: string;
  membros: string[];
  dispositivos: number;
  ids_dos_dispositivos: string[];
}

export const ordenarSetores = <S extends { nome: string }>(lista: readonly S[]): S[] =>
  [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));

export function filtrarSetores<S extends { nome: string }>(
  lista: readonly S[],
  busca: string,
): S[] {
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  return termo
    ? lista.filter((s) => s.nome.toLocaleLowerCase("pt-BR").includes(termo))
    : [...lista];
}
