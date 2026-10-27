import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { tomDaTag } from "@/lib/escale/tags/paleta";

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

describe("<CardDaCasca> (Casca V4, 01-010)", () => {
  it("o nome é o do contato, o clique no card abre o dossiê, e o ⋮ de ações continua", async () => {
    const { onOpen, u } = montar(COMPLETO);
    expect(screen.getByRole("group", { name: "Lead: Reinaldo Fernandes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ações do card" })).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Reinaldo Fernandes" }));
    expect(onOpen).toHaveBeenCalledWith("l1");
  });

  it("as tags são chips na paleta de 16 tons; sem cor, o tom automático do nome", () => {
    montar(COMPLETO);
    expect(screen.getByText("obra_notificada")).toHaveStyle({
      backgroundColor: "#ffc4c2",
      color: "#9c2933",
    });
    expect(screen.getByText("em_andamento")).toHaveStyle({
      backgroundColor: tomDaTag(null, "em_andamento").fundo,
      color: tomDaTag(null, "em_andamento").texto,
    });
  });

  it("a caixa da mensagem: leva à conversa, ✓✓ da equipe, inicial do atendente, não lidas e a data", () => {
    montar(COMPLETO);
    const caixa = screen.getByRole("link", { name: /Obrigado por entrar/ });
    expect(caixa).toHaveAttribute("href", "/app/inbox?id=conv-1");
    expect(within(caixa).getByLabelText("Mensagem enviada")).toBeInTheDocument();
    expect(within(caixa).getByText("A")).toBeInTheDocument();
    expect(within(caixa).getByLabelText("2 sem ler")).toHaveTextContent("2");
    expect(within(caixa).getByText("23/09")).toBeInTheDocument();
  });

  it("o rodapé: dono, chamar, conversa, e-mail, valor curto, atividades e tempo na etapa", () => {
    montar(COMPLETO);
    expect(screen.getByRole("img", { name: "Responsável: Ivo" })).toHaveTextContent("I");
    expect(screen.getByRole("link", { name: "Ligar" })).toHaveAttribute(
      "href",
      "tel:+5511999990000",
    );
    expect(screen.getByRole("link", { name: "Enviar Whatsapp" })).toHaveAttribute(
      "href",
      "/app/inbox?id=conv-1",
    );
    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute(
      "href",
      "mailto:reinaldo@x.com",
    );
    // E13: as dicas dos atalhos são as da Clint ("Ligar", "Enviar Whatsapp", "Email"),
    // não o endereço do e-mail.
    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute("title", "Email");
    expect(screen.getByText("R$64,8k")).toBeInTheDocument();
    expect(screen.getByText("2/5")).toBeInTheDocument();
    expect(screen.getByText("31h")).toBeInTheDocument();
  });

  it("sem contato, conversa, valor nem dono: nada quebra e nada diz 'undefined'", () => {
    montar(negocio("l2", { title: "Projeto X" }));
    expect(screen.getByRole("group", { name: "Lead: Projeto X" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ligar" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sem telefone" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sem responsável" })).toBeInTheDocument();
    expect(screen.getByText("R$0")).toBeInTheDocument();
    expect(screen.getByText("0/0")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("undefined");
  });

  it("contato sem conversa e com telefone: a caixa oferece abrir a conversa", () => {
    montar(negocio("l3", { contact_id: "c3", contact_phone: "+5511988887777", conversa: null }));
    expect(screen.getByRole("button", { name: "Abrir conversa" })).toBeInTheDocument();
  });

  it("ctrl+clique seleciona sem abrir; a caixinha seleciona sem abrir", async () => {
    const { onOpen, onSelect, u } = montar(COMPLETO);
    await u.keyboard("{Control>}");
    await u.click(screen.getByRole("group", { name: "Lead: Reinaldo Fernandes" }));
    await u.keyboard("{/Control}");
    expect(onSelect).toHaveBeenCalledWith("l1", "alterna");
    await u.click(screen.getByRole("checkbox", { name: "Selecionar: Reinaldo Fernandes" }));
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("a linha do agente só aparece quando tem o que dizer", () => {
    montar(
      negocio("l4", {
        next_action: { label: "Ligar amanhã", seq: 1, proposed_at: "2026-10-15T10:00:00Z" },
      }),
    );
    expect(screen.getByText("próxima ação: Ligar amanhã")).toBeInTheDocument();
  });

  it("na Visualização, o card diz de qual origem é", () => {
    montar(COMPLETO, { origem: "Leads PA" });
    expect(screen.getByText("Leads PA")).toBeInTheDocument();
  });
});
