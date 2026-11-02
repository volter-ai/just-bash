# Volter source correction receipt

This candidate implements tabnode ADR-0007 for VO-3806
`t_c656e6fd`, task `t_07fc0d39`, Substrate Articles 6 and 9.

Upstream is <https://github.com/vercel-labs/just-bash> at
`2bbbfaf8cc769109361ba29b55f5647a43988b14`, package root
`packages/just-bash/`, attested for npm `just-bash@2.14.5` by
<https://registry.npmjs.org/-/npm/v1/attestations/just-bash@2.14.5>.
The registry tarball is
<https://registry.npmjs.org/just-bash/-/just-bash-2.14.5.tgz>, with integrity
`sha512-MCBGnRlDeZ/MM7mcw+ZuSGFMBsggajrmKz6e/hrOAN7syvVZkjiY+Vh2wyCwN/CdcnAX5SxbiQB51n5nrQuX+g==`.
The owned source fork is <https://github.com/volter-ai/just-bash>.
Upstream history, Apache-2.0 `LICENSE`, and existing notices remain in place.
Modified source files identify Volter's change and its date.

The generic callback receives the executable path already chosen by the
shell, literal arguments, and its ordinary guarded `CommandContext`. The
supplier does not classify Node or other shebangs, scan PATH again, or name
applications. Returning undefined retains the original script executor.

Source owners:

- `src/types.ts`, `src/index.ts`, `src/browser.ts`: one public callback type.
- `src/Bash.ts`, interpreter options/context: carry that callback into each
  interpreter, including nested executions using the same shell.
- `src/interpreter/command-context.ts`: the existing command context,
  effective stdin, exported environment, defense and error policy, shared by
  registered commands and the script callback. Only a registered command's
  existing trusted flag may request the existing trusted-host bypass.
- `Interpreter.executeUserScript`: invoke the optional callback before the
  existing script reader/parser, after ordinary resolution. The source and
  redirection paths do not invoke it.

Command hashes belong to their shell. Each remembered entry carries its
effective PATH and, for automatic relative/empty-PATH lookup, cwd. A temporary
PATH or `command -p` lookup bypasses ordinary hashes. Explicit `hash -p`
entries keep their pathname semantics across cwd changes. Subshells, command
substitutions and pipeline segments copy and restore their command hashes
alongside their existing environment boundary; a newly executed shell starts
with no inherited hashes. The implementation is in `command-hash.ts`, the
resolver/dispatch and the existing state-copy doors.

The packaging source names the owned package
`@volter/just-bash@2.14.5-volter.0`, retains the upstream runtime dependency
ranges and exact lock resolutions, and owns an isolated production
build/archive recipe in `dev/release/`. Generated `dist/source-receipt.json`
identifies the actual packaging head and build inputs in each candidate.
No installed dependency or generated upstream bundle is patched.
Tabnode owns the Node launch policy and product observations.

The fork's Actions are disabled. The root release command prepares a
source-built archive locally; publication is a separate authorised command.
The exact source-built tarball, declarations, licence inclusion, dependency closure,
keys sweep and manager publication authorisation are required before the
separate local npm publication described in `dev/release/README.md`.
