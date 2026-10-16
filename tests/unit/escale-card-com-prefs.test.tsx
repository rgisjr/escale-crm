import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@hello-pangea/dnd", () => ({
  Draggable: ({ children }: { children: (p: unknown, s: unknown) => ReactNode }) =>
    children(
      { innerRef: () => {}, draggableProps: {}, dragHandleProps: {} },
      { isDragging: false },
    ),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/components/kanban/KanbanCardActions", () => ({
  KanbanCardActions: () => <button type="button">ações do card</button>,
}));
vi.mock("@/components/kanban/NextActionSlot", () => ({
  NextActionSlot: ({ label }: { label: string }) => <p>{`próxima ação: ${label}`}</p>,
}));
vi.mock("@/components/kanban/AbrirConversaDoLead", () => ({
  temAlvoParaAbrir: (contactId?: string | null, phone?: string | null) =>
    Boolean(contactId) || Boolean(phone?.trim()),
  AbrirConversaDoLead: () => <button type="button">Abrir conversa</button>,
}));
vi.mock("@/components/tags/CoresDasEtiquetas", () => ({
  useCorDaEtiqueta: (tag: string | null | undefined) =>
    tag === "obra_notificada" ? "#cf3716" : null,
}));

import { CardDaCasca } from "@/components/escale/quadro/CardDaCasca";
import { buildCardInput } from "@/lib/kanban/card-state";
import type { Lead } from "@/lib/types/leads";
import { AGORA, horasAtras, negocio } from "@/tests/helpers/negocio-do-quadro";

const NOMES = new Map<string, string | null>([
  ["u-ana", "Ana"],
  ["u-ivo", "Ivo"],
]);

function montar(lead: Lead, extra: Partial<ComponentProps<typeof CardDaCasca>> = {}) {
  const onOpen = vi.fn();
  const onSelect = vi.fn();
  render(
    <CardDaCasca
      card={buildCardInput(lead, { stageName: "Entrada", ownerNames: NOMES, now: AGORA })}
      lead={lead}
      index={0}
      pipelineId="p-1"
      onOpen={onOpen}
      onSelect={onSelect}
      nomes={NOMES}
      {...extra}
    />,
  );
  return { onOpen, onSelect, u: userEvent.setup({ pointerEventsCheck: 0 }) };
}

const COMPLETO = negocio(
  "l1",
  {
    title: "+5511999990000",
    contact_id: "c1",
    contact_phone: "+5511999990000",
    contact_email: "reinaldo@x.com",
    tags: ["obra_notificada", "em_andamento"],
    value_cents: 6_480_000,
    currency: "BRL",
    owner_kind: "user",
    owner_user_id: "u-ivo",
    stage_changed_at: horasAtras(31),
    tarefas: { abertas: 3, atrasadas: 0 },
    conversa: {
      id: "conv-1",
      preview: "Obrigado por entrar em contato",
      last_message_at: "2026-09-23T15:00:00Z",
      unread: 2,
    },
  },
  {
    contato_nome: "Reinaldo Fernandes",
    atividades_concluidas: 2,
    conversa: {
      status: "open",
      canal: "whatsapp",
      atendente_id: "u-ana",
      ultima_entrada: "2026-09-23T14:00:00Z",
      ultima_saida: "2026-09-23T15:00:00Z",
    },
  },
);

import { PREFS_PADRAO, camposDaCapa, type PrefsDoCard } from "@/lib/escale/capa/tipos";

const CAMPOS = camposDaCapa([{ fields: [{ key: "renda", label: "Renda", type: "number" }] }]);
const com = (mudar: (p: PrefsDoCard) => PrefsDoCard) => mudar(structuredClone(PREFS_PADRAO));

describe("<CardDaCasca> com a preferência (Fase 1E)", () => {
  it("sem prefs, é o card da V4 (o padrão da Clint)", () => {
    montar(COMPLETO);
    expect(screen.getByRole("link", { name: "Ligar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enviar Whatsapp" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Email" })).toBeInTheDocument();
  });

  it("desligar tags, prévia, valor e dono tira cada um; o rodapé segue com o que sobrou", () => {
    montar(COMPLETO, {
      prefs: com((p) => ({
        ...p,
        itens: { ...p.itens, tags: false, ultimaMensagem: false, valor: false, dono: false },
      })),
    });
    expect(screen.queryByText("R$64,8k")).toBeNull();
    expect(screen.queryByRole("img", { name: /Responsável/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Obrigado por entrar/ })).toBeNull();
    expect(screen.getByText("2/5")).toBeInTheDocument();
  });

  it("só os canais ligados, na ordem da Clint", () => {
    montar(COMPLETO, { prefs: com((p) => ({ ...p, canais: { ...p.canais, telefone: false } })) });
    expect(screen.queryByRole("link", { name: "Ligar" })).toBeNull();
    expect(screen.getByRole("link", { name: "Email" })).toBeInTheDocument();
  });

  it("os campos escolhidos viram chips; campo vazio não aparece", () => {
    const lead = { ...COMPLETO, custom_fields: { renda: 5000 } };
    montar(lead, {
      prefs: com((p) => ({
        ...p,
        campos: [
          { entidade: "negocio", chave: "renda" },
          { entidade: "contato", chave: "telefone" },
        ],
      })),
      camposDoCard: CAMPOS,
    });
    const chips = screen.getByTestId("chips-de-campos");
    expect(within(chips).getByText("5000")).toBeInTheDocument();
    expect(within(chips).getByText("+5511999990000")).toBeInTheDocument();
  });

  it("tudo desligado: sem rodapé", () => {
    const nada: PrefsDoCard = {
      itens: {
        tags: false,
        empresa: false,
        ultimaMensagem: false,
        atividades: false,
        valor: false,
        idade: false,
        dono: false,
      },
      campos: [],
      canais: {
        telefone: false,
        mensagem: false,
        email: false,
        lembrete: false,
        agendamento: false,
      },
    };
    montar(COMPLETO, { prefs: nada });
    expect(screen.queryByTestId("rodape-do-card")).toBeNull();
  });
});
