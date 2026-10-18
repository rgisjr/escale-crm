"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useT } from "@/hooks/i18n/useT";

/** "ENVIAR MENSAGEM DE WHATSAPP" (fork Escale, Fase 1I; P14): o contato está com outra pessoa (texto da Clint). */
export function JanelaDeOutroAtendente({
  aberta,
  nome,
  aoCancelar,
  aoConfirmar,
}: {
  aberta: boolean;
  nome: string;
  aoCancelar: () => void;
  aoConfirmar: () => void;
}) {
  const t = useT();
  return (
    <AlertDialog open={aberta} onOpenChange={(sim) => !sim && aoCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("Enviar mensagem de WhatsApp")}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="grid gap-1">
              <p>
                {t("Este contato está em atendimento com o usuário {nome}").replace("{nome}", nome)}
              </p>
              <p>{t("Você gostaria de assumir o atendimento e enviar a mensagem mesmo assim?")}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
          <AlertDialogAction onClick={aoConfirmar}>{t("Confirmar")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
