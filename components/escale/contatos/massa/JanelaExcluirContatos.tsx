"use client";
import { useState } from "react";

import { CLASSE_DO_CAMPO } from "@/components/escale/filtros/controles";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { useT } from "@/hooks/i18n/useT";
import { CircleX, Trash2, TriangleAlert } from "@/lib/ui/icons-da-casca";

/**
 * A ilustração do topo (print 2b-38). Não temos a imagem da Clint: é a nossa
 * composição de ícones (diferença conhecida, N19).
 */
function IlustracaoDaExclusao() {
  return (
    <div aria-hidden className="flex justify-center">
      <div className="relative grid size-24 place-items-center rounded-full bg-casca-marca-suave">
        <Trash2 size={44} className="text-casca-marca" />
        <span className="absolute right-2 bottom-2 grid size-9 place-items-center rounded-full bg-surface">
          <TriangleAlert size={28} className="fill-current text-casca-alerta" />
        </span>
      </div>
    </div>
  );
}

/**
 * A CONFIRMAÇÃO DE EXCLUIR EM MASSA (Clint `index-B5tmttGQ`, componente `zs`; print
 * 2b-38): a ilustração, o número em negrito, "Ao continuar, eu entendo que:", as
 * linhas com ⓧ vermelho (inclusive "Os negócios associados aos contatos serão
 * excluídos", Q5), "Digite **Excluir** para confirmar." com "Excluir" em vermelho e
 * "Apagar Contatos 🗑" vermelho, que só liga com a palavra certa. A linha da Agenda é
 * nossa (a trava do original continua).
 */
export function JanelaExcluirContatos({
  aberta,
  quantidade,
  enviando,
  aoFechar,
  aoConfirmar,
}: {
  aberta: boolean;
  quantidade: number;
  enviando: boolean;
  aoFechar: () => void;
  aoConfirmar: () => void;
}) {
  const t = useT();
  const [texto, setTexto] = useState("");
  const palavra = t("Excluir");
  const fechar = () => {
    setTexto("");
    aoFechar();
  };
  const linhas = [
    t("A exclusão é irreversível"),
    t("Os negócios associados aos contatos serão excluídos"),
    t("Os chats de WhatsApp e Instagram serão excluídos"),
    t("Contato com compromisso na agenda não é excluído"),
  ];
  return (
    <JanelaDeConfirmacao
      aberta={aberta}
      aoFechar={fechar}
      perigo
      ocupado={enviando}
      rotuloDoConfirmar={t("Apagar Contatos")}
      iconeDoConfirmar={<Trash2 size={14} aria-hidden />}
      desabilitado={texto.trim() !== palavra}
      dica={t("Digite Excluir para confirmar.")}
      aoConfirmar={aoConfirmar}
    >
      <IlustracaoDaExclusao />
      <p className="text-[14px] font-semibold text-casca-texto">
        {quantidade === 1
          ? t("Esta ação excluirá 1 contato selecionado. Deseja Continuar?")
          : t("Esta ação excluirá {n} contatos selecionados. Deseja Continuar?").replace(
              "{n}",
              quantidade.toLocaleString("pt-BR"),
            )}
      </p>
      <p className="text-[12px] font-semibold text-casca-texto">
        {t("Ao continuar, eu entendo que:")}
      </p>
      <ul className="space-y-2">
        {linhas.map((linha) => (
          <li key={linha} className="flex items-center gap-2 text-[12px] text-casca-texto">
            <CircleX size={16} aria-hidden className="shrink-0 text-casca-alerta" />
            {linha}
          </li>
        ))}
      </ul>
      <label className="grid gap-1.5">
        <span className="text-[12px] font-semibold text-casca-texto">
          {t("Digite **Excluir** para confirmar.")
            .split("**")
            .map((parte, i) =>
              i === 1 ? (
                <strong key={i} className="text-casca-alerta">
                  {parte}
                </strong>
              ) : (
                <span key={i}>{parte}</span>
              ),
            )}
        </span>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={t("Digite aqui...")}
          aria-label={t("Confirmação")}
          className={CLASSE_DO_CAMPO}
        />
      </label>
    </JanelaDeConfirmacao>
  );
}
