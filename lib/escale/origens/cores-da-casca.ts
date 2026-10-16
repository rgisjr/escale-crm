/**
 * AS CORES DOS ÍCONES DE GRUPO NA CASCA NOVA (fork Escale · casca V3).
 *
 * A cor que o gerente escolhe em Customizar é DADO: continua gravada como um
 * dos 8 tons da paleta das etiquetas (`PALETA_DE_ETIQUETAS`, validada por
 * `corValida` na rota e no banco). Na casca nova, o quadradinho do grupo é
 * desenhado com a cor da Clint mais próxima daquele tom. As 22 cores são as do
 * IconPicker da Clint (bundle `A=[...]`, `docs/escale/clint/clint-design-system.md`
 * §3.5). Trocar a tradução muda só a tela: nenhum grupo precisa ser regravado.
 */
export const CORES_DOS_ICONES_DA_CLINT: readonly string[] = [
  "#3D3A6C",
  "#9C3EFF",
  "#B4ADFF",
  "#D96CFF",
  "#263AF1",
  "#83B4FF",
  "#48DEA8",
  "#5BFFC4",
  "#B5846F",
  "#FF4062",
  "#FFA7A7",
  "#FFA959",
  "#FFDFC1",
  "#FFE073",
  "#B9F26B",
  "#9D9D9D",
  "#CECECF",
  "#E6E6E6",
  "#3B7E85",
  "#60C6D0",
  "#DCE4FF",
  "#E9F4FF",
];

/**
 * Tom da paleta → cor da Clint, pelo matiz mais próximo.
 * - Amarelo vira o amarelo "RI" (`#FFE073`), âmbar vira laranja e vermelho vira o vermelho "Credenciados" de 01-010.
 * - Verde-água vira o petróleo, azul vira o azul claro e índigo vira o azul "II" de 01-010.
 * - Roxo vira o violeta "Contabilidade" de 01-010, e cinza vira o `#5A5A5A` do grupo "SAO" (medido em 01-010; não está no IconPicker).
 */
const DA_PALETA_PARA_A_CLINT: Readonly<Record<string, string>> = {
  "#ffe629": "#FFE073",
  "#ffb224": "#FFA959",
  "#cf3716": "#FF4062",
  "#00655a": "#3B7E85",
  "#0091ff": "#83B4FF",
  "#3e63dd": "#263AF1",
  "#ab4aba": "#D96CFF",
  "#6f6f6f": "#5A5A5A",
};

/** A cor da Clint para um tom gravado; tom desconhecido passa como está. */
export function corDoIconeNaCasca(tom: string): string {
  return DA_PALETA_PARA_A_CLINT[tom.toLowerCase()] ?? tom;
}

/** O quadradinho das visualizações ("VA" em 01-014). */
export const COR_DO_ICONE_DA_VISUALIZACAO = "#4A4A4A";
