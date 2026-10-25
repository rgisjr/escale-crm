import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ activeOrg: { orgId: "org-1" } }),
}));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({
  useContactTagVocabulary: () => ({ data: ["vip", "teste_regis"] }),
}));

import { EscolhaDeTagsDaCampanha } from "@/components/escale/campanhas/assistente/EscolhaDeTagsDaCampanha";
import { TagsDaCondicao } from "@/components/escale/conversas/configuracoes/canais/TagsDaCondicao";
import { CampoDeTagComCriar } from "@/components/escale/conversas/massa/CampoDeTagComCriar";
import { BalaoDoNome } from "@/components/escale/ui/BalaoDoNome";
import { tagNovaDoTexto } from "@/lib/escale/tag-nova";

beforeEach(() => vi.clearAllMocks());

describe("tagNovaDoTexto", () => {
  it("devolve a tag normalizada quando o texto não existe", () => {
    expect(tagNovaDoTexto("  Teste ", ["vip"])).toBe("teste");
  });
  it("não oferece criar o vazio, o que já existe nem o que já foi escolhido", () => {
    expect(tagNovaDoTexto("   ", ["vip"])).toBeNull();
    expect(tagNovaDoTexto("VIP", ["vip"])).toBeNull();
    expect(tagNovaDoTexto("novo", ["vip"], ["novo"])).toBeNull();
  });
});

describe("linha 'Criar' nos seletores de tag", () => {
  it("campanha: digitar um nome novo mostra 'Criar' e clicar usa a tag", async () => {
    const aoMudar = vi.fn();
    render(<EscolhaDeTagsDaCampanha tags={[]} aoMudar={aoMudar} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tag" }));
    await userEvent.type(screen.getByPlaceholderText("Adicione uma tag"), "Teste");
    await userEvent.click(screen.getByRole("option", { name: "Criar teste" }));
    expect(aoMudar).toHaveBeenCalledWith(["teste"]);
  });

  it("campanha: nome que já existe não oferece 'Criar'", async () => {
    render(<EscolhaDeTagsDaCampanha tags={[]} aoMudar={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tag" }));
    await userEvent.type(screen.getByPlaceholderText("Adicione uma tag"), "vip");
    expect(screen.queryByRole("option", { name: /^Criar/ })).toBeNull();
  });

  it("condição do canal: a linha 'Criar' inclui a tag nova", async () => {
    const aoMudar = vi.fn();
    render(<TagsDaCondicao valores={[]} aoMudar={aoMudar} desabilitado={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tag" }));
    await userEvent.type(screen.getByPlaceholderText("Buscar por..."), "Novo");
    await userEvent.click(screen.getByRole("option", { name: "Criar novo" }));
    expect(aoMudar).toHaveBeenCalledWith(["novo"]);
  });

  it("ação em massa: 'Criar' escolhe a tag nova e Enter também", async () => {
    const aoMudar = vi.fn();
    render(<CampoDeTagComCriar vocabulario={["vip"]} valor="" aoMudar={aoMudar} />);
    const campo = screen.getByRole("combobox", { name: "Tag" });
    await userEvent.type(campo, "Quente");
    await userEvent.click(screen.getByRole("option", { name: "Criar quente" }));
    expect(aoMudar).toHaveBeenLastCalledWith("quente");
    await userEvent.clear(campo);
    await userEvent.type(campo, "Frio{Enter}");
    expect(aoMudar).toHaveBeenLastCalledWith("frio");
  });

  it("balão do nome da tag: 'Criar' salva o nome novo", async () => {
    const aoSalvar = vi.fn(() => null);
    render(
      <BalaoDoNome
        aria-label="Nova tag"
        placeholder="Adicione uma tag"
        aoSalvar={aoSalvar}
        tagParaCriar={(texto) => tagNovaDoTexto(texto, ["vip"])}
        gatilho={<button type="button">Abrir</button>}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    await userEvent.type(screen.getByPlaceholderText("Adicione uma tag"), "Cliente Ouro");
    await userEvent.click(screen.getByRole("option", { name: "Criar cliente ouro" }));
    expect(aoSalvar).toHaveBeenCalledWith("cliente ouro");
  });
});
