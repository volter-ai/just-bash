// Modified by Volter for VO-3806/F6 (2026-11-01): keep shell hashes with
// their effective PATH/cwd, rather than a process-wide pathname cache.
import type { InterpreterState } from "./types.js";

export function hasTemporaryPath(state: InterpreterState): boolean {
  // The binding stack retains an enclosing prefix after a nested command
  // removes its own temporary-export marker for the same variable.
  return (
    (state.tempExportedVars?.has("PATH") ?? false) ||
    (state.tempEnvBindings?.some((binding) => binding.has("PATH")) ?? false)
  );
}

export function forgetCommandHashesOnPathAssignment(
  state: InterpreterState,
  name: string,
): void {
  if (name === "PATH" && !hasTemporaryPath(state)) state.hashTable?.clear();
}

export function discardStaleCommandHashes(state: InterpreterState): void {
  // A prefix PATH selects only this invocation; it must not retire the
  // enclosing shell's hashes or replace them with the temporary lookup.
  if (hasTemporaryPath(state)) return;
  const pathEnv = state.env.get("PATH");
  for (const [name, entry] of state.hashTable ?? []) {
    if (
      entry.pathEnv !== pathEnv ||
      (entry.cwd !== undefined && entry.cwd !== state.cwd)
    ) {
      state.hashTable?.delete(name);
    }
  }
}

export function rememberCommandHash(
  state: InterpreterState,
  name: string,
  path: string,
  explicit = false,
): void {
  const pathEnv = state.env.get("PATH");
  const relativePath = (pathEnv ?? "/usr/bin:/bin")
    .split(":")
    .some((directory) => !directory.startsWith("/"));
  state.hashTable ??= new Map();
  state.hashTable.set(name, {
    path,
    pathEnv,
    // hash -p deliberately selects a pathname independently of PATH search.
    cwd: !explicit && relativePath ? state.cwd : undefined,
  });
}
