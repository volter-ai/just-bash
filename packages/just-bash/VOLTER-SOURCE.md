# Volter source correction receipt

This source-only candidate implements tabnode ADR-0007 for VO-3806
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

This source step has no installs, build, typecheck, lint, test, product run,
CI dispatch, package preparation or publication. It retains upstream's
package identity and dependency lock until the separate candidate-package
preparation. No generated output or installed dependency has been patched.
The callback does not implement any interpreter itself; tabnode owns its
Node launch policy and product observations.

The fork's Actions are disabled. Upstream workflow files remain as inherited
source; their triggers, duration and publication behavior are not approved
release tooling for this fork. A later release step must bound or retire
those workflows before enabling any. An exact source-built tarball,
declarations, licence inclusion, dependency closure, keys sweep and manager
publication authorisation are still required before npm publication.
