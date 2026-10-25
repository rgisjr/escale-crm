import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TabelaDeContatos } from "@/components/escale/contatos/TabelaDeContatos";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import { COLUNAS_PADRAO } from "@/lib/escale/contatos/regras";

const hookDeConversa = vi.fn(() => ({ iniciarConversa: vi.fn(), abrindo: false, seletor: null }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/channels/SeletorDeCanalParaConversa", () => ({
  useConversaNovaComEscolhaDeCanal: () => hookDeConversa(),
}));
vi.mock("@/components/tags/CoresDasEtiquetas", () => ({ useCorDaEtiqueta: () => null }));

const linha = (id: string): LinhaDeContato => ({
  id, nome: `Contato ${id}`, display_name: null, telefone: "+5564999446816", email: null, instagram: null, tags: [],
  tem_foto: false, conversa_id: null, negocios: 0, negocio_unico: null, status: "ativo", ultima_atividade: null,
  criado_em: "2026-10-01T10:00:00Z", origem: "manual", nascimento: null, links: {}, campos: {}, empresa: null,
});

/** Q3 (G3-13): o hook de conversa e as consultas do ⋮ não se multiplicam por linha. */
describe("TabelaDeContatos leve", () => {
  it("100 linhas: um hook de conversa só e nenhuma consulta criada pelo ⋮ antes de abrir", () => {
    const qc = new QueryClient();
    const linhas = Array.from({ length: 100 }, (_, i) => linha(`c${i}`));
    render(
      <QueryClientProvider client={qc}>
        <TabelaDeContatos
          linhas={linhas}
          colunas={COLUNAS_PADRAO}
          carregando={false}
          erro={false}
          aoTentarDeNovo={vi.fn()}
          podeVerNegocios
          podeExcluir
          aoAdicionarNegocio={vi.fn()}
        />
      </QueryClientProvider>,
    );
    expect(hookDeConversa).toHaveBeenCalledTimes(1);
    expect(qc.getQueryCache().getAll()).toHaveLength(0);
  });
});
