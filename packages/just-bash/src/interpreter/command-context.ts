/**
 * Modified by Volter for VO-3806: share command context and guarded dispatch
 * between registered commands and script executors (2026-11-01).
 */
import { sanitizeErrorMessage } from "../fs/sanitize-error.js";
import { awaitWithDefenseContext } from "../security/defense-context.js";
import {
  DefenseInDepthBox,
  SecurityViolationError,
} from "../security/defense-in-depth-box.js";
import type { CommandContext, ExecResult } from "../types.js";
import { createDefenseAwareCommandContext } from "./defense-aware-command-context.js";
import { ExecutionLimitError } from "./errors.js";
import { getErrorMessage } from "./helpers/errors.js";
import { failure } from "./helpers/result.js";
import type { InterpreterContext } from "./types.js";

/** Build the environment an external program receives, including prefix assignments. */
function buildExportedEnv(ctx: InterpreterContext): Record<string, string> {
  const allExported = new Set<string>();
  if (ctx.state.exportedVars) {
    for (const name of ctx.state.exportedVars) allExported.add(name);
  }
  if (ctx.state.tempExportedVars) {
    for (const name of ctx.state.tempExportedVars) allExported.add(name);
  }

  // Variable names are user-controlled; retain the null-prototype environment.
  const env: Record<string, string> = Object.create(null);
  for (const name of allExported) {
    const value = ctx.state.env.get(name);
    if (value !== undefined) env[name] = value;
  }
  return env;
}

/** The same live execution context for registered commands and selected script interpreters. */
function createCommandContext(
  ctx: InterpreterContext,
  commandName: string,
  stdin: string,
): CommandContext {
  const commandContext: CommandContext = {
    fs: ctx.fs,
    cwd: ctx.state.cwd,
    env: ctx.state.env,
    exportedEnv: buildExportedEnv(ctx),
    stdin: stdin || ctx.state.groupStdin || "",
    limits: ctx.limits,
    exec: ctx.execFn,
    fetch: ctx.fetch,
    getRegisteredCommands: () => Array.from(ctx.commands.keys()),
    sleep: ctx.sleep,
    trace: ctx.trace,
    fileDescriptors: ctx.state.fileDescriptors,
    xpgEcho: ctx.state.shoptOptions.xpg_echo,
    coverage: ctx.coverage,
    signal: ctx.state.signal,
    requireDefenseContext: ctx.requireDefenseContext,
    jsBootstrapCode: ctx.jsBootstrapCode,
  };
  return createDefenseAwareCommandContext(commandContext, commandName);
}

/** Preserve ordinary command defense boundaries and error handling for an extension. */
export async function executeCommandHandler<T extends ExecResult | undefined>(
  ctx: InterpreterContext,
  commandName: string,
  stdin: string,
  execute: (context: CommandContext) => Promise<T>,
  trusted: boolean = false,
): Promise<T | ExecResult> {
  const commandContext = createCommandContext(ctx, commandName, stdin);
  try {
    const runCommand = (): Promise<T> =>
      awaitWithDefenseContext(
        ctx.requireDefenseContext,
        "command",
        `${commandName} execution`,
        () => execute(commandContext),
      );

    if (trusted) {
      // Only registered commands can request the existing trusted-host bypass.
      return await DefenseInDepthBox.runTrustedAsync(() => runCommand());
    }
    return await runCommand();
  } catch (error) {
    if (
      error instanceof ExecutionLimitError ||
      error instanceof SecurityViolationError
    ) {
      throw error;
    }
    return failure(
      `${commandName}: ${sanitizeErrorMessage(getErrorMessage(error))}\n`,
    );
  }
}
