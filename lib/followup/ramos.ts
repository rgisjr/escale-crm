import { z } from "zod";

/** Saída de escape, escrita como `{ type: "always" }` na aresta. */
export const FALLBACK_BRANCH_ID = "else";
export const NO_REPLY_BRANCH_ID = "no_reply";
export const CONDITION_TRUE_BRANCH_ID = "true";
export const CONDITION_FALSE_BRANCH_ID = "false";
export const REPEAT_BODY_BRANCH_ID = "body";
export const REPEAT_DONE_BRANCH_ID = "done";

export const RESERVED_BRANCH_IDS = [
  FALLBACK_BRANCH_ID,
  NO_REPLY_BRANCH_ID,
  CONDITION_TRUE_BRANCH_ID,
  CONDITION_FALSE_BRANCH_ID,
  REPEAT_BODY_BRANCH_ID,
  REPEAT_DONE_BRANCH_ID,
] as const;

export const declaredBranchIdSchema = z
  .string()
  .min(1)
  .max(64)
  .refine((id) => !(RESERVED_BRANCH_IDS as readonly string[]).includes(id), {
    message: `branch id is reserved: ${RESERVED_BRANCH_IDS.join(", ")}`,
  });

export const edgeBranchIdSchema = z
  .string()
  .min(1)
  .max(64)
  .refine((id) => id !== FALLBACK_BRANCH_ID, {
    message: `the fallback branch "${FALLBACK_BRANCH_ID}" is spelled { type: 'always' } on an edge`,
  });
