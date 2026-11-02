# ADR-0001: Build the optional Python payload from retained source

Status: Proposed. No replacement recipe, download or build is authorised by
this record until its plan review passes.

Card: VO-3806 `t_c656e6fd`, supplier task `t_07fc0d39`.
Substrate Articles 5, 6 and 9. Proposed 2026-11-01.

## Cause and established inputs

The fork starts at upstream just-bash
`2bbbfaf8cc769109361ba29b55f5647a43988b14`. Its optional Python command loads
three inherited generated files under `packages/just-bash/vendor/cpython-emscripten/`:

| File | Bytes | SHA-256 |
|---|---:|---|
| `python.cjs` | 108,476 | `b45f414d674fafeeefbd72b544bf7e5079f230f424371e462bd748eb5f82ec42` |
| materialized `python.wasm` | 5,974,624 | `b2b1a3f18a6fe035d609e3aa47e9508b55729e5f3ebbd2a40d467c0cd3200eee` |
| `python313.zip` | 4,303,799 | `00b6fb26ce2157860ce0eaae6849ea2b673f32ca06456503176e8d1fe8be4915` |

The Wasm matches the committed Git-LFS pointer. It identifies
`tags/v3.13.2-dirty` and LLVM revision
`58f4da463e5b3cd3531cace17cc3f2d8d860964e`. Those strings do not identify the
dirty CPython patch series, Emscripten SDK or complete linked source closure.
The generated wrapper has no license header. The stdlib ZIP has 514 entries
and no LICENSE, COPYING or NOTICE path. The current vendor directory has no
source recipe or notices.

The original source commit
`5eef8f1e21ca7e8e585812aefede301632471525`, its merged PR133 commit
`53ae1c6141d34b3b63827d4fccb8a7f8cbb63855`, PR134 commit
`6983884a9eb733a5a988d96b26b535742cfa4f09`, and wrapper cleanup commit
`15ed4b542eb4867bbebf5253623269a94f67cb42` retain generated outputs, without
the build source or recipe. PR133/134 bodies, reviews and inline comments add
none. The worker and threat model claim an Emscripten-level `system()` no-op;
the original source of that change remains unknown.

Frozen unpublished candidate source
`03f0f53041a9bfbf3a967ea4ec0e7541beea298c`, archive SHA-256
`25bfef80ff90f69521b2c3bd720e4a6900832dae9eb1189d63de7bf950cf98e2`,
is a local integration candidate only. Its JavaScript package build does not
establish that the inherited Python payloads were built from retained source
or have a complete rights closure. Preserve that candidate and its original
receipt. Do not relabel, repack, publish or sweep it as the replacement.

## Decision

Replace all three opaque Python payloads together with outputs built from
official CPython 3.13.2 source and one pinned Emscripten SDK. Preserve Python
3.13.2, the public `python` option, its default-off behavior, command aliases,
worker lifecycle and existing filesystem/network bridges. The package
continues to carry its complete optional runtime locally; enabling Python
does not download, install or build dependencies.

Use CPython's own `Tools/wasm/wasm_build.py`,
`Tools/wasm/config.site-wasm32-emscripten`, configure/make route and
`Tools/wasm/wasm_assets.py`. CPython 3.13 explicitly calls its Emscripten
target unsupported; this proposal makes no upstream support or broad
compatibility claim. Upgrading to Python 3.14, whose Emscripten target is
tier 3, is outside this replacement.

Select the browser/MEMFS target with dynamic linking and pthreads explicitly
disabled. Disable `_ctypes`; provide no general JavaScript bridge. Keep the
upstream static Python modules selected by that configuration and zlib for
compressed stdlib imports. Record the actual configured module set and every
additional port in the receipt. A newly required component must have its
exact source and notices before it can enter the build.

The supplier's checked-in embedding configuration owns the existing worker
contract: a modularized CommonJS factory with `FS`, `PATH`, `ENV` and
`callMain`, no automatic initial main, and `EXIT_RUNTIME`. Omit CPython's
browser preload-file link flag because the worker already installs the stdlib
ZIP in MEMFS. Produce `python313.zip` through the upstream asset tool and
the same-version native build Python; do not borrow bytecode from another
interpreter. Neither NODERAWFS nor a host filesystem mount is enabled by the
payload. The existing supplier worker remains the owner of its virtual mounts.

Keep the existing `os.system()` behavior with one small, checked-in
Emscripten JS-library override that returns `-1` and does not launch a host
process. This is an explicit source input, with its own modification notice
and digest, rather than an edit to a generated wrapper or Wasm binary. Other
unsupported process operations retain the selected Emscripten/CPython
behavior. A source reading must establish the override's link precedence and
the absence of another host-process route before building.

## Component and rights owners

| Owner | Responsibility |
|---|---|
| Supplier `dev/release/python/` | Pin canonical source/tool inputs; own the embedding options, `system()` override, source-only patches if required, production build recipe and full input/output receipt. Never patch installed dependencies or generated vendor output. |
| CPython's official source | Own the interpreter, stdlib, asset generator and bundled components. Preserve its original license files and component notices from the selected source; no Apache blanket claim applies to them. |
| Pinned Emscripten SDK/runtime source | Own compiler/linker tools, generated loader and linked C runtime. Retain its exact release mapping and applicable original license/notice texts, including musl, compiler-runtime and any embedded third-party code. |
| Pinned ports | Own their actual library source and original notices. SDK 3.1.73's zlib port selects 1.2.13 and records its SHA-512; any other enabled port needs the same treatment. |
| Supplier `vendor/cpython-emscripten/` | Hold the three replacement runtime outputs, their original notices, modification notices and a source receipt. A manifest binds all three outputs to one build. |
| Supplier package/archive recipe | Admit the Python output only when its source, recipe, tool, module, rights and three output identities are complete and match the retained files. Include the source distribution and notices in the exact npm archive. A missing or mismatched input refuses preparation. |
| Existing Python worker | Retain execution timeout, defense context, guarded module loading, virtual filesystem/HTTP bridges, stdin/stdout/stderr and one execution per worker. No new host permission follows from replacing the payload. |
| Root implementer | Own the independent plan/source review, final integration, product recordings, exact-tarball sweep, publication authorisation and registry readback. |

The fork's Apache-2.0 license continues to cover the supplier source under its
existing terms. The vendored Python closure retains each component's own
terms. Do not choose a notice by similarity, use a newer revision's notice
for an unidentified old binary, or infer a complete dependency list from
binary strings. Build-time-only tools are distinguished from code whose
bytes enter the distributed runtime.

## Retained source and offline distribution

Retain the original immutable CPython source archive, the selected
Emscripten runtime source archive and every actual port source archive. Each
has a canonical URL, immutable revision, size and cryptographic digest in a
committed manifest. Keep the recipe, fixed options and modifications beside
that manifest in the supplier source repository.

Include those runtime source archives, the recipe/manifest, original rights
texts and the output receipt in a `vendor/cpython-emscripten/source/`
subtree of the npm archive. This deliberately increases the supplier archive
size so the source and notices for the distributed Python runtime travel
with its binary, including when the npm archive is copied offline. Source
archives remain inert resources; neither package installation nor a browser
session builds or executes them. Do not include the SDK's compiler binaries,
native build Python, object files, caches or build trees in the npm package.

The exact SDK binary archive is a separately pinned build-tool input, with
its release/source mapping and original tool notices retained in the source
receipt. Rebuilding offline additionally requires that pinned tool archive
and the declared native compiler/build prerequisites. Distributing runtime
source does not claim a fully self-hosting toolchain or bit-for-bit
reproducibility across arbitrary host compilers. The receipt identifies the
host and tools actually used. A separate offline build kit, source mirror
publication or additional platform SDK needs its own explicit distribution
scope and publication authorisation.

## Input identities, size and disk boundary

These are source readings, not fetched or authenticated archive bytes:

| Input | Fixed selection | Observed compressed bytes |
|---|---|---:|
| CPython | Signed tag `v3.13.2`, commit `4f8bb3947cfbc20f970ff9d9531e1132a9e95396`; `https://www.python.org/ftp/python/3.13.2/Python-3.13.2.tar.xz` | 22,621,108 |
| SDK selector | `emscripten-core/emsdk` tag `3.1.73`, commit `6abe5123c34a7751a2d5b679e856b2591ba04145` | Source archive not yet measured |
| SDK binary | Emscripten release `b363a836e75a245c548b7a6a021822d8c9e4c6df`; `https://storage.googleapis.com/webassembly/emscripten-releases-builds/mac/b363a836e75a245c548b7a6a021822d8c9e4c6df/wasm-binaries-arm64.tar.xz` | 249,229,668 |
| Emscripten runtime source | Exact source revision mapped by that SDK release; establish from release metadata before acquisition | Not yet measured |
| zlib | Version 1.2.13, archive and SHA-512 from the pinned Emscripten port recipe | Not yet measured |

The two measured compressed inputs total 271,850,776 bytes (259.26 MiB).
Their SHA-256 values are deliberately absent until the archives are acquired
and authenticated; no original opaque binary becomes a valid substitute.

No local Emscripten installation was found in the standard toolchain paths.
Budget at most 3 GiB of temporary PeakSSD use for compressed inputs, SDK,
CPython source, native build Python, cross-build objects and retained logs.
This is a conservative work allowance, not a measured build size. Expected
runtime output is approximately 11 MiB; the source-carrying npm archive will
also include the 22,621,108-byte CPython archive and the still-unmeasured
runtime/port sources. Measure and report those exact sizes before accepting
the successor archive.

The earlier supplier source/candidate footprint is about 264 MiB. Its old
stage/store are rebuildable, but its frozen archive, receipts and log remain.
The root implementer must approve an explicit temporary allowance above the
existing 300 MiB supplier footprint before acquisition or build. Use PeakSSD
for every large write and stop the owned work if Peak free space reaches
25,600 MiB or Data reaches 23,028 MiB. Start only with the full temporary
reservation above those floors. Current space does not establish that
reservation. No large work follows merely because this proposal is committed.

## Replacement sequence and proof doors

1. Review and accept this source-only proposal at an exact supplier PR head.
   The root implementer records its plan review on the card. No external
   provenance request, large download, recipe implementation or build occurs
   before that pass and the explicit temporary space allowance.
2. Acquire the pinned original inputs with all caches and temporaries on
   PeakSSD. Authenticate their exact identities and source/release mappings;
   retain complete original notices. Resolve source and rights gaps before
   building. Refuse any unknown linked component.
3. Implement and commit the small supplier-owned recipe, embedding inputs,
   rights/source manifest and archive admission changes. Keep the existing
   public API/default-off behavior. Run production tooling in the background
   to completion with the bounded disk monitor; retain its PID, logs, exact
   command/options, environment/tool identities and output receipt.
4. Replace all three payloads only with the outputs of that same recorded
   source build. Include original sources/notices and the receipt. Do not
   transplant the new wrapper onto the old Wasm or reuse the old stdlib ZIP.
   Commit/push the source and prepare one new exact npm archive. The frozen
   `03f0f53` archive and its qualification remain unchanged.
5. Through the packaged supplier's ordinary shell door, the root records
   default-off behavior, explicit `python: true`, Python 3.13.2 identity,
   arithmetic/stdlib imports, file I/O and stdin/stdout/stderr. Record that
   `os.system()` returns `-1`, host files/env and `ctypes`/JS bridges remain
   unavailable, and cancellation/timeout uses the existing worker owner.
   An offline take uses the exact package closure without source fetching.
   A failed take fixes its source path before another candidate is prepared.
6. Repeat only the engine/product takes whose exercised bytes change. The
   root establishes whether the new vendor payload touches its existing F6
   callback take; no proof is carried forward by assumption. Declarations,
   tar inventory, source/rights inclusion and hashes are checked by reading.
   Do not add CI or an intermediate test suite. The card's final temporary
   test is written, run once and deleted only at its authorised end.
7. Sweep the exact successor tarball using actual gitleaks rules, fresh
   custody values and published `@volter/teams/redact`; retain hashed original
   findings and classify every hit. Source review and publication approval
   name that exact source/archive. Publish only the retained authorised bytes
   and read registry version/integrity back before the engine's final pin.

## Existing decisions and owner instructions

| Existing decision | Disposition |
|---|---|
| Substrate Article 5: “Run the real thing; never reimplement it.” | Complies: build official CPython and use its own runtime/asset recipe. The declared Emscripten system override preserves the supplier's existing sandbox behavior at its vendor library seam. |
| Article 6: “The engine is corrected only toward Node, at source.” | Complies: Python packaging lives in the supplier source; no engine or installed-bundle patch is proposed. |
| Article 9: “Knowledge lives in documents, and each fact has one home.” | Complies: this ADR owns the distribution decision; the committed input manifest and generated receipt own measured identities. Release instructions link here rather than claiming unknown source/rights. |
| tabnode ADR-0007: “Retain upstream's source and licence history” and prepare a candidate with “licences and the normal dependency closure.” | Completes the Python qualification of that requirement. The generic script callback and engine interpreter-dispatch responsibilities remain unchanged. |
| Owner: “Main never publishes.” | Complies: main integration does not publish this supplier or advance a publication branch. Exact source/archive publication remains separately authorised. |
| Card: “Work with the sign-ins already in place.” | Complies: acquisition/build uses public source and existing doors; no new sign-in or external provenance message is proposed. |
| Card: “Checks finish within ten seconds” and “Tests come once, at the very end.” | Complies: source readings stay bounded; actual build tooling runs in the background. No CI, development suite or added permanent gate is proposed. |
| Owner screen: “Never open a browser tab or window the owner did not ask for.” | Complies: the root records through the existing headless/hidden or card-World product doors. |

No owner-locked decision is contradicted or amended. This proposal changes
the supplier's source/rights distribution and Python production inputs; it
does not claim that a replacement has already been built, proven or approved.
