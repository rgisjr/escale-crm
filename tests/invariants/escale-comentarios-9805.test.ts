import { beforeAll, describe, expect, it } from "vitest";

import { GOV_ORG, lastLine, seedGov, sql } from "./gov-helpers";

/**
 * LGPD DOS COMENTÁRIOS (fork Escale, migration 9805) — prova contra Postgres real: na virada de
 * `is_anonymized` o autor, o texto e o que a automação escreveu para a pessoa são redigidos; a linha
 * (desfecho, motivo, datas) fica. Roda via `pnpm test:db`.
 */
const ID = (sufixo: string) => `e5ca1e00-9805-4000-8000-${sufixo.padStart(12, "0")}`;
const REGRA = ID("a1");
const TITULAR = ID("c1");
const OUTRO = ID("c2");
const ACOES = `[{"type":"send_instagram_message","config":{}}]`;

const campo = (tabela: string, contato: string, coluna: string): string =>
  lastLine(sql(`select coalesce(${coluna}::text, 'NULO') from public.${tabela} where contact_id = '${contato}' limit 1;`));

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.escale_acoes_no_comentario where contact_id in ('${TITULAR}', '${OUTRO}');
    delete from public.escale_disparos_de_comentario where rule_id = '${REGRA}';
    delete from public.automation_rules where id = '${REGRA}';
    delete from public.contacts where id in ('${TITULAR}', '${OUTRO}');
    insert into public.automation_rules (id, organization_id, name, trigger_event, trigger_config, conditions, actions, is_active)
      values ('${REGRA}', '${GOV_ORG}', 'Regra 9805', 'comment.received', '{}', '[]', '${ACOES}', true);
    insert into public.contacts (id, organization_id, display_name, phone_number, tags, custom_fields, last_activity_at) values
      ('${TITULAR}', '${GOV_ORG}', 'Titular Nove', '+5564999440001', '{}', '{}'::jsonb, now()),
      ('${OUTRO}', '${GOV_ORG}', 'Outro Nove', '+5564999440002', '{}', '{}'::jsonb, now());
    insert into public.escale_disparos_de_comentario
      (organization_id, rule_id, contact_id, caminho_id, plataforma, comentario_id, publicacao_id, autor_id, autor_usuario, autor_nome, texto, comentado_em, resposta_publicada, direct, motivo, direct_pendente)
    values
      ('${GOV_ORG}', '${REGRA}', '${TITULAR}', 'q', 'instagram', 'c9805-1', 'p-1', 'ig-titular', 'titular_ig', 'Titular Nove', 'meu telefone é 64 99944-0001', now(), 'Oi Titular!', 'aguardando_seguir', 'x', '{"texto":"Oi Titular"}'::jsonb),
      ('${GOV_ORG}', '${REGRA}', '${OUTRO}', 'q', 'instagram', 'c9805-2', 'p-1', 'ig-outro', 'outro_ig', 'Outro Nove', 'quero o link', now(), 'Oi Outro!', 'enviado', null, null);
    insert into public.escale_acoes_no_comentario
      (organization_id, plataforma, comentario_id, publicacao_id, autor_id, acao, status, texto, contact_id)
    values
      ('${GOV_ORG}', 'instagram', 'c9805-1', 'p-1', 'ig-titular', 'direct', 'feito', 'texto mandado à mão', '${TITULAR}'),
      ('${GOV_ORG}', 'instagram', 'c9805-2', 'p-1', 'ig-outro', 'resposta', 'feito', 'outra resposta', '${OUTRO}');
  `);
});

describe("anonimizar o contato", () => {
  it("a função do gatilho é definer, fechada e o gatilho está em contacts", () => {
    expect(
      lastLine(sql(`select prosecdef::text from pg_proc where proname = 'fn_escale_redigir_comentarios_do_contato';`)),
    ).toBe("true");
    expect(
      lastLine(sql(`select count(*) from pg_trigger where tgname = 'trg_escale_redigir_comentarios_ao_anonimizar' and not tgisinternal;`)),
    ).toBe("1");
    expect(
      lastLine(sql(`select has_function_privilege('authenticated', 'public.fn_escale_redigir_comentarios_do_contato()', 'execute')::text;`)),
    ).toBe("false");
  });

  it("antes da virada nada muda", () => {
    expect(campo("escale_disparos_de_comentario", TITULAR, "texto")).toBe("meu telefone é 64 99944-0001");
  });

  it("na virada, redige o autor e o texto do titular e deixa a trilha e as linhas dos outros", () => {
    sql(`select public.fn_lgpd_cascade_redact_contact('${GOV_ORG}', '${TITULAR}', gen_random_uuid());`);
    const t = "escale_disparos_de_comentario";
    expect(campo(t, TITULAR, "texto")).toBe("(anonimizado)");
    expect(campo(t, TITULAR, "autor_nome")).toBe("NULO");
    expect(campo(t, TITULAR, "autor_usuario")).toBe("NULO");
    expect(campo(t, TITULAR, "autor_id")).toBe("anonimizado");
    expect(campo(t, TITULAR, "resposta_publicada")).toBe("NULO");
    expect(campo(t, TITULAR, "direct_pendente")).toBe("NULO");
    expect(campo(t, TITULAR, "direct")).toBe("aguardando_seguir");
    expect(campo(t, TITULAR, "motivo")).toBe("x");
    const a = "escale_acoes_no_comentario";
    expect(campo(a, TITULAR, "texto")).toBe("NULO");
    expect(campo(a, TITULAR, "autor_id")).toBe("NULO");
    expect(campo(a, TITULAR, "acao")).toBe("direct");
    // O outro contato não foi tocado.
    expect(campo(t, OUTRO, "texto")).toBe("quero o link");
    expect(campo(t, OUTRO, "autor_nome")).toBe("Outro Nove");
    expect(campo(a, OUTRO, "texto")).toBe("outra resposta");
  });
});
