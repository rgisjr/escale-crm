# Paleta de 16 cores e tela de Tags da Clint — plano de implementação

> **Para quem executa:** use `superpowers:executing-plans`, **inline** (decisão do usuário, 18/10: nunca subagent-driven). Os passos usam `- [ ]`.

**Objetivo:** as tags do Escale OS passam a ter as 16 cores da Clint, com fundo e texto mais encorpados e contraste medido, e ganham a tela **Configurações › Tags** igual à da Clint (tabela, busca, filtros, paginação, balões "Adicionar tag" e "Editar" com nome, cor e descrição).

**Arquitetura:** a cor continua morando em `organizations.settings.tags` (entradas `{tag, cor, descricao}`), gravada por função do banco. Na casca, a cor gravada é a **chave** de um dos 16 tons; o chip pinta o par `{fundo, texto}` daquele tom, calculado por medição. Tag sem cor ganha um tom automático pelo nome (determinístico, sem gravar nada — então atendente sem permissão de gerente também vê a cor). Uma função nova (`fn_escale_tag_gravar`, migration 9502) cria a entrada com `criada_em`/`criada_por` e grava cor e descrição; renomear e excluir usam a rota que já existe (`POST /api/v1/tags/vocabulario`).

**Stack:** Next.js 16 + React 19 + TypeScript, Tailwind 4 (tokens `casca-*`), TanStack Query, Supabase (Postgres, RPC), Vitest.

## Restrições globais

- **Igual à Clint** (CLAUDE.md da pasta): estrutura, textos e estados dos prints abaixo. Diferença sem aprovação = tela não pronta.
- **Prints da Clint** (tirados em 27/10/2026, conta do usuário):
  - Tela: `C:\Users\regis\AppData\Local\Temp\claude-chrome-screenshots-ctSOfm\screenshot-1793124503124-0.jpg`
  - Adicionar tag: `C:\Users\regis\AppData\Local\Temp\claude-chrome-screenshots-ctSOfm\screenshot-1793124503125-1.jpg`
  - Menu ⋮ (Editar / Remover): `C:\Users\regis\AppData\Local\Temp\claude-chrome-screenshots-ctSOfm\screenshot-1793124561780-3.jpg`
  - Editar (Nome, Cor 16, Descrição 0/160, lixeira, Cancelar, Atualizar): `C:\Users\regis\AppData\Local\Temp\claude-chrome-screenshots-ctSOfm\screenshot-1793124584460-5.png`
  - **Copiar os quatro para `docs/escale/prints/tags/` no Task 1** (a pasta Temp é limpa).
- **Exceção pedida pelo usuário (27/10):** as cores da Clint são "clarinhas demais". Mantemos os 16 matizes da Clint, mas fundo mais encorpado e texto escuro do mesmo matiz, com **contraste texto/fundo ≥ 4,5 (alvo 5,0)**. "Cuidado para não piorar": nenhum par pode ficar abaixo de 4,5, e a paleta só entra no código depois de o usuário aprovar a amostra (Task 1, passo 6).
- Formatos BR: data `dd/mm/aaaa`.
- Marca: o roxo da Clint (botão "Adicionar tag", página atual da paginação) vira `casca-marca`.
- A casca só vale com o menu do topo (`lerPreferenciaDeMenu(...) === "topo"`); sem ela, a tela antiga de Tags segue intacta.
- Migration do fork: faixa 95xx, próximo número **9502**; arquivo em `supabase/migrations/` + apêndice no `supabase/baseline.sql` + linha `-- manifest:`; função `security definer` com `revoke ... from public, anon`.
- Ordem "executa tudo, testa tudo, publica tudo": durante a execução só o teste da task, typecheck e eslint dos arquivos; `test:db` (9502) e a conferência visual entram na bateria da frente; publicar só no fim.
- Rodar comandos de `wt-bat/` com `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`. Branch nova a partir de `escale-crm/main`; PR para `rgisjr/escale-crm`.

## Mapa de arquivos

| Arquivo | Papel |
|---|---|
| `lib/escale/tags/paleta.ts` (novo) | Os 16 tons `{chave, nome, fundo, texto}`, a troca dos 8 tons antigos, `tomDaTag(cor, tag)` e `chaveAutomatica(tag)` |
| `lib/escale/quadro/aparencia.ts` | `coresDaTag(cor, tag?)` passa a usar a paleta nova |
| `docs/escale/amostras/paleta-de-tags.html` (novo) | Amostra lado a lado (hoje × nova) para o usuário aprovar |
| `components/escale/quadro/PecasDoCard.tsx` | `ChipDaTag` aceita `className` e passa o nome para a cor automática |
| `components/escale/negocio/TagsDaFicha.tsx`, `conversas/configuracoes/canais/TagsDaCondicao.tsx`, `conversas/fila/LinhaDaFila.tsx` | Trocar `ChipDeEtiqueta` (paleta do Deskcomm) por `ChipDaTag`; opções do seletor da ficha como etiquetas |
| `supabase/migrations/20261129120000_9502_tags_da_casca.sql` (novo) + `supabase/baseline.sql` | `fn_escale_tag_gravar` |
| `tests/invariants/escale-tags-9502.test.ts` (novo) | Prova a função contra Postgres |
| `lib/escale/tags/schema.ts` (novo) | Zod do corpo da rota |
| `app/api/v1/escale/tags/route.ts` (novo) | `POST` gravar (criar / cor / descrição) |
| `lib/escale/tags/tela.ts` (novo) | Linhas da tabela, busca, filtros e paginação (puro) |
| `hooks/escale/useTagsDaCasca.ts` (novo) | Gravar, renomear e remover, invalidando cores e vocabulário |
| `components/escale/configuracoes/tags/SeletorDeCorDaCasca.tsx` (novo) | As 16 bolinhas |
| `components/escale/configuracoes/tags/BalaoNovaTag.tsx` (novo) | "Nome" + "Cancelar"/"Criar" |
| `components/escale/configuracoes/tags/BalaoEditarTag.tsx` (novo) | Nome, Cor, Descrição, lixeira, "Cancelar"/"Atualizar" |
| `components/escale/configuracoes/tags/TelaDeTags.tsx` (novo) | A tela |
| `app/app/settings/tags/page.tsx` | Com a casca, renderiza `TelaDeTags` |

---

### Task 1: Paleta de 16 tons medida + amostra para aprovação

**Arquivos:**
- Criar: `lib/escale/tags/paleta.ts`
- Modificar: `lib/escale/quadro/aparencia.ts` (bloco `TAG_DA_CLINT` / `TAG_PADRAO` / `coresDaTag`, linhas ~123–138)
- Criar: `docs/escale/amostras/paleta-de-tags.html`, `docs/escale/prints/tags/*.png|jpg`
- Teste: `tests/unit/escale-paleta-de-tags.test.ts`; ajustar `tests/unit/escale-regras-da-casca.test.ts:138-142`

**Interfaces:**
- Produz: `type TomDeTag = { chave: string; nome: string; fundo: string; texto: string }`; `PALETA_DA_CASCA: readonly TomDeTag[]` (16, na ordem da Clint: fileira 1 = 8 primeiros); `TOM_ANTIGO: Readonly<Record<string,string>>`; `chaveAutomatica(tag: string): string`; `tomDaTag(cor: string | null | undefined, tag?: string): TomDeTag`; `coresDaTag(cor, tag?) => { fundo: string; texto: string }`.

Valores medidos em 27/10 (OKLCH: fundo L 0,87 com croma = ½ da base, teto 0,11; texto do mesmo matiz, croma ≤ 0,16, a luz desce até contraste ≥ 5,0). Chaves = as cores da Clint (Material 500):

| # | Nome | Chave | Fundo | Texto | Contraste |
|---|---|---|---|---|---|
| 1 | Rosa | `#e91e63` | `#ffc1ca` | `#9c1f44` | 5,10 |
| 2 | Vermelho | `#f44336` | `#ffc4ba` | `#9e231b` | 5,11 |
| 3 | Laranja-escuro | `#ff5722` | `#ffc5b4` | `#9c2a00` | 5,06 |
| 4 | Laranja | `#ff9800` | `#fdc998` | `#7b4700` | 5,10 |
| 5 | Âmbar | `#ffc107` | `#eed092` | `#6d5000` | 5,03 |
| 6 | Verde-claro | `#8bc34a` | `#c2e0a8` | `#3c6000` | 5,07 |
| 7 | Verde | `#4caf50` | `#b4e3b3` | `#006512` | 5,08 |
| 8 | Verde-água | `#009688` | `#aee0d8` | `#006258` | 5,00 |
| 9 | Roxo | `#9c27b0` | `#f5bdff` | `#7e308c` | 5,06 |
| 10 | Roxo-escuro | `#673ab7` | `#d7ccff` | `#613ea6` | 5,08 |
| 11 | Índigo | `#3f51b5` | `#c5d3ff` | `#3a4baf` | 5,04 |
| 12 | Azul | `#2196f3` | `#b3d9ff` | `#005896` | 5,04 |
| 13 | Azul-claro | `#03a9f4` | `#a9dcff` | `#005a85` | 5,13 |
| 14 | Ciano | `#00bcd4` | `#a4e0ec` | `#005f6c` | 5,06 |
| 15 | Cinza-azulado | `#607d8b` | `#c8d7df` | `#3d5866` | 5,11 |
| 16 | Marrom | `#795548` | `#e4cfc7` | `#6f4b3f` | 5,10 |

**Limite conhecido (declarar na amostra):** com 16 matizes no mesmo nível de luz, alguns vizinhos ficam parecidos (Vermelho × Laranja-escuro: ΔE OKLab 0,009; Roxo-escuro × Índigo colapsam sob dicromacia). A Clint tem o mesmo limite. O nome da tag continua sendo a informação; a cor é reforço (doutrina de `lib/tags/cor-da-etiqueta.ts`).

- [ ] **Passo 1: Copiar os prints da Clint**

```bash
mkdir -p docs/escale/prints/tags
cp "/c/Users/regis/AppData/Local/Temp/claude-chrome-screenshots-ctSOfm/screenshot-1793124503124-0.jpg" docs/escale/prints/tags/01-tela.jpg
cp "/c/Users/regis/AppData/Local/Temp/claude-chrome-screenshots-ctSOfm/screenshot-1793124503125-1.jpg" docs/escale/prints/tags/02-adicionar.jpg
cp "/c/Users/regis/AppData/Local/Temp/claude-chrome-screenshots-ctSOfm/screenshot-1793124561780-3.jpg" docs/escale/prints/tags/03-menu.jpg
cp "/c/Users/regis/AppData/Local/Temp/claude-chrome-screenshots-ctSOfm/screenshot-1793124584460-5.png" docs/escale/prints/tags/04-editar.png
```

Se algum não existir mais, tirar de novo em `https://app.useclint.com/settings/tags` (Chrome; abrir e **cancelar**, nunca salvar).

- [ ] **Passo 2: Escrever o teste que falha** — `tests/unit/escale-paleta-de-tags.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { razaoDeContraste } from "@/lib/branding/contraste";
import {
  PALETA_DA_CASCA,
  TOM_ANTIGO,
  chaveAutomatica,
  tomDaTag,
} from "@/lib/escale/tags/paleta";

describe("a paleta de 16 tons da casca", () => {
  it("tem 16 tons com chaves e nomes únicos", () => {
    expect(PALETA_DA_CASCA).toHaveLength(16);
    expect(new Set(PALETA_DA_CASCA.map((t) => t.chave)).size).toBe(16);
    expect(new Set(PALETA_DA_CASCA.map((t) => t.nome)).size).toBe(16);
  });

  it.each(PALETA_DA_CASCA.map((t) => [t.nome, t] as const))(
    "%s: texto sobre o fundo passa de 4,5",
    (_nome, tom) => {
      expect(razaoDeContraste(tom.texto, tom.fundo)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("os 8 tons antigos viram um dos 16", () => {
    const chaves = new Set(PALETA_DA_CASCA.map((t) => t.chave));
    expect(Object.keys(TOM_ANTIGO)).toHaveLength(8);
    for (const nova of Object.values(TOM_ANTIGO)) expect(chaves.has(nova)).toBe(true);
    expect(tomDaTag("#CF3716").nome).toBe("Vermelho");
  });

  it("tag sem cor ganha um tom fixo pelo nome, igual em toda tela", () => {
    expect(chaveAutomatica("VIP ")).toBe(chaveAutomatica("vip"));
    expect(tomDaTag(null, "vip").chave).toBe(chaveAutomatica("vip"));
    const usados = new Set(["a", "b", "c", "d", "e", "f", "g", "h"].map(chaveAutomatica));
    expect(usados.size).toBeGreaterThan(3);
  });

  it("cor desconhecida ou inválida cai no automático, nunca quebra", () => {
    expect(tomDaTag("#123456", "vip").chave).toBe(chaveAutomatica("vip"));
    expect(tomDaTag("lixo", "vip").chave).toBe(chaveAutomatica("vip"));
    expect(tomDaTag(null).chave).toBe(PALETA_DA_CASCA[11]!.chave);
  });
});
```

- [ ] **Passo 3: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-paleta-de-tags.test.ts`
Esperado: FAIL — `Cannot find module '@/lib/escale/tags/paleta'`.

- [ ] **Passo 4: Implementar** — `lib/escale/tags/paleta.ts`

```ts
import { chaveDaEtiqueta, normalizarCorDeEtiqueta } from "@/lib/tags/cor-da-etiqueta";

/**
 * AS 16 CORES DAS TAGS NA CASCA (fork Escale; prints em docs/escale/prints/tags).
 *
 * Os matizes são os da Clint (a CHAVE gravada em `settings.tags[].cor`), mas o
 * par do chip é nosso: a Clint é clara demais (pedido do usuário, 27/10). Fundo
 * em OKLCH L 0,87 com metade da croma da base (teto 0,11); texto do mesmo matiz,
 * escurecido até o contraste chegar a 5,0. O teste cobra ≥ 4,5 em todos.
 * Tag sem cor ganha um tom pelo nome — determinístico e sem gravar nada.
 */
export type TomDeTag = { chave: string; nome: string; fundo: string; texto: string };

export const PALETA_DA_CASCA: readonly TomDeTag[] = [
  { chave: "#e91e63", nome: "Rosa", fundo: "#ffc1ca", texto: "#9c1f44" },
  { chave: "#f44336", nome: "Vermelho", fundo: "#ffc4ba", texto: "#9e231b" },
  { chave: "#ff5722", nome: "Laranja-escuro", fundo: "#ffc5b4", texto: "#9c2a00" },
  { chave: "#ff9800", nome: "Laranja", fundo: "#fdc998", texto: "#7b4700" },
  { chave: "#ffc107", nome: "Âmbar", fundo: "#eed092", texto: "#6d5000" },
  { chave: "#8bc34a", nome: "Verde-claro", fundo: "#c2e0a8", texto: "#3c6000" },
  { chave: "#4caf50", nome: "Verde", fundo: "#b4e3b3", texto: "#006512" },
  { chave: "#009688", nome: "Verde-água", fundo: "#aee0d8", texto: "#006258" },
  { chave: "#9c27b0", nome: "Roxo", fundo: "#f5bdff", texto: "#7e308c" },
  { chave: "#673ab7", nome: "Roxo-escuro", fundo: "#d7ccff", texto: "#613ea6" },
  { chave: "#3f51b5", nome: "Índigo", fundo: "#c5d3ff", texto: "#3a4baf" },
  { chave: "#2196f3", nome: "Azul", fundo: "#b3d9ff", texto: "#005896" },
  { chave: "#03a9f4", nome: "Azul-claro", fundo: "#a9dcff", texto: "#005a85" },
  { chave: "#00bcd4", nome: "Ciano", fundo: "#a4e0ec", texto: "#005f6c" },
  { chave: "#607d8b", nome: "Cinza-azulado", fundo: "#c8d7df", texto: "#3d5866" },
  { chave: "#795548", nome: "Marrom", fundo: "#e4cfc7", texto: "#6f4b3f" },
];

/** Os 8 tons do Deskcomm (lib/tags/cor-da-etiqueta) → o tom mais próximo dos 16. Leitura, sem migration. */
export const TOM_ANTIGO: Readonly<Record<string, string>> = {
  "#ffe629": "#ffc107",
  "#ffb224": "#ff9800",
  "#cf3716": "#f44336",
  "#00655a": "#009688",
  "#0091ff": "#2196f3",
  "#3e63dd": "#3f51b5",
  "#ab4aba": "#9c27b0",
  "#6f6f6f": "#607d8b",
};

const POR_CHAVE = new Map(PALETA_DA_CASCA.map((t) => [t.chave, t]));
/** Sem cor e sem nome: o Azul (o padrão que a casca já usava). */
const PADRAO = PALETA_DA_CASCA[11]!;

/** O tom automático de uma tag sem cor: sempre o mesmo para o mesmo nome. */
export function chaveAutomatica(tag: string): string {
  let soma = 0;
  for (const ch of chaveDaEtiqueta(tag)) soma = (soma * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETA_DA_CASCA[soma % PALETA_DA_CASCA.length]!.chave;
}

export function tomDaTag(cor: string | null | undefined, tag?: string): TomDeTag {
  const normalizada = normalizarCorDeEtiqueta(cor);
  const chave = normalizada ? (TOM_ANTIGO[normalizada] ?? normalizada) : null;
  const gravado = chave ? POR_CHAVE.get(chave) : undefined;
  if (gravado) return gravado;
  return tag ? POR_CHAVE.get(chaveAutomatica(tag))! : PADRAO;
}
```

Atenção: `normalizarCorDeEtiqueta` troca `#cf3716`/`#00655a` antigos? Não — ela troca `#12a594`→`#00655a` e `#e54d2e`→`#cf3716`, e o `TOM_ANTIGO` pega o resultado. Os dois caminhos chegam ao tom certo.

Em `lib/escale/quadro/aparencia.ts`, apagar `TAG_DA_CLINT` e `TAG_PADRAO` e trocar `coresDaTag` por:

```ts
/** O par do chip (fundo, texto) do tom da tag: os 16 da Clint, medidos (lib/escale/tags/paleta). */
export function coresDaTag(cor: string | null | undefined, tag?: string): { fundo: string; texto: string } {
  const { fundo, texto } = tomDaTag(cor, tag);
  return { fundo, texto };
}
```

com `import { tomDaTag } from "@/lib/escale/tags/paleta";` no topo.

Em `tests/unit/escale-regras-da-casca.test.ts`, trocar o caso das linhas 138–142 por:

```ts
  it("os tons antigos viram os 16 da casca; sem cor e sem nome é o Azul", () => {
    expect(coresDaTag("#cf3716")).toEqual({ fundo: "#ffc4ba", texto: "#9e231b" });
    expect(coresDaTag("#3E63DD")).toEqual({ fundo: "#c5d3ff", texto: "#3a4baf" });
    expect(coresDaTag(null)).toEqual({ fundo: "#b3d9ff", texto: "#005896" });
  });
```

- [ ] **Passo 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-paleta-de-tags.test.ts tests/unit/escale-regras-da-casca.test.ts`
Esperado: PASS.

- [ ] **Passo 6: Amostra para o usuário aprovar (PARAR aqui até o "pode")**

Criar `docs/escale/amostras/paleta-de-tags.html`: uma página estática com três colunas por tom (nome; **hoje** = o par antigo de `TAG_DA_CLINT` quando o tom tinha um, senão "—"; **nova** = chip com `fundo`/`texto` da tabela) e o contraste de cada par, sobre dois fundos de tela (`#ffffff` e o `#f7f8fc` da raia da casca), chips com o mesmo tamanho do `ChipDaTag` (altura 15px, fonte 10px, raio cheio) e um bloco "Etiquetas parecidas" listando Vermelho × Laranja-escuro e Roxo-escuro × Índigo. Abrir no Chrome (`file:///…/paleta-de-tags.html`), tirar o print, mostrar ao usuário e **parar**. Ajuste pedido (mais claro/escuro) = mudar L do fundo e recalcular com o script de medição (`node_modules/.bin/tsx`, usando `oklchParaHex` e `razaoDeContraste`), atualizar a tabela, o teste e a amostra; só seguir com aprovação.

- [ ] **Passo 7: Typecheck, eslint e commit**

```bash
NODE_OPTIONS=--max-old-space-size=10000 corepack pnpm typecheck
corepack pnpm eslint lib/escale/tags/paleta.ts lib/escale/quadro/aparencia.ts tests/unit/escale-paleta-de-tags.test.ts tests/unit/escale-regras-da-casca.test.ts
git add lib/escale/tags/paleta.ts lib/escale/quadro/aparencia.ts tests/unit/escale-paleta-de-tags.test.ts tests/unit/escale-regras-da-casca.test.ts docs/escale/amostras docs/escale/prints/tags
git commit -m "feat(escale): paleta de 16 cores das tags, com contraste medido"
```

---

### Task 2: Chip único da casca, com cor automática

**Arquivos:**
- Modificar: `components/escale/quadro/PecasDoCard.tsx:62-72` (`ChipDaTag`)
- Modificar: `components/escale/negocio/TagsDaFicha.tsx` (chips do cabeçalho e opções da lista), `components/escale/conversas/configuracoes/canais/TagsDaCondicao.tsx:45,84`, `components/escale/conversas/fila/LinhaDaFila.tsx:184`
- Teste: `tests/unit/escale-chip-da-tag.test.tsx`

**Interfaces:**
- Consome: `coresDaTag(cor, tag?)` (Task 1).
- Produz: `ChipDaTag({ tag, className? }: { tag: string; className?: string })`.

- [ ] **Passo 1: Teste que falha** — `tests/unit/escale-chip-da-tag.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import { tomDaTag } from "@/lib/escale/tags/paleta";

describe("ChipDaTag", () => {
  it("tag sem cor gravada sai no tom automático do nome", () => {
    render(<ChipDaTag tag="vip" />);
    const tom = tomDaTag(null, "vip");
    const chip = screen.getByText("vip");
    expect(chip).toHaveStyle({ backgroundColor: tom.fundo, color: tom.texto });
  });

  it("aceita className para o tamanho de cada lugar", () => {
    render(<ChipDaTag tag="vip" className="h-5 text-[11px]" />);
    expect(screen.getByText("vip").className).toContain("h-5");
  });
});
```

(Fora do `ProvedorDeCoresDasEtiquetas` o mapa é vazio — `useCorDaEtiqueta` devolve `undefined` —, então o caso mede o automático.)

- [ ] **Passo 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-chip-da-tag.test.tsx`
Esperado: FAIL — fundo `#b3d9ff` (o padrão) em vez do tom do nome; `className` ignorado.

- [ ] **Passo 3: Implementar** — em `PecasDoCard.tsx`:

```tsx
export function ChipDaTag({ tag, className }: { tag: string; className?: string }) {
  const { fundo, texto } = coresDaTag(useCorDaEtiqueta(tag), tag);
  return (
    <span
      className={cn(
        "inline-flex h-[15px] max-w-36 items-center truncate rounded-full px-2 text-[10px] leading-none",
        className,
      )}
      style={{ backgroundColor: fundo, color: texto }}
    >
      {tag}
    </span>
  );
}
```

(importar `cn` de `@/lib/utils` se o arquivo ainda não importa.)

Trocar `ChipDeEtiqueta` por `ChipDaTag` (import `@/components/escale/quadro/PecasDoCard`, mesmo `tag` e o mesmo `className`) em `TagsDaFicha.tsx:134`, `TagsDaCondicao.tsx:45` e `:84`, `LinhaDaFila.tsx:184`; remover o import de `ChipDeEtiqueta` desses arquivos. Em `TagsDaFicha.tsx`, dentro do botão de cada opção do `faltam.map`, trocar `{tag}` por `<ChipDaTag tag={tag} />` (como no print da Clint, as opções são etiquetas). `SecaoTags.tsx` (ponto colorido do filtro) fica como está — é o `PontoDaEtiqueta`, outro componente.

- [ ] **Passo 4: Rodar o teste novo e os vizinhos**

Run: `corepack pnpm vitest run tests/unit/escale-chip-da-tag.test.tsx tests/unit/escale-ficha-nome-e-tags.test.tsx tests/unit/escale-criar-tag-nos-seletores.test.tsx tests/unit/escale-selecao-e-massa-da-fila.test.tsx`
Esperado: PASS. Se um teste da ficha procurava o texto da opção por `getByRole("option", { name })`, o nome continua o mesmo (o chip tem o texto da tag).

- [ ] **Passo 5: Typecheck, eslint e commit**

```bash
NODE_OPTIONS=--max-old-space-size=10000 corepack pnpm typecheck
corepack pnpm eslint components/escale/quadro/PecasDoCard.tsx components/escale/negocio/TagsDaFicha.tsx components/escale/conversas/configuracoes/canais/TagsDaCondicao.tsx components/escale/conversas/fila/LinhaDaFila.tsx tests/unit/escale-chip-da-tag.test.tsx
git add -A components/escale tests/unit/escale-chip-da-tag.test.tsx
git commit -m "feat(escale): chip único das tags na casca, com cor automática pelo nome"
```

---

### Task 3: Banco — `fn_escale_tag_gravar` (migration 9502)

**Arquivos:**
- Criar: `supabase/migrations/20261129120000_9502_tags_da_casca.sql`
- Modificar: `supabase/baseline.sql` (apêndice no fim, depois do bloco `migration 9501`)
- Teste: `tests/invariants/escale-tags-9502.test.ts`

**Interfaces:**
- Produz: `public.fn_escale_tag_gravar(p_org uuid, p_tag text, p_cor text, p_descricao text) returns jsonb` — devolve a entrada gravada `{tag, cor?, descricao?, criada_em?, criada_por?}`. Erros: `42501` sem ser gerente; `22023` tag vazia/>40, cor fora de `#rrggbb`, descrição > 160. Cor e descrição são **definidas** (null apaga); `criada_em`/`criada_por` só nascem quando a entrada é nova.

- [ ] **Passo 1: Conferir o número** — `corepack pnpm checar:colisao-de-migration` depois de criar o arquivo; se 9502 estiver tomado, usar o próximo livre e trocar em todo o plano.

- [ ] **Passo 2: Teste que falha** — `tests/invariants/escale-tags-9502.test.ts`

```ts
import { beforeAll, describe, expect, it } from "vitest";

import { GOV_AGENT_A, GOV_MANAGER, GOV_ORG, lastLine, seedGov, sql } from "./gov-helpers";

/** MIGRATION 9502 (fork Escale): gravar tag da casca (cor, descrição, quem criou). Roda via `pnpm test:db`. */
function gravarComo(usuario: string, tag: string, cor: string | null, descricao: string | null): string {
  const lit = (v: string | null) => (v === null ? "null" : `'${v.replace(/'/g, "''")}'`);
  return lastLine(
    sql(`
      set role authenticated;
      select set_config('request.jwt.claims', '{"sub":"${usuario}"}', false);
      select public.fn_escale_tag_gravar('${GOV_ORG}', ${lit(tag)}, ${lit(cor)}, ${lit(descricao)})::text;
    `),
  );
}
const entrada = (tag: string) =>
  sql(`select e::text from public.organizations o, jsonb_array_elements(o.settings->'tags') e
       where o.id = '${GOV_ORG}' and jsonb_typeof(e) = 'object' and e->>'tag' = '${tag}';`);

beforeAll(() => {
  seedGov();
  sql(`update public.organizations set settings = jsonb_set(coalesce(settings,'{}'::jsonb), '{tags}', '["antiga"]'::jsonb) where id = '${GOV_ORG}';`);
});

describe("fn_escale_tag_gravar (9502)", () => {
  it("cria a tag com cor, quem criou e quando", () => {
    const r = JSON.parse(gravarComo(GOV_MANAGER, " Nova9502 ", "#E91E63", null));
    expect(r.tag).toBe("nova9502");
    expect(r.cor).toBe("#e91e63");
    expect(r.criada_por).toBe(GOV_MANAGER);
    expect(r.criada_em).toBeTruthy();
  });

  it("editar troca cor e descrição e preserva quem criou", () => {
    gravarComo(GOV_MANAGER, "nova9502", "#4caf50", "Leads quentes");
    const e = JSON.parse(entrada("nova9502"));
    expect(e.cor).toBe("#4caf50");
    expect(e.descricao).toBe("Leads quentes");
    expect(e.criada_por).toBe(GOV_MANAGER);
    gravarComo(GOV_MANAGER, "nova9502", "#4caf50", null);
    expect(JSON.parse(entrada("nova9502")).descricao).toBeUndefined();
  });

  it("entrada antiga em texto vira objeto, sem duplicar", () => {
    gravarComo(GOV_MANAGER, "antiga", "#795548", null);
    const total = sql(`select count(*) from public.organizations o, jsonb_array_elements(o.settings->'tags') e
      where o.id = '${GOV_ORG}' and (e #>> '{}' = 'antiga' or e->>'tag' = 'antiga');`);
    expect(total).toBe("1");
  });

  it("atendente não grava; valores inválidos são recusados", () => {
    expect(() => gravarComo(GOV_AGENT_A, "x9502", null, null)).toThrow(/sem permissão/);
    expect(() => gravarComo(GOV_MANAGER, "x9502", "azul", null)).toThrow(/cor_invalida/);
    expect(() => gravarComo(GOV_MANAGER, "x9502", null, "a".repeat(161))).toThrow(/descricao_longa/);
    expect(() => gravarComo(GOV_MANAGER, "   ", null, null)).toThrow(/tag_invalida/);
  });

  it("anon não executa a função", () => {
    expect(
      sql(`select has_function_privilege('anon', 'public.fn_escale_tag_gravar(uuid,text,text,text)', 'execute');`),
    ).toBe("f");
  });
});
```

Se `lastLine` não for exportado com esse nome em `tests/invariants/gov-helpers.ts`, usar o que estiver lá (hoje: `export function lastLine(out: string): string`, linha 46).

- [ ] **Passo 3: Migration** — `supabase/migrations/20261129120000_9502_tags_da_casca.sql`

```sql
-- manifest: **Tags da casca (fork Escale).** `fn_escale_tag_gravar(p_org, p_tag, p_cor, p_descricao)` cria ou atualiza a entrada da tag em `organizations.settings.tags`: define cor (`#rrggbb`, null apaga) e descrição (≤160, null apaga); entrada nova ganha `criada_em` e `criada_por` (a tela de Tags da Clint mostra os dois). Entrada antiga em texto vira objeto sem duplicar. Portão: gerente (`fn_role_at_least`). Security definer, revogada de public e anon. Aditiva e idempotente; sem backfill.
-- ---- FORK ESCALE · Tags da casca (migration 9502) ----
create or replace function public.fn_escale_tag_gravar(
  p_org uuid,
  p_tag text,
  p_cor text,
  p_descricao text
)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public, pg_temp
as $$
declare
  v_tag text := lower(btrim(coalesce(p_tag, '')));
  v_cor text := nullif(lower(btrim(coalesce(p_cor, ''))), '');
  v_desc text := nullif(btrim(coalesce(p_descricao, '')), '');
  v_lista jsonb;
  v_nova jsonb := '[]'::jsonb;
  v_item jsonb;
  v_entrada jsonb;
  v_achou boolean := false;
begin
  if not public.fn_role_at_least(p_org, 'manager') then
    raise exception 'sem permissão para mudar as tags' using errcode = '42501';
  end if;
  if v_tag = '' or length(v_tag) > 40 then
    raise exception 'tag_invalida' using errcode = '22023';
  end if;
  if v_cor is not null and v_cor !~ '^#[0-9a-f]{6}$' then
    raise exception 'cor_invalida' using errcode = '22023';
  end if;
  if v_desc is not null and length(v_desc) > 160 then
    raise exception 'descricao_longa' using errcode = '22023';
  end if;

  select case when jsonb_typeof(o.settings -> 'tags') = 'array' then o.settings -> 'tags' else '[]'::jsonb end
    into v_lista
    from public.organizations o
   where o.id = p_org
   for update;
  if not found then
    raise exception 'organizacao_inexistente' using errcode = 'P0002';
  end if;

  for v_item in select value from jsonb_array_elements(v_lista) loop
    if (jsonb_typeof(v_item) = 'string' and lower(btrim(v_item #>> '{}')) = v_tag)
       or (jsonb_typeof(v_item) = 'object' and lower(btrim(coalesce(v_item ->> 'tag', ''))) = v_tag) then
      if not v_achou then
        v_entrada := case when jsonb_typeof(v_item) = 'object' then v_item else jsonb_build_object('tag', v_tag) end;
        v_entrada := (v_entrada - 'cor' - 'descricao')
          || jsonb_strip_nulls(jsonb_build_object('cor', v_cor, 'descricao', v_desc));
        v_nova := v_nova || jsonb_build_array(v_entrada);
      end if;
      v_achou := true;
    else
      v_nova := v_nova || jsonb_build_array(v_item);
    end if;
  end loop;

  if not v_achou then
    v_entrada := jsonb_strip_nulls(jsonb_build_object(
      'tag', v_tag, 'cor', v_cor, 'descricao', v_desc,
      'criada_em', now(), 'criada_por', auth.uid()
    ));
    v_nova := v_nova || jsonb_build_array(v_entrada);
  end if;

  update public.organizations o
     set settings = jsonb_set(coalesce(o.settings, '{}'::jsonb), '{tags}', v_nova)
   where o.id = p_org;
  return v_entrada;
end;
$$;

revoke execute on function public.fn_escale_tag_gravar(uuid, text, text, text) from public, anon;
grant execute on function public.fn_escale_tag_gravar(uuid, text, text, text) to authenticated, service_role;

notify pgrst, 'reload schema';
```

- [ ] **Passo 4: Apêndice no baseline** — colar o MESMO corpo (sem a linha `-- manifest:`) no fim de `supabase/baseline.sql`, depois do bloco `-- ---- FORK ESCALE · Frente V: variáveis do modelo de mensagem (migration 9501) ----` e antes de qualquer varredura final de `anon` (ver memória "Ordem dos blocos no baseline"). Conferir: `grep -n "migration 9502" supabase/baseline.sql` devolve 1 linha.

- [ ] **Passo 5: Manifest e cercas de migration**

Run: `corepack pnpm vitest run tests/unit/manifest-x-migrations.test.ts tests/unit/baseline-no-piso-do-postgres.test.ts`
Esperado: PASS. O `test:db` deste arquivo (`corepack pnpm test:db tests/invariants/escale-tags-9502.test.ts`) roda na bateria da frente — anotar em `memory` como pendência, como nas fases 2E/2F.

- [ ] **Passo 6: Commit**

```bash
git add supabase/migrations/20261129120000_9502_tags_da_casca.sql supabase/baseline.sql tests/invariants/escale-tags-9502.test.ts
git commit -m "feat(escale): fn_escale_tag_gravar — cor, descrição e quem criou a tag (9502)"
```

---

### Task 4: Rota `POST /api/v1/escale/tags`

**Arquivos:**
- Criar: `lib/escale/tags/schema.ts`, `app/api/v1/escale/tags/route.ts`
- Teste: `tests/unit/escale-tags-rota.test.ts`

**Interfaces:**
- Consome: `fn_escale_tag_gravar` (Task 3).
- Produz: `POST /api/v1/escale/tags` com corpo `{ tag: string; cor: string | null; descricao: string | null }` → `200 { data: EntradaDeTag }`; `422 validation_failed`; `403 forbidden | mfa_required`. `gravarTagSchema` e `type EntradaDeTag = { tag: string; cor?: string; descricao?: string; criada_em?: string; criada_por?: string }`.

- [ ] **Passo 1: Teste que falha** — `tests/unit/escale-tags-rota.test.ts`

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: async () => null }));
vi.mock("@/lib/auth/require-role", () => ({
  requireRole: async () => ({ ok: true, user: { id: "u1" }, org: { orgId: "o1" } }),
}));
vi.mock("@/lib/auth/server", () => ({ mfaEmDivida: async () => false }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));

import { POST } from "@/app/api/v1/escale/tags/route";

const pedir = (corpo: unknown) =>
  POST(new Request("http://x/api/v1/escale/tags", { method: "POST", body: JSON.stringify(corpo) }) as never);

beforeEach(() => rpc.mockReset());

describe("POST /api/v1/escale/tags", () => {
  it("grava pela função com a organização da sessão", async () => {
    rpc.mockResolvedValue({ data: { tag: "vip", cor: "#e91e63" }, error: null });
    const r = await pedir({ tag: "VIP", cor: "#E91E63", descricao: null });
    expect(r.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("fn_escale_tag_gravar", {
      p_org: "o1", p_tag: "vip", p_cor: "#e91e63", p_descricao: null,
    });
  });

  it("recusa descrição acima de 160 e cor fora de #rrggbb", async () => {
    expect((await pedir({ tag: "vip", cor: null, descricao: "a".repeat(161) })).status).toBe(422);
    expect((await pedir({ tag: "vip", cor: "azul", descricao: null })).status).toBe(422);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("42501 do banco vira 403", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    expect((await pedir({ tag: "vip", cor: null, descricao: null })).status).toBe(403);
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar** — `corepack pnpm vitest run tests/unit/escale-tags-rota.test.ts` → FAIL (módulo não existe).

- [ ] **Passo 3: Implementar**

`lib/escale/tags/schema.ts`:

```ts
import { z } from "zod";

import { normalizarTag, TAMANHO_MAXIMO_DA_TAG } from "@/lib/contacts/tag-normalizada";

export const DESCRICAO_MAX = 160;

/** O corpo do POST /api/v1/escale/tags: cor e descrição são DEFINIDAS (null apaga). */
export const gravarTagSchema = z.object({
  tag: z
    .string()
    .transform(normalizarTag)
    .pipe(z.string().min(1).max(TAMANHO_MAXIMO_DA_TAG)),
  cor: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^#[0-9a-f]{6}$/)
    .nullable(),
  descricao: z
    .string()
    .trim()
    .max(DESCRICAO_MAX)
    .nullable()
    .transform((v) => (v === "" ? null : v)),
});

export type EntradaDeTag = {
  tag: string;
  cor?: string;
  descricao?: string;
  criada_em?: string;
  criada_por?: string;
};
```

`app/api/v1/escale/tags/route.ts`:

```ts
/**
 * POST /api/v1/escale/tags — a tela de Tags da casca (fork Escale): cria a tag
 * ou grava a cor e a descrição dela, pela `fn_escale_tag_gravar` (9502).
 * Renomear e excluir seguem em POST /api/v1/tags/vocabulario.
 */
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { mfaEmDivida } from "@/lib/auth/server";
import { gravarTagSchema, type EntradaDeTag } from "@/lib/escale/tags/schema";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  const denied = await requireSupportWrite();
  if (denied) return denied;
  const requestId = randomUUID();
  const auth = await requireRole("manager", { requestId, resource: "settings_tags" });
  if (!auth.ok) return auth.response;
  if (await mfaEmDivida())
    return fail("mfa_required", "Confirme a verificação em duas etapas.", 403, { requestId });

  const parsed = gravarTagSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail("validation_failed", "Confira o nome, a cor e a descrição.", 422, {
      requestId,
      details: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const { tag, cor, descricao } = parsed.data;

  const db = await createClient();
  const { data, error } = await db.rpc("fn_escale_tag_gravar", {
    p_org: auth.org.orgId,
    p_tag: tag,
    p_cor: cor,
    p_descricao: descricao,
  });
  if (error) {
    if (error.code === "42501")
      return fail("forbidden", "Só um gerente ou administrador muda as tags.", 403, { requestId });
    if (error.code === "22023")
      return fail("validation_failed", "Confira o nome, a cor e a descrição.", 422, { requestId });
    return fail("internal_error", "Não foi possível salvar a tag.", 500, { requestId });
  }

  void audit({
    action: "tag_vocabulary.changed",
    actorUserId: auth.user.id,
    organizationId: auth.org.orgId,
    resourceType: "organization",
    resourceId: auth.org.orgId,
    requestId,
    metadata: { acao: "escale_gravar", tag, cor, descricao },
  });
  return ok(data as EntradaDeTag, { requestId });
}
```

Se o `typecheck` reclamar do nome da função no `rpc` (tipos gerados), seguir o que `app/api/v1/tags/vocabulario/route.ts` faz com `fn_vocabulario_de_tags_operar` (hoje chama direto, sem entrada em `lib/database.types.ts`).

- [ ] **Passo 4: Rodar o teste e as cercas de rota**

Run: `corepack pnpm vitest run tests/unit/escale-tags-rota.test.ts tests/unit/suporte-cobertura-de-efeitos.test.ts`
Esperado: PASS.

- [ ] **Passo 5: Typecheck, eslint e commit**

```bash
NODE_OPTIONS=--max-old-space-size=10000 corepack pnpm typecheck
corepack pnpm eslint lib/escale/tags/schema.ts app/api/v1/escale/tags/route.ts tests/unit/escale-tags-rota.test.ts
git add lib/escale/tags/schema.ts app/api/v1/escale/tags/route.ts tests/unit/escale-tags-rota.test.ts
git commit -m "feat(escale): rota para criar tag e gravar cor e descrição"
```

---

### Task 5: Regras puras da tela (linhas, busca, filtros, paginação)

**Arquivos:**
- Criar: `lib/escale/tags/tela.ts`
- Teste: `tests/unit/escale-tags-tela.test.ts`

**Interfaces:**
- Consome: `LinhaDeVocabulario` de `@/lib/schemas/tags` (`{ tag, uso_em_contatos, uso_em_leads, uso_em_conversas, em_regras, cor, descricao, no_vocabulario }`), `EntradaDeTag` (Task 4).
- Produz:
  - `type LinhaDaTela = { tag: string; cor: string | null; descricao: string | null; emUso: number; criadaEm: string | null; criadaPor: string | null }`
  - `montarLinhas(vocabulario: readonly LinhaDeVocabulario[], settings: unknown): LinhaDaTela[]` — ordem: `criadaEm` mais recente primeiro, depois as sem data em ordem alfabética.
  - `type PeriodoDeCriacao = "todos" | "7" | "30" | "90"`
  - `filtrarLinhas(linhas, { busca: string; periodo: PeriodoDeCriacao; criadaPor: string | "" }, agora: Date): LinhaDaTela[]`
  - `paginar<T>(itens: readonly T[], pagina: number, porPagina: number): T[]`
  - `dataBr(iso: string | null): string` → `"dd/mm/aaaa"` ou `"—"`.

`emUso` = `uso_em_contatos` (a Clint conta contatos; os outros usos ficam fora da coluna).

- [ ] **Passo 1: Teste que falha** — `tests/unit/escale-tags-tela.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { dataBr, filtrarLinhas, montarLinhas, paginar } from "@/lib/escale/tags/tela";

const linha = (tag: string, extra: Record<string, unknown> = {}) => ({
  tag, uso_em_contatos: 1, uso_em_leads: 0, uso_em_conversas: 0, em_regras: 0,
  cor: null, descricao: null, no_vocabulario: true, ...extra,
});
const settings = {
  tags: [
    "velha",
    { tag: "nova", cor: "#e91e63", criada_em: "2026-10-24T10:00:00Z", criada_por: "u1" },
    { tag: "meio", criada_em: "2026-10-10T10:00:00Z", criada_por: "u2" },
  ],
};

describe("tela de Tags", () => {
  it("junta o vocabulário com quem criou e quando, mais nova primeiro", () => {
    const l = montarLinhas([linha("velha"), linha("meio"), linha("nova", { uso_em_contatos: 3 })], settings);
    expect(l.map((x) => x.tag)).toEqual(["nova", "meio", "velha"]);
    expect(l[0]).toMatchObject({ emUso: 3, criadaPor: "u1", criadaEm: "2026-10-24T10:00:00Z" });
    expect(l[2]).toMatchObject({ criadaEm: null, criadaPor: null });
  });

  it("busca sem acento e sem caixa; filtra por período e por quem criou", () => {
    const l = montarLinhas([linha("velha"), linha("meio"), linha("nova")], settings);
    const agora = new Date("2026-10-27T12:00:00Z");
    expect(filtrarLinhas(l, { busca: "NOV", periodo: "todos", criadaPor: "" }, agora).map((x) => x.tag)).toEqual(["nova"]);
    expect(filtrarLinhas(l, { busca: "", periodo: "7", criadaPor: "" }, agora).map((x) => x.tag)).toEqual(["nova"]);
    expect(filtrarLinhas(l, { busca: "", periodo: "todos", criadaPor: "u2" }, agora).map((x) => x.tag)).toEqual(["meio"]);
  });

  it("pagina e formata a data no padrão brasileiro", () => {
    expect(paginar([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
    expect(dataBr("2026-10-24T10:00:00Z")).toBe("24/10/2026");
    expect(dataBr(null)).toBe("—");
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar** — `corepack pnpm vitest run tests/unit/escale-tags-tela.test.ts` → FAIL.

- [ ] **Passo 3: Implementar** — `lib/escale/tags/tela.ts`

```ts
import { chaveDaEtiqueta } from "@/lib/tags/cor-da-etiqueta";
import type { LinhaDeVocabulario } from "@/lib/schemas/tags";

/** Uma linha da tabela de Tags da casca (print docs/escale/prints/tags/01-tela.jpg). */
export type LinhaDaTela = {
  tag: string;
  cor: string | null;
  descricao: string | null;
  emUso: number;
  criadaEm: string | null;
  criadaPor: string | null;
};

export type PeriodoDeCriacao = "todos" | "7" | "30" | "90";

type Origem = { criadaEm: string | null; criadaPor: string | null };

function origens(settings: unknown): Map<string, Origem> {
  const mapa = new Map<string, Origem>();
  const lista = (settings as { tags?: unknown } | null | undefined)?.tags;
  if (!Array.isArray(lista)) return mapa;
  for (const e of lista) {
    if (typeof e !== "object" || e === null) continue;
    const o = e as Record<string, unknown>;
    if (typeof o.tag !== "string") continue;
    mapa.set(chaveDaEtiqueta(o.tag), {
      criadaEm: typeof o.criada_em === "string" ? o.criada_em : null,
      criadaPor: typeof o.criada_por === "string" ? o.criada_por : null,
    });
  }
  return mapa;
}

export function montarLinhas(vocabulario: readonly LinhaDeVocabulario[], settings: unknown): LinhaDaTela[] {
  const quem = origens(settings);
  const linhas = vocabulario.map((v) => {
    const o = quem.get(chaveDaEtiqueta(v.tag)) ?? { criadaEm: null, criadaPor: null };
    return { tag: v.tag, cor: v.cor, descricao: v.descricao, emUso: v.uso_em_contatos, ...o };
  });
  return linhas.sort((a, b) => {
    if (a.criadaEm && b.criadaEm) return b.criadaEm.localeCompare(a.criadaEm);
    if (a.criadaEm) return -1;
    if (b.criadaEm) return 1;
    return a.tag.localeCompare(b.tag, "pt-BR");
  });
}

const semAcento = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const DIA = 86_400_000;

export function filtrarLinhas(
  linhas: readonly LinhaDaTela[],
  filtro: { busca: string; periodo: PeriodoDeCriacao; criadaPor: string },
  agora: Date,
): LinhaDaTela[] {
  const termo = semAcento(filtro.busca.trim());
  const desde = filtro.periodo === "todos" ? null : agora.getTime() - Number(filtro.periodo) * DIA;
  return linhas.filter((l) => {
    if (termo && !semAcento(l.tag).includes(termo)) return false;
    if (desde !== null && (!l.criadaEm || Date.parse(l.criadaEm) < desde)) return false;
    if (filtro.criadaPor && l.criadaPor !== filtro.criadaPor) return false;
    return true;
  });
}

export function paginar<T>(itens: readonly T[], pagina: number, porPagina: number): T[] {
  const inicio = (Math.max(1, pagina) - 1) * porPagina;
  return itens.slice(inicio, inicio + porPagina);
}

export function dataBr(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
```

- [ ] **Passo 4: Rodar e ver passar** — mesmo comando → PASS.

- [ ] **Passo 5: Commit**

```bash
corepack pnpm eslint lib/escale/tags/tela.ts tests/unit/escale-tags-tela.test.ts
git add lib/escale/tags/tela.ts tests/unit/escale-tags-tela.test.ts
git commit -m "feat(escale): regras da tela de Tags (linhas, busca, filtros, paginação)"
```

---

### Task 6: Seletor de cor e balões "Adicionar tag" e "Editar"

**Arquivos:**
- Criar: `hooks/escale/useTagsDaCasca.ts`, `components/escale/configuracoes/tags/SeletorDeCorDaCasca.tsx`, `components/escale/configuracoes/tags/BalaoNovaTag.tsx`, `components/escale/configuracoes/tags/BalaoEditarTag.tsx`
- Teste: `tests/unit/escale-baloes-de-tag.test.tsx`

**Interfaces:**
- Consome: `PALETA_DA_CASCA`, `tomDaTag`, `chaveAutomatica` (Task 1); `POST /api/v1/escale/tags` (Task 4); `POST /api/v1/tags/vocabulario` com `{acao:"renomear", tag, destino, cor:null}` e `{acao:"excluir", tag, destino:null, cor:null}` (já existe); `invalidarCoresDasEtiquetas` (`@/components/tags/CoresDasEtiquetas`); `DESCRICAO_MAX` (Task 4).
- Produz:
  - `useTagsDaCasca(): { gravar(tag: string, cor: string | null, descricao: string | null): Promise<boolean>; renomear(de: string, para: string): Promise<boolean>; remover(tag: string): Promise<boolean> }` — erro vira `toast.error` (mesmos textos de `hooks/tags/useDefinirCorDaEtiqueta.ts`), sucesso invalida `["cores-das-etiquetas"]`, `["tags-da-casca"]` e o vocabulário (`useContactTagVocabulary`) e chama `router.refresh()`.
  - `SeletorDeCorDaCasca({ valor, aoMudar }: { valor: string; aoMudar: (chave: string) => void })`
  - `BalaoNovaTag({ gatilho, existentes }: { gatilho: ReactElement; existentes: readonly string[] })`
  - `BalaoEditarTag({ linha, aberto, aoFechar, ancora }: { linha: LinhaDaTela; aberto: boolean; aoFechar: () => void; ancora: ReactElement })`

Visual (prints 02 e 04): balão branco, borda `casca-borda`, sombra do `PainelSuspenso`, largura 300px, padding 12px. Rótulos "Nome", "Cor", "Descrição" em 13px `casca-texto`. Campo com a bolinha (8px, cor = `texto` do tom) à esquerda dentro do campo, borda `casca-marca` em foco. Cor: 2 fileiras de 8 bolinhas de 20px (cor = `chave`, a cor da Clint), a escolhida com anel branco por dentro e contorno da própria cor (como o Azul-claro no print 04). Descrição: `textarea` fundo `casca-busca`, placeholder "Para que serve esta tag? (opcional)", contador "N/160" à direita embaixo. Rodapé: lixeira vermelha à esquerda (só no Editar), "Cancelar" (contorno) e "Criar"/"Atualizar" (`casca-marca`, apagado até haver mudança).

- [ ] **Passo 1: Teste que falha** — `tests/unit/escale-baloes-de-tag.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const gravar = vi.fn(async () => true);
const renomear = vi.fn(async () => true);
const remover = vi.fn(async () => true);
vi.mock("@/hooks/escale/useTagsDaCasca", () => ({ useTagsDaCasca: () => ({ gravar, renomear, remover }) }));

import { BalaoEditarTag } from "@/components/escale/configuracoes/tags/BalaoEditarTag";
import { BalaoNovaTag } from "@/components/escale/configuracoes/tags/BalaoNovaTag";
import { chaveAutomatica } from "@/lib/escale/tags/paleta";

beforeEach(() => vi.clearAllMocks());

describe("Adicionar tag", () => {
  it("cria com a cor automática do nome", async () => {
    render(<BalaoNovaTag gatilho={<button type="button">Adicionar tag</button>} existentes={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tag" }));
    await userEvent.type(screen.getByPlaceholderText("nome da tag"), "Quente");
    await userEvent.click(screen.getByRole("button", { name: "Criar" }));
    expect(gravar).toHaveBeenCalledWith("quente", chaveAutomatica("quente"), null);
  });

  it("nome que já existe não cria e avisa", async () => {
    render(<BalaoNovaTag gatilho={<button type="button">Adicionar tag</button>} existentes={["quente"]} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tag" }));
    await userEvent.type(screen.getByPlaceholderText("nome da tag"), "Quente");
    expect(screen.getByRole("button", { name: "Criar" })).toBeDisabled();
    expect(screen.getByText("Já existe uma tag com esse nome.")).toBeInTheDocument();
  });
});

describe("Editar tag", () => {
  const linha = { tag: "vip", cor: "#e91e63", descricao: null, emUso: 1, criadaEm: null, criadaPor: null };

  it("troca a cor e a descrição", async () => {
    render(<BalaoEditarTag linha={linha} aberto aoFechar={vi.fn()} ancora={<span />} />);
    await userEvent.click(screen.getByRole("radio", { name: "Verde" }));
    await userEvent.type(screen.getByPlaceholderText("Para que serve esta tag? (opcional)"), "Clientes VIP");
    expect(screen.getByText("12/160")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(renomear).not.toHaveBeenCalled();
    expect(gravar).toHaveBeenCalledWith("vip", "#4caf50", "Clientes VIP");
  });

  it("renomeia antes de gravar quando o nome muda", async () => {
    render(<BalaoEditarTag linha={linha} aberto aoFechar={vi.fn()} ancora={<span />} />);
    const nome = screen.getByRole("textbox", { name: "Nome" });
    await userEvent.clear(nome);
    await userEvent.type(nome, "Cliente VIP");
    await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(renomear).toHaveBeenCalledWith("vip", "cliente vip");
    expect(gravar).toHaveBeenCalledWith("cliente vip", "#e91e63", null);
  });

  it("a lixeira pede confirmação e remove", async () => {
    render(<BalaoEditarTag linha={linha} aberto aoFechar={vi.fn()} ancora={<span />} />);
    await userEvent.click(screen.getByRole("button", { name: "Remover tag" }));
    await userEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(remover).toHaveBeenCalledWith("vip");
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar** — `corepack pnpm vitest run tests/unit/escale-baloes-de-tag.test.tsx` → FAIL.

- [ ] **Passo 3: Implementar o hook** — `hooks/escale/useTagsDaCasca.ts`

```ts
"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { invalidarCoresDasEtiquetas } from "@/components/tags/CoresDasEtiquetas";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";

const ERRO: Record<string, string> = {
  validation_failed: "Confira o nome, a cor e a descrição.",
  forbidden: "Só um gerente ou administrador da organização pode mudar as tags.",
  unauthenticated: "Sua sessão expirou. Entre de novo.",
  mfa_required: "Confirme o segundo fator para mudar as tags.",
};

/** As escritas da tela de Tags da casca. Cada uma devolve `false` quando o servidor recusou (com toast). */
export function useTagsDaCasca() {
  const t = useT();
  const queryClient = useQueryClient();
  const router = useRouter();

  async function enviar(caminho: string, corpo: unknown, sucesso: string): Promise<boolean> {
    try {
      await apiClient.post(caminho, corpo);
      invalidarCoresDasEtiquetas(queryClient);
      void queryClient.invalidateQueries({ queryKey: ["contact-tag-vocabulary"] });
      router.refresh();
      toast.success(t(sucesso));
      return true;
    } catch (erro) {
      const codigo = (erro as { code?: string } | null)?.code ?? "";
      toast.error(t(ERRO[codigo] ?? "Não foi possível concluir agora. Tente de novo."));
      return false;
    }
  }

  return {
    gravar: (tag: string, cor: string | null, descricao: string | null) =>
      enviar("/api/v1/escale/tags", { tag, cor, descricao }, "As alterações foram salvas com sucesso."),
    renomear: (de: string, para: string) =>
      enviar("/api/v1/tags/vocabulario", { acao: "renomear", tag: de, destino: para, cor: null }, "Tag renomeada."),
    remover: (tag: string) =>
      enviar("/api/v1/tags/vocabulario", { acao: "excluir", tag, destino: null, cor: null }, "Tag removida."),
  };
}
```

Antes de escrever, conferir a chave de cache real do vocabulário: `grep -n "queryKey" hooks/contacts/useContactTagVocabulary.ts` e usar a mesma no `invalidateQueries`. Se `renomear` já devolver toast de sucesso duplicado no `Atualizar` (renomear + gravar), passar `""` como texto de sucesso do renomear e pular o toast quando vazio.

- [ ] **Passo 4: Implementar os componentes**

`components/escale/configuracoes/tags/SeletorDeCorDaCasca.tsx`:

```tsx
"use client";
import { useT } from "@/hooks/i18n/useT";
import { PALETA_DA_CASCA } from "@/lib/escale/tags/paleta";
import { cn } from "@/lib/utils";

/** As 16 bolinhas da Clint (print 04): duas fileiras de 8; a escolhida com anel. */
export function SeletorDeCorDaCasca({ valor, aoMudar }: { valor: string; aoMudar: (chave: string) => void }) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t("Cor")} className="grid grid-cols-8 gap-2">
      {PALETA_DA_CASCA.map((tom) => {
        const escolhida = tom.chave === valor;
        return (
          <button
            key={tom.chave}
            type="button"
            role="radio"
            aria-checked={escolhida}
            aria-label={t(tom.nome)}
            title={t(tom.nome)}
            onClick={() => aoMudar(tom.chave)}
            className={cn(
              "size-5 rounded-full outline-offset-2 focus-visible:outline-2 focus-visible:outline-casca-marca",
              escolhida && "ring-2 ring-white ring-inset",
            )}
            style={{ backgroundColor: tom.chave, boxShadow: escolhida ? `0 0 0 2px ${tom.chave}` : undefined }}
          />
        );
      })}
    </div>
  );
}
```

`components/escale/configuracoes/tags/BalaoNovaTag.tsx`:

```tsx
"use client";
import { useState, type ReactElement } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useTagsDaCasca } from "@/hooks/escale/useTagsDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { normalizarTag, TAMANHO_MAXIMO_DA_TAG } from "@/lib/contacts/tag-normalizada";
import { chaveAutomatica, tomDaTag } from "@/lib/escale/tags/paleta";

/** "Adicionar tag" (print 02): Nome com a bolinha da cor automática; Cancelar e Criar. */
export function BalaoNovaTag({ gatilho, existentes }: { gatilho: ReactElement; existentes: readonly string[] }) {
  const t = useT();
  const { gravar } = useTagsDaCasca();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const tag = normalizarTag(nome);
  const repetida = tag !== "" && existentes.some((e) => normalizarTag(e) === tag);
  const ponto = tomDaTag(null, tag || "a").texto;

  function mudar(v: boolean) {
    setAberto(v);
    if (!v) setNome("");
  }
  async function criar() {
    if (!tag || repetida) return;
    setSalvando(true);
    const deu = await gravar(tag, chaveAutomatica(tag), null);
    setSalvando(false);
    if (deu) mudar(false);
  }

  return (
    <Popover open={aberto} onOpenChange={mudar}>
      <PopoverTrigger asChild>{gatilho}</PopoverTrigger>
      <PainelSuspenso align="end" sideOffset={8} className="w-[300px] p-3">
        <label className="block text-[13px] text-casca-texto">
          {t("Nome")}
          <span className="relative mt-2 block">
            <span aria-hidden className="absolute top-1/2 left-3 size-2 -translate-y-1/2 rounded-full" style={{ backgroundColor: ponto }} />
            <input
              autoFocus
              value={nome}
              maxLength={TAMANHO_MAXIMO_DA_TAG}
              placeholder={t("nome da tag")}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void criar();
                }
              }}
              className="h-8 w-full rounded-[4px] border border-casca-marca bg-surface pr-2 pl-7 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
            />
          </span>
        </label>
        {repetida ? (
          <p role="alert" className="mt-1 text-[11px] text-casca-alerta">
            {t("Já existe uma tag com esse nome.")}
          </p>
        ) : null}
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={() => mudar(false)} className="h-7 rounded-[4px] border border-casca-borda px-2.5 text-[12px] text-casca-texto">
            {t("Cancelar")}
          </button>
          <button
            type="button"
            disabled={!tag || repetida || salvando}
            onClick={() => void criar()}
            className="h-7 rounded-[4px] bg-casca-marca px-2.5 text-[12px] font-medium text-white disabled:opacity-50"
          >
            {t("Criar")}
          </button>
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
```

`components/escale/configuracoes/tags/BalaoEditarTag.tsx`:

```tsx
"use client";
import { useState, type ReactElement } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverAnchor } from "@/components/ui/popover";
import { useTagsDaCasca } from "@/hooks/escale/useTagsDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { normalizarTag, TAMANHO_MAXIMO_DA_TAG } from "@/lib/contacts/tag-normalizada";
import { tomDaTag } from "@/lib/escale/tags/paleta";
import { DESCRICAO_MAX } from "@/lib/escale/tags/schema";
import type { LinhaDaTela } from "@/lib/escale/tags/tela";
import { Trash2 } from "@/lib/ui/icons-da-casca";

import { SeletorDeCorDaCasca } from "./SeletorDeCorDaCasca";

/** "Editar" do ⋮ (print 04): Nome, Cor (16), Descrição 0/160, lixeira, Cancelar e Atualizar. */
export function BalaoEditarTag({
  linha,
  aberto,
  aoFechar,
  ancora,
}: {
  linha: LinhaDaTela;
  aberto: boolean;
  aoFechar: () => void;
  ancora: ReactElement;
}) {
  const t = useT();
  const { gravar, renomear, remover } = useTagsDaCasca();
  const [nome, setNome] = useState(linha.tag);
  const [cor, setCor] = useState(tomDaTag(linha.cor, linha.tag).chave);
  const [descricao, setDescricao] = useState(linha.descricao ?? "");
  const [confirmando, setConfirmando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const novoNome = normalizarTag(nome);
  const mudou =
    novoNome !== linha.tag || cor !== tomDaTag(linha.cor, linha.tag).chave || descricao.trim() !== (linha.descricao ?? "");

  async function atualizar() {
    if (!novoNome || !mudou) return;
    setSalvando(true);
    const renomeou = novoNome === linha.tag || (await renomear(linha.tag, novoNome));
    const deu = renomeou && (await gravar(novoNome, cor, descricao.trim() || null));
    setSalvando(false);
    if (deu) aoFechar();
  }

  return (
    <Popover open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <PopoverAnchor asChild>{ancora}</PopoverAnchor>
      <PainelSuspenso align="start" sideOffset={4} className="w-[300px] space-y-3 p-3">
        <label className="block text-[13px] text-casca-texto">
          {t("Nome")}
          <span className="relative mt-2 block">
            <span aria-hidden className="absolute top-1/2 left-3 size-2 -translate-y-1/2 rounded-full" style={{ backgroundColor: cor }} />
            <input
              aria-label={t("Nome")}
              value={nome}
              maxLength={TAMANHO_MAXIMO_DA_TAG}
              onChange={(e) => setNome(e.target.value)}
              className="h-8 w-full rounded-[4px] border border-casca-marca bg-surface pr-2 pl-7 text-[13px] text-casca-texto outline-hidden"
            />
          </span>
        </label>
        <div>
          <p className="mb-2 text-[13px] text-casca-texto">{t("Cor")}</p>
          <SeletorDeCorDaCasca valor={cor} aoMudar={setCor} />
        </div>
        <label className="block text-[13px] text-casca-texto">
          {t("Descrição")}
          <textarea
            value={descricao}
            maxLength={DESCRICAO_MAX}
            placeholder={t("Para que serve esta tag? (opcional)")}
            onChange={(e) => setDescricao(e.target.value)}
            className="mt-2 h-12 w-full resize-none rounded-[4px] bg-casca-busca px-2.5 py-2 text-[12px] text-casca-texto outline-hidden placeholder:text-casca-meta"
          />
          <span className="block text-right text-[11px] text-casca-suave">{`${descricao.length}/${DESCRICAO_MAX}`}</span>
        </label>
        {confirmando ? (
          <div className="flex items-center justify-between gap-2">
            <p role="alert" className="text-[12px] text-casca-texto">{t("Remover esta tag de todos os contatos?")}</p>
            <button type="button" onClick={() => setConfirmando(false)} className="text-[12px] text-casca-texto">
              {t("Cancelar")}
            </button>
            <button
              type="button"
              onClick={async () => (await remover(linha.tag)) && aoFechar()}
              className="h-7 rounded-[4px] bg-casca-alerta px-2.5 text-[12px] font-medium text-white"
            >
              {t("Remover")}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <button type="button" aria-label={t("Remover tag")} onClick={() => setConfirmando(true)} className="text-casca-alerta">
              <Trash2 size={16} aria-hidden />
            </button>
            <span className="flex gap-2">
              <button type="button" onClick={aoFechar} className="h-7 rounded-[4px] border border-casca-borda px-2.5 text-[12px] text-casca-texto">
                {t("Cancelar")}
              </button>
              <button
                type="button"
                disabled={!novoNome || !mudou || salvando}
                onClick={() => void atualizar()}
                className="h-7 rounded-[4px] bg-casca-marca px-2.5 text-[12px] font-medium text-white disabled:opacity-50"
              >
                {t("Atualizar")}
              </button>
            </span>
          </div>
        )}
      </PainelSuspenso>
    </Popover>
  );
}
```

Conferir antes: `grep -n "PopoverAnchor" components/ui/popover.tsx` (se não for exportado, exportar o `PopoverPrimitive.Anchor` do Radix ali, como os outros); `grep -n "casca-alerta" app/globals.css` (o token existe — é usado em `BalaoDoNome`). Textos novos no dicionário: rodar `corepack pnpm vitest run tests/unit/i18n*` e, se cobrar, acrescentar em `lib/i18n/dicionario.ts` as entradas `es` de: "nome da tag", "Já existe uma tag com esse nome.", "Para que serve esta tag? (opcional)", "Remover esta tag de todos os contatos?", "Remover tag", "Tag renomeada.", "Tag removida.", "Confira o nome, a cor e a descrição.", "Só um gerente ou administrador da organização pode mudar as tags.", "Confirme o segundo fator para mudar as tags.", os 16 nomes de cor.

- [ ] **Passo 5: Rodar e ver passar** — `corepack pnpm vitest run tests/unit/escale-baloes-de-tag.test.tsx` → PASS.

- [ ] **Passo 6: Typecheck, eslint e commit**

```bash
NODE_OPTIONS=--max-old-space-size=10000 corepack pnpm typecheck
corepack pnpm eslint hooks/escale/useTagsDaCasca.ts components/escale/configuracoes/tags tests/unit/escale-baloes-de-tag.test.tsx
git add hooks/escale/useTagsDaCasca.ts components/escale/configuracoes/tags tests/unit/escale-baloes-de-tag.test.tsx lib/i18n/dicionario.ts components/ui/popover.tsx
git commit -m "feat(escale): balões Adicionar tag e Editar com as 16 cores"
```

---

### Task 7: A tela de Tags da casca

**Arquivos:**
- Criar: `components/escale/configuracoes/tags/TelaDeTags.tsx`
- Modificar: `app/app/settings/tags/page.tsx`
- Teste: `tests/unit/escale-tela-de-tags.test.tsx`

**Interfaces:**
- Consome: `montarLinhas`, `filtrarLinhas`, `paginar`, `dataBr` (Task 5); `BalaoNovaTag`, `BalaoEditarTag` (Task 6); `ChipDaTag` (Task 2); `PaginacaoDaCasca` (`components/escale/ui/PaginacaoDaCasca.tsx`); `SeletorDaCasca`; `useAssignableMembers` (`{ user_id, full_name }`).
- Produz: `TelaDeTags({ linhas }: { linhas: LinhaDaTela[] })`.

Visual (print 01): título "Tags" 15px semibold e "Tags cadastradas" 13px `casca-suave`, linha divisória. Barra: busca (fundo `casca-busca`, lupa à direita, 320px) à esquerda; à direita "Criada em ⌄", "Criada por ⌄", "N itens" (`casca-suave`) e o botão "Adicionar tag" (`casca-marca`, branco, 32px). Tabela: cabeçalho 10px maiúsculo `casca-suave` com espaçamento — caixa de seleção, TAGS, DESCRIÇÃO, QUANTIDADE EM USO (centro), CRIADA EM, CRIADA POR, AÇÕES; linhas de 48px com divisória; descrição "—" e, no hover da linha, o lápis que abre o Editar; "Criada por" com avatar e nome, ou "—". ⋮ abre menu "Editar" (lápis) e "Remover" (lixeira vermelha). Rodapé: `PaginacaoDaCasca` com 10/20/50 por página.

Filtros: "Criada em" = `SeletorDaCasca` com "Todas as datas", "Últimos 7 dias", "Últimos 30 dias", "Últimos 90 dias"; "Criada por" = `SeletorDaCasca` com "Todos" + membros. **Passo 1 confere o print do filtro da Clint**; se for diferente (calendário de período, por exemplo), parar e mostrar ao usuário antes de seguir.

A caixa de seleção da linha e o "Remover em lote": a Clint mostra a coluna, mas o print não mostra a ação em lote. A coluna entra; ao marcar, aparece "Remover selecionadas" acima da tabela (mesma confirmação do Remover). Se o print da ação em lote da Clint (Passo 1) mostrar outra coisa, seguir o print.

- [ ] **Passo 1: Prints que faltam** — no Chrome, em `https://app.useclint.com/settings/tags`: abrir "Criada em", "Criada por" e marcar uma caixa de seleção; tirar print de cada um (sem salvar nada), copiar para `docs/escale/prints/tags/05-criada-em.png`, `06-criada-por.png`, `07-selecao.png`. Se o Chrome travar na Clint (aconteceu em 27/10), pedir os prints ao usuário.

- [ ] **Passo 2: Teste que falha** — `tests/unit/escale-tela-de-tags.test.tsx`

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/escale/useTagsDaCasca", () => ({
  useTagsDaCasca: () => ({ gravar: vi.fn(), renomear: vi.fn(), remover: vi.fn() }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u1", full_name: "Naiara Zeri" }] }),
}));

import { TelaDeTags } from "@/components/escale/configuracoes/tags/TelaDeTags";

const linhas = Array.from({ length: 12 }, (_, i) => ({
  tag: `tag${String(i).padStart(2, "0")}`,
  cor: null,
  descricao: i === 0 ? "Primeira" : null,
  emUso: i,
  criadaEm: i === 0 ? "2026-10-24T10:00:00Z" : null,
  criadaPor: i === 0 ? "u1" : null,
}));

describe("TelaDeTags", () => {
  it("mostra o cabeçalho da Clint, 10 por página e o total", () => {
    render(<TelaDeTags linhas={linhas} />);
    expect(screen.getByText("Tags cadastradas")).toBeInTheDocument();
    expect(screen.getByText("12 itens")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(11);
    const primeira = screen.getAllByRole("row")[1]!;
    expect(within(primeira).getByText("24/10/2026")).toBeInTheDocument();
    expect(within(primeira).getByText("Naiara Zeri")).toBeInTheDocument();
    expect(within(primeira).getByText("Primeira")).toBeInTheDocument();
  });

  it("a busca filtra e volta para a página 1", async () => {
    render(<TelaDeTags linhas={linhas} />);
    await userEvent.type(screen.getByPlaceholderText("Buscar"), "tag11");
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("1 itens")).toBeInTheDocument();
  });

  it("⋮ abre Editar e Remover", async () => {
    render(<TelaDeTags linhas={linhas} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Ações" })[0]!);
    expect(screen.getByRole("menuitem", { name: "Editar" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Remover" })).toBeInTheDocument();
  });
});
```

(O "1 itens" é o texto da Clint — ela não flexiona; se o print mostrar "1 item", acompanhar.)

- [ ] **Passo 3: Rodar e ver falhar** — `corepack pnpm vitest run tests/unit/escale-tela-de-tags.test.tsx` → FAIL.

- [ ] **Passo 4: Implementar** — `components/escale/configuracoes/tags/TelaDeTags.tsx`

```tsx
"use client";
import { useMemo, useState } from "react";

import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { dataBr, filtrarLinhas, paginar, type LinhaDaTela, type PeriodoDeCriacao } from "@/lib/escale/tags/tela";
import { EllipsisVertical, Pencil, Search, Trash2 } from "@/lib/ui/icons-da-casca";

import { BalaoEditarTag } from "./BalaoEditarTag";
import { BalaoNovaTag } from "./BalaoNovaTag";

const POR_PAGINA = [10, 20, 50] as const;
const CABECALHO = "px-3 text-left text-[10px] font-semibold tracking-[0.08em] text-casca-suave uppercase";

/** CONFIGURAÇÕES › TAGS da casca (prints docs/escale/prints/tags/01 a 07). */
export function TelaDeTags({ linhas }: { linhas: LinhaDaTela[] }) {
  const t = useT();
  const { data: membros = [] } = useAssignableMembers(true);
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoDeCriacao>("todos");
  const [criadaPor, setCriadaPor] = useState("");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [editando, setEditando] = useState<string | null>(null);

  const nomeDe = useMemo(() => new Map(membros.map((m) => [m.user_id, m.full_name?.trim() || t("Sem nome")])), [membros, t]);
  const filtradas = filtrarLinhas(linhas, { busca, periodo, criadaPor }, new Date());
  const visiveis = paginar(filtradas, pagina, porPagina);
  const mudarFiltro = (f: () => void) => {
    f();
    setPagina(1);
  };

  return (
    <div className="flex h-full flex-col px-8 py-6">
      <header className="border-b border-casca-borda pb-4">
        <h1 className="text-[15px] font-semibold text-casca-texto">{t("Tags")}</h1>
        <p className="text-[13px] text-casca-suave">{t("Tags cadastradas")}</p>
      </header>

      <div className="flex items-center justify-between py-5">
        <span className="relative w-[320px]">
          <input
            value={busca}
            placeholder={t("Buscar")}
            onChange={(e) => mudarFiltro(() => setBusca(e.target.value))}
            className="h-8 w-full rounded-[4px] bg-casca-busca pr-8 pl-2.5 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
          />
          <Search size={14} aria-hidden className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave" />
        </span>
        <div className="flex items-center gap-3">
          <SeletorDaCasca
            className="h-8 w-auto bg-transparent"
            aria-label={t("Criada em")}
            valor={periodo === "todos" ? "" : periodo}
            vazio={t("Criada em")}
            opcoes={[
              { valor: "7", rotulo: t("Últimos 7 dias") },
              { valor: "30", rotulo: t("Últimos 30 dias") },
              { valor: "90", rotulo: t("Últimos 90 dias") },
            ]}
            aoMudar={(v) => mudarFiltro(() => setPeriodo((v || "todos") as PeriodoDeCriacao))}
          />
          <SeletorDaCasca
            className="h-8 w-auto bg-transparent"
            aria-label={t("Criada por")}
            valor={criadaPor}
            vazio={t("Criada por")}
            opcoes={membros.map((m) => ({ valor: m.user_id, rotulo: nomeDe.get(m.user_id) ?? "" }))}
            aoMudar={(v) => mudarFiltro(() => setCriadaPor(v))}
          />
          <span className="text-[13px] text-casca-suave">{`${filtradas.length} ${t("itens")}`}</span>
          <BalaoNovaTag
            existentes={linhas.map((l) => l.tag)}
            gatilho={
              <button type="button" className="h-8 rounded-[4px] bg-casca-marca px-4 text-[13px] font-semibold text-white">
                {t("Adicionar tag")}
              </button>
            }
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="h-12 border-b border-casca-borda">
              <th className={CABECALHO}>{t("Tags")}</th>
              <th className={CABECALHO}>{t("Descrição")}</th>
              <th className={`${CABECALHO} text-center`}>{t("Quantidade em uso")}</th>
              <th className={CABECALHO}>{t("Criada em")}</th>
              <th className={CABECALHO}>{t("Criada por")}</th>
              <th className={`${CABECALHO} text-right`}>{t("Ações")}</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((l) => (
              <tr key={l.tag} className="group h-12 border-b border-casca-borda text-[13px] text-casca-texto">
                <td className="px-3">
                  <BalaoEditarTag
                    key={`${l.tag}-${editando === l.tag}`}
                    linha={l}
                    aberto={editando === l.tag}
                    aoFechar={() => setEditando(null)}
                    ancora={<span><ChipDaTag tag={l.tag} className="h-5 px-2 text-[12px]" /></span>}
                  />
                </td>
                <td className="px-3 text-casca-suave">
                  <span className="inline-flex items-center gap-2">
                    {l.descricao ?? "—"}
                    <button
                      type="button"
                      aria-label={t("Editar descrição")}
                      onClick={() => setEditando(l.tag)}
                      className="invisible group-hover:visible"
                    >
                      <Pencil size={13} aria-hidden />
                    </button>
                  </span>
                </td>
                <td className="px-3 text-center">{l.emUso}</td>
                <td className="px-3">{dataBr(l.criadaEm)}</td>
                <td className="px-3">{l.criadaPor ? (nomeDe.get(l.criadaPor) ?? "—") : "—"}</td>
                <td className="px-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger aria-label={t("Ações")} className="grid size-7 place-items-center rounded-[4px] hover:bg-casca-raia">
                      <EllipsisVertical size={16} aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEditando(l.tag)}>
                        <Pencil size={14} aria-hidden />
                        {t("Editar")}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-casca-alerta" onSelect={() => setEditando(l.tag)}>
                        <Trash2 size={14} aria-hidden />
                        {t("Remover")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginacaoDaCasca
        pagina={pagina}
        total={filtradas.length}
        porPagina={porPagina}
        opcoesPorPagina={POR_PAGINA}
        aoMudarPagina={setPagina}
        aoMudarPorPagina={(n) => mudarFiltro(() => setPorPagina(n))}
      />
    </div>
  );
}
```

Ajustes que dependem do Passo 1: a coluna de caixa de seleção e a ação em lote (o teste conta 11 linhas = cabeçalho + 10, e não depende dela); os rótulos dos filtros. O "Remover" do ⋮ abre o mesmo balão do Editar, que tem a confirmação — se o print 03/Clint mostrar uma janela própria de confirmação, trocar por `AlertDialog` como em `TagsDaFicha.tsx`. Conferir antes: `grep -n "EllipsisVertical\|Pencil\|Trash2\|Search" lib/ui/icons-da-casca.ts` (acrescentar o que faltar reexportando do `lucide-react`, como os outros) e `ls components/ui/dropdown-menu.tsx`.

Em `app/app/settings/tags/page.tsx`, logo depois do `redirect("/403")` do papel, ler a preferência e as entradas cruas e desviar para a casca:

```tsx
// ── FORK ESCALE: com a casca, a tela de Tags da Clint ──
if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
  const supabase = await createClient();
  const [{ data: vocab }, { data: org }] = await Promise.all([
    supabase.rpc("fn_vocabulario_de_tags", { p_org: activeOrg.orgId }),
    supabase.from("organizations").select("settings").eq("id", activeOrg.orgId).maybeSingle(),
  ]);
  return <TelaDeTags linhas={montarLinhas((vocab ?? []) as LinhaDeVocabulario[], org?.settings ?? null)} />;
}
// ── fim FORK ESCALE ──
```

com os imports `cookies` (`next/headers`), `TelaDeTags`, `montarLinhas`, `COOKIE_DO_MENU`/`lerPreferenciaDeMenu` (`@/lib/escale/preferencia-de-menu`). Erro na leitura do vocabulário: mostrar o mesmo aviso da tela antiga ("Não foi possível carregar as etiquetas agora. Recarregue a página.") em vez da tabela vazia.

- [ ] **Passo 5: Rodar e ver passar** — `corepack pnpm vitest run tests/unit/escale-tela-de-tags.test.tsx tests/unit/navegacao-completude.test.ts` → PASS.

- [ ] **Passo 6: Typecheck, eslint e commit**

```bash
NODE_OPTIONS=--max-old-space-size=10000 corepack pnpm typecheck
corepack pnpm eslint components/escale/configuracoes/tags app/app/settings/tags/page.tsx tests/unit/escale-tela-de-tags.test.tsx
git add components/escale/configuracoes/tags app/app/settings/tags/page.tsx tests/unit/escale-tela-de-tags.test.tsx docs/escale/prints/tags lib/ui/icons-da-casca.ts lib/i18n/dicionario.ts
git commit -m "feat(escale): tela de Tags da Clint nas Configurações"
```

---

### Task 8: PRs, bateria e entrega

- [ ] **Passo 1:** um PR por task concluída (ou um PR para as Tasks 1–2, um para 3–4, um para 5–7), mergeado na `main` do `rgisjr/escale-crm` ao terminar, com o rodapé de atribuição.
- [ ] **Passo 2 (bateria da frente):** `corepack pnpm test:unit` em segundo plano; `corepack pnpm test:db` e `corepack pnpm test:db:update` (a 9502); um revisor Opus 5.5 para o diff inteiro (migration + rota = código de risco).
- [ ] **Passo 3 (conferência visual):** abrir `/app/settings/tags` com a casca, comparar lado a lado com `docs/escale/prints/tags/01` a `07` e listar por escrito cada diferença; abrir o seletor da ficha (painel das Conversas) e conferir as opções como etiquetas.
- [ ] **Passo 4 (publicar):** tag `vX.Y.Z-escale.N`, release, `backup.sh`, `update.sh --to <tag>` na VPS, conferir 3 containers healthy, `/login` 200, `fn_escale_tag_gravar` existe no banco (só leitura).
