import { describe, expect, it } from "vitest";

import type { CuratedField } from "@/app/app/webhooks/_components/RuleEditor";
import {
  buscarItens,
  estadoDoEditorDeHorario,
  itensDaCategoria,
  mascaraDeDataEHora,
  mascaraDeHora,
  montarValorDoHorario,
  paredeDoTexto,
  resumoDoHorario,
  textoDaParede,
  textoDoResumoDoHorario,
} from "@/lib/escale/automacoes/fluxo/condicoes";

const CAMPOS: CuratedField[] = [
  { value: "lead.tags", label: "Tags do lead", op: "contains", lista: true },
  { value: "contact.tags", label: "Tags do contato", op: "contains", lista: true },
  { value: "event.added_tags", label: "Tag adicionada", op: "contains", lista: true },
];
const t = (s: string) => s;

describe("categorias do seletor", () => {
  it("Contato = contact.*, Negócio = lead.*, Campos = event.* + campo personalizado, Horário atual = Hora, Data e o Em breve", () => {
    expect(itensDaCategoria("contato", CAMPOS).map((i) => (i.tipo === "campo" ? i.campo.value : i.tipo))).toEqual(["contact.tags"]);
    expect(itensDaCategoria("negocio", CAMPOS).map((i) => (i.tipo === "campo" ? i.campo.value : i.tipo))).toEqual(["lead.tags"]);
    expect(itensDaCategoria("campos", CAMPOS).map((i) => i.tipo)).toEqual(["campo", "avancado"]);
    expect(itensDaCategoria("horario", CAMPOS).map((i) => i.tipo)).toEqual(["horario", "horario", "em_breve"]);
  });

  it("a busca procura em todas as categorias pelo rótulo", () => {
    expect(buscarItens("tags", CAMPOS, t)).toHaveLength(2);
    expect(buscarItens("hora", CAMPOS, t).map((i) => (i.tipo === "campo" ? i.campo.label : i.rotulo))).toEqual(["Hora", "Horário de atendimento"]);
    expect(buscarItens("zzz", CAMPOS, t)).toEqual([]);
  });
});

describe("máscaras e data de parede", () => {
  it("hora e data e hora a partir dos dígitos", () => {
    expect(mascaraDeHora("0830")).toBe("08:30");
    expect(mascaraDeHora("08")).toBe("08");
    expect(mascaraDeHora("12:345")).toBe("12:34");
    expect(mascaraDeDataEHora("031120261400")).toBe("03/11/2026 14:00");
    expect(mascaraDeDataEHora("0311")).toBe("03/11");
  });

  it("dd/mm/aaaa hh:mm ↔ AAAA-MM-DDTHH:MM, recusando data que não existe", () => {
    expect(paredeDoTexto("03/11/2026 14:00")).toBe("2026-11-03T14:00");
    expect(paredeDoTexto("31/02/2026 14:00")).toBeNull();
    expect(paredeDoTexto("03/11/2026")).toBeNull();
    expect(textoDaParede("2026-11-03T14:00")).toBe("03/11/2026 14:00");
  });
});

describe("valor e resumo", () => {
  it("monta o valor da Hora e da Data; inválido = null", () => {
    expect(montarValorDoHorario("agora.hora", "entre", "08:00", "18:00", ["5", "1"])).toBe('{"de":"08:00","ate":"18:00","dias":[1,5]}');
    expect(montarValorDoHorario("agora.hora", "depois_de", "08:00", "18:00", [])).toBe('{"de":"08:00","dias":[]}');
    expect(montarValorDoHorario("agora.hora", "entre", "08:00", "", [])).toBeNull();
    expect(montarValorDoHorario("agora.data", "antes_de", "03/11/2026 14:00", "", [])).toBe('{"de":"2026-11-03T14:00"}');
    expect(montarValorDoHorario("agora.data", "entre", "03/11/2026 14:00", "03/11/2026 13:00", [])).toBeNull();
  });

  it("o editor reabre com o que estava gravado", () => {
    expect(estadoDoEditorDeHorario("agora.hora", { op: "entre", value: '{"de":"08:00","ate":"18:00","dias":[1]}' })).toEqual({
      op: "entre",
      de: "08:00",
      ate: "18:00",
      dias: ["1"],
    });
    expect(estadoDoEditorDeHorario("agora.data")).toEqual({ op: "depois_de", de: "", ate: "", dias: [] });
  });

  it("o resumo do nó: frase da Clint, intervalo e dias", () => {
    const r = resumoDoHorario({ field: "agora.hora", op: "entre", value: '{"de":"08:00","ate":"18:00","dias":[0,1,2]}' });
    expect(r?.frase).toBe("está entre");
    expect(textoDoResumoDoHorario("agora.hora", r!, t)).toBe("08:00 até 18:00 · seg, ter, dom");
    const todos = resumoDoHorario({ field: "agora.hora", op: "depois_de", value: '{"de":"08:00"}' });
    expect(textoDoResumoDoHorario("agora.hora", todos!, t)).toBe("08:00 · todos os dias");
    const d = resumoDoHorario({ field: "agora.data", op: "depois_de", value: '{"de":"2026-11-03T14:00"}' });
    expect(d?.frase).toBe("é depois de");
    expect(textoDoResumoDoHorario("agora.data", d!, t)).toBe("03/11/2026 14:00");
    expect(resumoDoHorario({ field: "agora.hora", op: "entre", value: "x" })).toBeNull();
  });
});
