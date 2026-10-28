/**
 * Só para testes: troca os `$n` de uma consulta parametrizada por literais SQL, para rodar o SQL do
 * tradutor de Indicadores pelo `psql` do harness de banco. Nunca use isto fora de teste.
 */
function literal(valor: unknown): string {
  if (valor === null || valor === undefined) return "null";
  if (Array.isArray(valor)) return valor.length ? `array[${valor.map(literal).join(",")}]` : "'{}'";
  if (typeof valor === "number") return String(valor);
  if (typeof valor === "boolean") return valor ? "true" : "false";
  return `'${String(valor).replaceAll("'", "''")}'`;
}

export function inlinar(text: string, values: readonly unknown[]): string {
  // De trás para a frente, para `$10` não virar `$1` seguido de `0`.
  let saida = text;
  for (let n = values.length; n >= 1; n -= 1) {
    saida = saida.replaceAll(new RegExp(String.raw`\$${n}(?!\d)`, "g"), () => literal(values[n - 1]));
  }
  return saida;
}
