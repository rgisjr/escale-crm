/**
 * Baixa um CSV no navegador (fork Escale, Fase 1E). O BOM na frente é o que faz
 * o Excel ler os acentos como UTF-8 — o mesmo cuidado do modelo de importação.
 */
export function baixarCsv(nome: string, conteudo: string): void {
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", conteudo], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
