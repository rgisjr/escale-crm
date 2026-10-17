import { describe, expect, it } from "vitest";

import { traduzir } from "@/lib/i18n/dicionario";

/**
 * O espanhol da Escale OS fala de "tú" ("Alcanzaste el límite", "Desfija algo"),
 * nunca de "usted" ("Ábrala", "guarde"). As frases acrescentadas na Task 15 da
 * Fase 1E seguem o mesmo registro dos vizinhos.
 */
describe("o espanhol da Fase 1E usa o registro de tú", () => {
  it("a preferência que mudou em outra aba pede 'ábrela' e 'guarda', não 'ábrala' e 'guarde'", () => {
    const texto = traduzir("A preferência mudou em outra aba. Abra de novo e salve.", "es");
    expect(texto).toBe("La preferencia cambió en otra pestaña. Ábrela de nuevo y guarda.");
    expect(texto).not.toMatch(/Ábrala|guarde/);
  });

  it("origem não encontrada tem tradução própria e sem 'usted'", () => {
    const texto = traduzir("Origem não encontrada.", "es");
    expect(texto).not.toBe("Origem não encontrada.");
    expect(texto).not.toMatch(/usted/i);
  });
});
