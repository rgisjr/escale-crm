import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  setActiveOrg: vi.fn(),
  trocarIdioma: vi.fn(),
  begin: vi.fn(),
  cancel: vi.fn(),
  aplicar: vi.fn(),
  toastErro: vi.fn(),
}));

vi.mock("@/app/actions/shell/setActiveOrg", () => ({ setActiveOrg: m.setActiveOrg }));
vi.mock("@/app/actions/settings/trocarIdioma", () => ({ trocarIdioma: m.trocarIdioma }));
vi.mock("@/components/shell/OrganizationTransitionProvider", () => ({
  useOrganizationTransition: () => ({ begin: m.begin, cancel: m.cancel }),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useActiveOrg: () => ({ orgId: "org-1" }) }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/lib/i18n/IdiomaProvider", () => ({
  useIdioma: () => "pt-BR",
  useAplicarIdioma: () => m.aplicar,
  useT: () => (texto: string) => texto,
}));
vi.mock("sonner", () => ({ toast: { error: m.toastErro } }));

import { useTrocarDeIdioma } from "@/hooks/escale/useTrocarDeIdioma";
import { useTrocarDeOrganizacao } from "@/hooks/escale/useTrocarDeOrganizacao";

const original = window.location;
const assign = vi.fn();
const reload = vi.fn();

beforeEach(() => {
  for (const f of Object.values(m)) f.mockReset();
  assign.mockReset();
  reload.mockReset();
  // `window.location` não é substituível direto no jsdom (mesma saída de OrganizationTransitionProvider.test).
  Object.defineProperty(window, "location", { configurable: true, value: { ...original, assign, reload } });
});
afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: original });
});

describe("useTrocarDeOrganizacao (a mesma sequência do TenantSwitcher)", () => {
  it("a organização que já está aberta não faz nada", async () => {
    const { result } = renderHook(() => useTrocarDeOrganizacao());
    await act(() => result.current.trocar("org-1"));
    expect(m.setActiveOrg).not.toHaveBeenCalled();
  });

  it("troca: avisa a transição, grava e abre um documento novo em /app/inbox", async () => {
    m.setActiveOrg.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useTrocarDeOrganizacao());
    await act(() => result.current.trocar("org-2"));
    expect(m.begin).toHaveBeenCalledWith("Carregando organização…");
    expect(m.setActiveOrg).toHaveBeenCalledWith("org-2");
    expect(assign).toHaveBeenCalledWith("/app/inbox");
  });

  it("falhou: desfaz a transição, avisa e não navega", async () => {
    m.setActiveOrg.mockResolvedValue({ ok: false, error: "forbidden" });
    const { result } = renderHook(() => useTrocarDeOrganizacao());
    await act(() => result.current.trocar("org-2"));
    expect(m.cancel).toHaveBeenCalled();
    expect(m.toastErro).toHaveBeenCalledWith(
      "Não foi possível trocar de organização. Seu acesso pode ter mudado. Tente novamente.",
    );
    expect(assign).not.toHaveBeenCalled();
    expect(result.current.trocando).toBe(false);
  });
});

describe("useTrocarDeIdioma (a mesma sequência do SeletorDeIdioma)", () => {
  it("o idioma em vigor não faz nada", () => {
    const { result } = renderHook(() => useTrocarDeIdioma());
    act(() => result.current.escolher("pt-BR"));
    expect(m.trocarIdioma).not.toHaveBeenCalled();
  });

  it("troca: pinta na hora, grava e recarrega", async () => {
    m.trocarIdioma.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useTrocarDeIdioma());
    act(() => result.current.escolher("es"));
    expect(m.aplicar).toHaveBeenCalledWith("es");
    await vi.waitFor(() => expect(reload).toHaveBeenCalled());
    expect(m.trocarIdioma).toHaveBeenCalledWith("es");
  });

  it("falhou: volta ao idioma de antes e avisa", async () => {
    m.trocarIdioma.mockResolvedValue({ ok: false, error: "x" });
    const { result } = renderHook(() => useTrocarDeIdioma());
    act(() => result.current.escolher("es"));
    await vi.waitFor(() => expect(m.toastErro).toHaveBeenCalledWith("Não foi possível trocar o idioma. Tente de novo."));
    expect(m.aplicar).toHaveBeenLastCalledWith("pt-BR");
    expect(reload).not.toHaveBeenCalled();
  });
});
