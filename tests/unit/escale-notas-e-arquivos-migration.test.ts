import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * NOTAS E ARQUIVOS DA FICHA (fork Escale, migration 9008): a migration e o bloco
 * do baseline são o MESMO SQL, e o bloco mora depois do bloco 9007 e antes do da 0323.
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261023120000_9008_notas_e_arquivos.sql";
const MIGRATION_9007 = "supabase/migrations/20261022120000_9007_configuracoes_da_origem.sql";
const CABECALHO = "-- ---- FORK ESCALE · notas e arquivos da ficha (migration 9008) ----";

const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");

describe("notas e arquivos: migration 9008 e bloco do baseline", () => {
  it("a migration existe e se descreve na primeira linha", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).startsWith("-- manifest: ")).toBe(true);
  });

  it("o conteúdo da migration aparece no baseline sem uma única diferença, depois da 9007 e antes da 0323", () => {
    const migration = ler(MIGRATION);
    const baseline = ler("supabase/baseline.sql");
    expect(migration.length).toBeGreaterThan(3000);
    const de9007 = baseline.indexOf(ler(MIGRATION_9007));
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(migration);
    const ancora = baseline.indexOf(
      "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----",
    );
    expect(de9007).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(de9007);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("as duas tabelas têm RLS, grants fechados a anon e travas de suporte", () => {
    const sql = ler(MIGRATION);
    for (const tabela of ["crm_notas_do_negocio", "crm_arquivos_do_contato"]) {
      expect(sql).toContain(`alter table public.${tabela} enable row level security;`);
      expect(sql).toContain(`create policy ${tabela}_select on public.${tabela}`);
      expect(sql).toContain(`create policy ${tabela}_insert on public.${tabela}`);
      expect(sql).toContain(`create policy ${tabela}_dono_ou_gerente_write on public.${tabela}`);
      expect(sql).toContain(`revoke all on public.${tabela} from anon;`);
      expect(sql).toContain(
        `grant select, insert, update, delete on public.${tabela} to authenticated;`,
      );
    }
    expect(sql).toContain("perform public.fn_aplicar_travas_de_suporte();");
    expect(sql).toContain("notify pgrst, 'reload schema';");
  });

  it("a nota segue quem vê o negócio (fn_can_view_lead); o arquivo, a organização; escreve agent+ como autor", () => {
    const sql = ler(MIGRATION).replace(/\s+/g, " ");
    expect(sql).toContain("public.fn_can_view_lead(l.organization_id, l.owner_user_id)");
    expect(sql).toContain("public.fn_role_at_least(organization_id, 'agent')");
    expect(sql).toContain("and user_id = auth.uid()");
    expect(sql).toContain("or public.fn_role_at_least(organization_id, 'manager')");
  });

  it("FKs com cascade (negócio, contato e autor) e o índice composto de crm_leads", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain(
      "create unique index if not exists uq_crm_leads_org_id on public.crm_leads (organization_id, id);",
    );
    // A 0611 (que cria o alvo de contacts) mora DEPOIS deste bloco no baseline: a 9008 garante o índice.
    expect(sql).toContain(
      "create unique index if not exists uq_contacts_org_id on public.contacts (organization_id, id);",
    );
    expect(sql).toContain("references public.crm_leads (organization_id, id) on delete cascade");
    expect(sql).toContain("references public.contacts (organization_id, id) on delete cascade");
    expect(sql).toContain(
      "references public.user_organizations (user_id, organization_id) on delete cascade",
    );
  });

  it("nenhuma policy é `for all` (somaria leitura e escrita por OR); a pessoa só edita o texto da nota", () => {
    const sql = ler(MIGRATION);
    expect(sql).not.toMatch(/^\s*for\s+all\b/m);
    expect(sql).toContain("grant update (texto) on public.crm_notas_do_negocio to authenticated;");
    expect(sql).toContain("revoke update on public.crm_arquivos_do_contato from authenticated;");
  });

  it("UPDATE e DELETE da nota repetem a regra de visibilidade do negócio (não dependem do SELECT)", () => {
    const sql = ler(MIGRATION);
    for (const policy of ["dono_ou_gerente_write", "dono_ou_gerente_delete"]) {
      const inicio = sql.indexOf(`create policy crm_notas_do_negocio_${policy} on`);
      expect(inicio).toBeGreaterThan(-1);
      const fim = sql.indexOf(";\n\n", inicio);
      const corpo = sql.slice(inicio, fim);
      expect(corpo).toMatch(/exists \(select 1 from public\.crm_leads l/);
      expect(corpo).toContain("l.organization_id = crm_notas_do_negocio.organization_id");
    }
  });

  it("a autoria e a data são carimbadas pelo banco no INSERT das duas tabelas (trigger, sem HTTP)", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("new.created_at := now();");
    expect(sql).toContain("raw_user_meta_data ->> 'full_name'");
    expect(sql).toContain("auth.uid() is not null");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain(
      "revoke execute on function public.fn_escale_carimbar_autoria() from public, anon, authenticated;",
    );
    for (const tabela of ["crm_notas_do_negocio", "crm_arquivos_do_contato"]) {
      expect(sql).toMatch(
        new RegExp(
          String.raw`create trigger trg_${tabela}_carimbo\s+before insert on public\.${tabela}\s+for each row execute function public\.fn_escale_carimbar_autoria\(\)`,
        ),
      );
    }
    expect(sql).not.toMatch(/net\.http|pg_net|http_post/i);
  });

  it("o caminho do arquivo nasce dentro da pasta da organização, sem `..` e sem citar contact_id", () => {
    const sql = ler(MIGRATION);
    const inicio = sql.indexOf("add constraint crm_arquivos_do_contato_caminho_valido");
    expect(inicio).toBeGreaterThan(-1);
    const constraint = sql.slice(inicio, sql.indexOf(";", inicio));
    expect(constraint).toContain(
      String.raw`check (storage_path like organization_id::text || '/%' and storage_path !~ '\.\.')`,
    );
    expect(constraint).not.toContain("contact_id");
    expect(sql).toMatch(/if not exists \(\s*select 1 from pg_constraint/);
  });

  it("nenhum arquivo do commit carrega o byte de controle 0x08 (backspace)", () => {
    const arquivos = [MIGRATION, "supabase/baseline.sql", __filename.slice(RAIZ.length + 1)];
    for (const caminho of arquivos) {
      expect(ler(caminho).includes(String.fromCharCode(8))).toBe(false);
    }
  });

  it("o bucket é privado, de 50 MB, sem policy de escrita em storage.objects", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("values ('arquivos-do-contato', 'arquivos-do-contato', false, 52428800)");
    expect(sql).not.toMatch(/create policy .* on storage\.objects/);
  });
});
