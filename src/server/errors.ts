/**
 * Domain error carrying a stable code. Public pages translate the code via
 * `errors.<code>` in messages/*.json; the admin panel maps it to Azerbaijani.
 */
export class ServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(code);
    this.name = "ServiceError";
  }
}

export type ActionState<T = Record<string, unknown>> =
  | { status: "idle" }
  | { status: "ok"; data?: T; message?: string }
  | { status: "error"; code: string; fieldErrors?: Record<string, string> };

export const idle: ActionState = { status: "idle" };
