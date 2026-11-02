# Prepare and publish the owned supplier

VO-3806 `t_c656e6fd` / `t_07fc0d39`, Articles 6/9; tabnode ADR-0007.
The source fork starts at upstream `2bbbfaf8cc769109361ba29b55f5647a43988b14`.
Its package is `@volter/just-bash@2.14.5-volter.0`; upstream's Apache-2.0
licence, notices, authorship and original changelog remain with it.

`pnpm release` only prepares an unpublished archive. Main has no publication
trigger. Inherited workflows and the automatic prepublish test hook have been
retired; repository Actions remain disabled. No CI or test gates a release.

Commit and push source first. Preparation requires a clean source tree and a
new absolute output directory outside the checkout. Set TMPDIR and cache paths
to the output volume when starting it. For the card's current space guards:

```sh
node dev/release/prepare-package.mjs \
  --output /absolute/output/candidate \
  --python-wasm /absolute/exact/python.wasm \
  --minimum-free-mib 25600 \
  --data-root /System/Volumes/Data --minimum-data-free-mib 23028
```

Run the tooling in the background to completion and retain its PID/log. The
recipe reserves 300 MiB above the stated free-space floor before starting,
checks both floors during work and stops its own child process group if a
floor is reached. It never deletes an earlier candidate or writes generated
outputs into the source checkout.

The Python Wasm must match the SHA-256 and size in the source's Git-LFS pointer.
A materialized LFS object or the identical bytes from the attested upstream
2.14.5 archive are valid inputs. No installed JavaScript bundle is copied.

The recipe archives the exact source head, projects the package importer from
the committed pnpm lock, and installs only its normal runtime dependencies,
six locked declaration packages, TypeScript and esbuild. It retains every
selected lock resolution/integrity and isolates the store, cache, temporary
files and package staging. Workspace examples, root development tooling and
tests are not installed. The optional codec packages provide their normal
declarations, with installation scripts disabled; no native addon is compiled
or executed. They remain external in the bundles and unchanged in the manifest.

The normal source build still emits Node ESM/CJS, browser, CLI and all three
workers with upstream's bundling commands. Its build tsconfig follows those
production entries and their imports, so compilation does not emit test files
or require test tooling. Package exports retain the original two entry points;
the browser condition explicitly pairs its declarations with its bundle.

`artifacts/` holds one exact npm archive. `artifact-receipt.json` records the
source commit, upstream base, complete lock and build-importer digests, build
tools, Node version, Python Wasm identity, archive SHA-256/SHA-512/integrity and
packed inventory. The archive includes `LICENSE`, `VOLTER-SOURCE.md`, the
changelog and `dist/source-receipt.json`. No preparation step publishes it.

Publication is a separate local act. The card's root implementer must retain
the exact-tarball keys sweep (gitleaks rules, custody values and
`@volter/teams/redact`), obtain the manager's explicit npm authorisation naming
that archive/hash/source, and record the existing credential/custody door.
No new sign-in is requested by this recipe. After that authorisation, publish
the retained archive itself with an explicit tag and scripts disabled:

```sh
npm publish /absolute/retained/volter-just-bash-2.14.5-volter.0.tgz \
  --access public --tag latest --ignore-scripts
```

Do not rebuild or repack between the sweep, authorisation and publication.
Read npm's exact version/integrity back and compare with the retained receipt
before the engine changes its final registry alias. No `publish` branch,
release tag, workflow dispatch or publication is part of source preparation.
