# just-bash

## Volter source candidate — unreleased

Modified by Volter, 2026-11-01, for VO-3806 `t_c656e6fd` / `t_07fc0d39`,
Substrate Articles 6 and 9; tabnode ADR-0007.

- Add optional `BashOptions.scriptExecutor(resolvedPath, args, context)` with the
  shared public `ScriptExecutor` type in Node and browser entry points. The hook
  runs after the shell selects an executable and before reading/parsing it;
  undefined retains the original script executor. Functions, builtins, source
  and redirection keep their existing paths.
- Share the existing live command context and guarded dispatch between this
  hook and registered commands, retaining cwd/env/exported env, stdin, signal,
  descriptors, limits, defense checks and command error handling. The callback
  grants no trusted-host bypass and is carried into nested shell execution.
- Base: upstream `vercel-labs/just-bash` commit
  `2bbbfaf8cc769109361ba29b55f5647a43988b14`, the source attested for npm 2.14.5.
  No dependency versions, package version, generated bundles or upstream licence
  files change in this source candidate; see `VOLTER-SOURCE.md`.

## 2.14.5

### Patch Changes

- [#214](https://github.com/vercel-labs/just-bash/pull/214) [`da58f4f`](https://github.com/vercel-labs/just-bash/commit/da58f4f523c5e9c1c444106a0f2a7777a59fb618) Thanks [@subsetpark](https://github.com/subsetpark)! - jq: accept control characters inside JSON strings

- [#221](https://github.com/vercel-labs/just-bash/pull/221) [`a835686`](https://github.com/vercel-labs/just-bash/commit/a835686c97f5cac2e5b94bd551d996079a33dfc2) Thanks [@cramforce](https://github.com/cramforce)! - upgrade deps

- [#218](https://github.com/vercel-labs/just-bash/pull/218) [`13d78b2`](https://github.com/vercel-labs/just-bash/commit/13d78b2876d7ac7b6bc3a6eacfa3937bbb79665f) Thanks [@Hazzng](https://github.com/Hazzng)! - grep: 5-123x faster pattern matching via RE2 matcher reuse and literal pre-filter

## 2.14.4

### Patch Changes

- [#206](https://github.com/vercel-labs/just-bash/pull/206) [`6ccc35f`](https://github.com/vercel-labs/just-bash/commit/6ccc35f5a9b5c6f395b145ed2ec7ee71c4862057) Thanks [@subsetpark](https://github.com/subsetpark)! - Fix awk lexer to honor POSIX statement continuation across newlines after `,`,
  `{`, `&&`, `||`, `?`, `:`, `do`, `else`, `if`, and `while`. Previously, a
  multi-line idiom like `printf "%s=%d\n", \n  $1, $2` (comma at end-of-line
  followed by indented args on the next line) failed with `Unexpected token:
NEWLINE` because the lexer emitted a NEWLINE token unconditionally. The
  lexer now suppresses the NEWLINE when it immediately follows one of the
  continuation-allowing tokens, matching POSIX awk.

- [#212](https://github.com/vercel-labs/just-bash/pull/212) [`733c847`](https://github.com/vercel-labs/just-bash/commit/733c84796e3abbd05a25cf67805bf4b030d0b02d) Thanks [@cramforce](https://github.com/cramforce)! - Bug fixes across network, sqlite3, xan, rg, terminal rendering, and CI

## 2.14.3

### Patch Changes

- [#199](https://github.com/vercel-labs/just-bash/pull/199) [`3d11f05`](https://github.com/vercel-labs/just-bash/commit/3d11f05959faa205267a5173b25665c6732fee8b) Thanks [@cramforce](https://github.com/cramforce)! - Internal: convert repository to a pnpm workspace under `packages/just-bash` and adopt Changesets for versioning. No public API changes; `import` paths and the `bin` entries are unchanged.
