/**
 * Command Resolution
 *
 * Handles PATH-based command resolution and lookup for external commands.
 * Modified by Volter for VO-3806/F6 (2026-11-01): qualify command hashes by PATH/cwd.
 */

import type { IFileSystem } from "../fs/interface.js";
import type { Command, CommandRegistry } from "../types.js";
import { discardStaleCommandHashes, hasTemporaryPath } from "./command-hash.js";
import type { InterpreterState } from "./types.js";

/**
 * Context needed for command resolution
 */
export interface CommandResolutionContext {
  fs: IFileSystem;
  state: InterpreterState;
  commands: CommandRegistry;
}

/**
 * Result type for command resolution
 */
export type ResolveCommandResult =
  | { cmd: Command; path: string }
  | { script: true; path: string }
  | { error: "not_found" | "permission_denied"; path?: string }
  | null;

/** Classify the selected file identically for explicit, hashed and PATH lookup. */
async function resolveExecutableFile(
  ctx: CommandResolutionContext,
  path: string,
): Promise<NonNullable<ResolveCommandResult>> {
  if (!(await ctx.fs.exists(path))) return { error: "not_found", path };
  try {
    const stat = await ctx.fs.stat(path);
    if (stat.isDirectory) return { error: "permission_denied", path };
    const name = path.split("/").pop() || "";
    // Only the supplier's system stub paths select registered handlers. A
    // user executable with the same basename remains a script on every use,
    // including an explicit path or hash -p association.
    if (path === `/bin/${name}` || path === `/usr/bin/${name}`) {
      const cmd = ctx.commands.get(name);
      if (cmd) return { cmd, path };
    }
    return (stat.mode & 0o111) !== 0
      ? { script: true, path }
      : { error: "permission_denied", path };
  } catch {
    return { error: "not_found", path };
  }
}

/**
 * Resolve a command name to its implementation via PATH lookup.
 * Returns the command and its resolved path, or null if not found.
 *
 * Resolution order:
 * 1. If command contains "/", resolve as a path
 * 2. Search PATH directories for the command file
 * 3. Fall back to registry lookup (for non-InMemoryFs filesystems like OverlayFs)
 */
export async function resolveCommand(
  ctx: CommandResolutionContext,
  commandName: string,
  pathOverride?: string,
): Promise<ResolveCommandResult> {
  // If command contains "/", it's a path - resolve directly
  if (commandName.includes("/")) {
    const resolvedPath = ctx.fs.resolvePath(ctx.state.cwd, commandName);
    return resolveExecutableFile(ctx, resolvedPath);
  }

  // Explicit/default or temporary PATH lookups must neither use nor retire
  // hashes belonging to the enclosing shell's ordinary PATH.
  if (pathOverride === undefined && !hasTemporaryPath(ctx.state)) {
    discardStaleCommandHashes(ctx.state);
    const cached = ctx.state.hashTable?.get(commandName);
    if (cached) {
      const cachedPath = ctx.fs.resolvePath(ctx.state.cwd, cached.path);
      const resolved = await resolveExecutableFile(ctx, cachedPath);
      if (!("error" in resolved)) return resolved;
      // A missing or no-longer-executable hash cannot survive a fresh search.
      ctx.state.hashTable?.delete(commandName);
    }
  }

  // Search PATH directories (use override if provided, for command -p)
  const pathEnv = pathOverride ?? ctx.state.env.get("PATH") ?? "/usr/bin:/bin";
  const pathDirs = pathEnv.split(":");

  for (const dir of pathDirs) {
    // Resolve relative PATH directories against cwd
    const resolvedDir = dir.startsWith("/")
      ? dir
      : ctx.fs.resolvePath(ctx.state.cwd, dir || ".");
    const fullPath = ctx.fs.resolvePath(resolvedDir, commandName);
    const resolved = await resolveExecutableFile(ctx, fullPath);
    if (!("error" in resolved)) return resolved;
  }

  // Fallback: check registry directly only if /usr/bin doesn't exist
  // This maintains backward compatibility for OverlayFs and other non-InMemoryFs
  // where command stubs aren't created, while still respecting PATH for InMemoryFs
  const usrBinExists = await ctx.fs.exists("/usr/bin");
  if (!usrBinExists) {
    const cmd = ctx.commands.get(commandName);
    if (cmd) {
      return { cmd, path: `/usr/bin/${commandName}` };
    }
  }

  return null;
}

/**
 * Find all paths for a command in PATH (for `which -a`).
 */
export async function findCommandInPath(
  ctx: CommandResolutionContext,
  commandName: string,
): Promise<string[]> {
  const paths: string[] = [];

  // If command contains /, it's a path - check if it exists and is executable
  if (commandName.includes("/")) {
    const resolvedPath = ctx.fs.resolvePath(ctx.state.cwd, commandName);
    if (await ctx.fs.exists(resolvedPath)) {
      try {
        const stat = await ctx.fs.stat(resolvedPath);
        if (!stat.isDirectory) {
          // Check if file is executable (owner, group, or other execute bit set)
          const isExecutable = (stat.mode & 0o111) !== 0;
          if (isExecutable) {
            // Return the original path format (not resolved) to match bash behavior
            paths.push(commandName);
          }
        }
      } catch {
        // If stat fails, skip
      }
    }
    return paths;
  }

  const pathEnv = ctx.state.env.get("PATH") ?? "/usr/bin:/bin";
  const pathDirs = pathEnv.split(":");

  for (const dir of pathDirs) {
    // Resolve relative PATH entries relative to cwd
    const resolvedDir = dir.startsWith("/")
      ? dir
      : ctx.fs.resolvePath(ctx.state.cwd, dir || ".");
    const fullPath = `${resolvedDir}/${commandName}`;
    if (await ctx.fs.exists(fullPath)) {
      // Check if it's a directory - skip directories
      try {
        const stat = await ctx.fs.stat(fullPath);
        if (stat.isDirectory) {
          continue;
        }
      } catch {
        continue;
      }
      // Return the original path format (relative if relative was given)
      paths.push(dir.startsWith("/") ? fullPath : `${dir || "."}/${commandName}`);
    }
  }

  return paths;
}
