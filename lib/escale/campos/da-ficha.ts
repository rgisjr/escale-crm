import { phoneForDisplay } from "@/lib/channels/phone-variants";
import type { CampoEditavel } from "@/lib/escale/negocio/campos";
import { TIPOS_DE_LINK, chaveDoLink, lerLinks } from "@/lib/leads/links-de-contato";
import type { Contact } from "@/lib/types/contacts";

import { CAMPOS_FIXOS_DA_EMPRESA, CAMPOS_FIXOS_DO_CONTATO, type Catalogo, GRUPO_PADRAO, camposPorGrupo } from "./regras";

const CPF_MASCARADO = "•••.•••.•••-••";

/** O que a ficha sabe do negócio quando o contato ainda não carregou. */
export interface ReservaDoContato {
  nome?: string | null;
  telefone?: string | null;
  email?: string | null;
}

export function gruposDaFicha(catalogo: Catalogo): Array<{ chave: string; nome: string }> {
  return camposPorGrupo(catalogo).map(({ grupo }) => ({ chave: grupo.chave, nome: grupo.nome }));
}

function doCatalogo(catalogo: Catalogo, valores: Record<string, unknown>): CampoEditavel[] {
  return camposPorGrupo(catalogo).flatMap(({ grupo, campos }) =>
    campos.map((c) => ({
      chave: c.chave,
      rotulo: String(c.definicao.label),
      tipo: c.definicao.type,
      valor: valores[c.chave] ?? null,
      origem: "crm" as const,
      opcoes: c.definicao.options,
      grupo: grupo.chave,
    })),
  );
}

/** Aba Contato (1g-02): fixos, catálogo com grupos e os links da 1H (o Instagram virou fixo). */
export function camposDoContatoComGrupos(
  contato: Contact | null,
  catalogo: Catalogo,
  t: (s: string) => string,
  reserva: ReservaDoContato = {},
): CampoEditavel[] {
  const valores = (contato?.custom_fields ?? {}) as Record<string, unknown>;
  const links = lerLinks(valores);
  const fixos: CampoEditavel[] = CAMPOS_FIXOS_DO_CONTATO.map((f): CampoEditavel => {
    const base = { rotulo: t(f.rotulo), tipo: f.tipo, grupo: GRUPO_PADRAO };
    switch (f.chave) {
      case "nome":
        return { ...base, chave: "nome", origem: "coluna", valor: contato?.name ?? reserva.nome ?? null };
      case "telefone":
        return {
          ...base,
          chave: "telefone",
          origem: "coluna",
          valor: phoneForDisplay(contato?.phone_number ?? reserva.telefone) || null,
        };
      case "email":
        return { ...base, chave: "email", origem: "coluna", valor: contato?.email ?? reserva.email ?? null };
      case "instagram":
        return { ...base, chave: chaveDoLink("instagram"), tipo: "url", origem: "link", valor: links.instagram ?? null };
      case "documento":
        return { ...base, chave: "documento", origem: "coluna", valor: contato?.cpf_hash ? CPF_MASCARADO : null, travado: true };
      default:
        return { ...base, chave: "nascimento", origem: "coluna", valor: contato?.birthdate ?? null };
    }
  });
  const outrosLinks: CampoEditavel[] = TIPOS_DE_LINK.filter((tipo) => tipo.id !== "instagram").map((tipo) => ({
    chave: chaveDoLink(tipo.id),
    rotulo: t(tipo.rotulo),
    tipo: "url",
    valor: links[tipo.id] ?? null,
    origem: "link",
    grupo: GRUPO_PADRAO,
  }));
  return [...fixos, ...doCatalogo(catalogo, valores), ...outrosLinks];
}

/** Aba Empresa (1g-03): os oito da Clint na ordem dela; sem vínculo, tudo travado e vazio (a 2D liga). */
export function camposDaEmpresaComGrupos(valores: Record<string, unknown> | null, catalogo: Catalogo): CampoEditavel[] {
  const travado = valores === null;
  const v = valores ?? {};
  const fixo = (chave: string): CampoEditavel => {
    const f = CAMPOS_FIXOS_DA_EMPRESA.find((x) => x.chave === chave)!;
    return { chave: f.chave, rotulo: f.rotulo, tipo: f.tipo, valor: v[f.chave] ?? null, origem: "coluna", grupo: GRUPO_PADRAO, travado };
  };
  const catalogoDaEmpresa = doCatalogo(catalogo, v).map((c) => ({ ...c, travado }));
  const pegar = (chave: string) => catalogoDaEmpresa.find((c) => c.chave === chave);
  const ordenados = [
    fixo("nome"),
    pegar("site"),
    fixo("cidade"),
    fixo("estado"),
    pegar("categoria"),
    pegar("segmento"),
    pegar("numero_de_funcionarios"),
    fixo("cnpj"),
  ].filter(Boolean) as CampoEditavel[];
  const resto = catalogoDaEmpresa.filter(
    (c) => !["site", "categoria", "segmento", "numero_de_funcionarios"].includes(c.chave),
  );
  return [...ordenados, ...resto];
}
