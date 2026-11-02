#!/usr/bin/env node
// VO-3806 t_c656e6fd t_07fc0d39, Articles 6/9: prepare an unpublished source-built archive.
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile, copyFile, statfs, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const source = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const options = new Map();
const accepted = new Set(['--output', '--python-wasm', '--minimum-free-mib', '--data-root', '--minimum-data-free-mib']);
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i], value = process.argv[i + 1];
  if (!accepted.has(key) || !value || options.has(key)) throw new Error(`Invalid option: ${key}`);
  options.set(key, value);
}
const output = options.get('--output');
if (!output || !isAbsolute(output)) throw new Error('--output must name a new absolute directory');
const minimumFree = Number(options.get('--minimum-free-mib') ?? 0);
const minimumDataFree = Number(options.get('--minimum-data-free-mib') ?? 0);
if (![minimumFree, minimumDataFree].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid free-space floor');
const mib = 1024 * 1024;
async function floor(path, minimum) {
  const value = await statfs(path);
  if (value.bavail * value.bsize < minimum * mib) throw new Error(`Free-space floor reached at ${path}: ${minimum} MiB`);
}
async function guard(reserve = 0) {
  await floor(dirname(output), minimumFree + reserve);
  if (options.has('--data-root')) await floor(options.get('--data-root'), minimumDataFree);
}
await guard(300);
const git = (...args) => execFileSync('git', args, { cwd: source, encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } }).trim();
if (git('status', '--porcelain')) throw new Error('Source must be committed and clean before preparation');
const commit = git('rev-parse', 'HEAD');
const sourceTime = git('show', '-s', '--format=%cI', 'HEAD');
const root = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
const manifest = JSON.parse(await readFile(join(source, 'packages/just-bash/package.json'), 'utf8'));
const lock = await readFile(join(source, 'pnpm-lock.yaml'), 'utf8');
const buildTools = new Set(['@types/ini', '@types/node', '@types/papaparse', '@types/sprintf-js', '@types/sql.js', '@types/turndown', 'esbuild', 'typescript']);
const marker = '\n  packages/just-bash:\n';
const importerStart = lock.indexOf(marker);
const packagesStart = lock.indexOf('\npackages:\n');
if (importerStart < 0 || packagesStart < importerStart) throw new Error('Missing pinned supplier importer');
const importer = lock.slice(importerStart + marker.length, packagesStart);
const groups = importer.split(/(?=^    [A-Za-z]+Dependencies:\n|^    dependencies:\n)/m).filter(Boolean);
let projected = '';
for (const group of groups) {
  if (group.startsWith('    dependencies:') || group.startsWith('    optionalDependencies:')) projected += group;
  else if (group.startsWith('    devDependencies:')) {
    projected += '    devDependencies:\n';
    for (const entry of group.slice('    devDependencies:\n'.length).split(/(?=^      \S)/m)) {
      const name = /^      (.+):\n/.exec(entry)?.[1]?.replace(/^'|'$/g, '');
      if (buildTools.has(name)) projected += entry;
    }
  }
}
if (projected.match(/^      \S/gm)?.length !== Object.keys(manifest.dependencies).length + Object.keys(manifest.optionalDependencies ?? {}).length + buildTools.size) throw new Error('Build importer projection is incomplete');
const projectedLock = lock.slice(0, lock.indexOf('importers:\n')) + 'importers:\n\n  .:\n' + projected.trimEnd() + '\n' + lock.slice(packagesStart);
await mkdir(output);
for (const name of ['stage', 'tmp', 'cache', 'store', 'artifacts']) await mkdir(join(output, name));
const env = { ...process.env, TMPDIR: join(output, 'tmp'), XDG_CACHE_HOME: join(output, 'cache'), COREPACK_HOME: join(output, 'cache/corepack'), PNPM_HOME: join(output, 'cache/pnpm'), npm_config_cache: join(output, 'cache/npm'), npm_config_logs_dir: join(output, 'cache/npm-logs') };
let running;
let guardFailure;
const monitor = setInterval(() => {
  guard().catch(error => {
    guardFailure ??= error;
    if (running?.pid) {
      try { process.kill(-running.pid, 'SIGTERM'); }
      catch (killError) { if (killError.code !== 'ESRCH') throw killError; }
    }
  });
}, 1000);
monitor.unref();
async function run(command, args, cwd, capture = false) {
  await guard();
  if (guardFailure) throw guardFailure;
  console.log(`source ${commit}: ${command} ${args.join(' ')}`);
  const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', capture ? 'pipe' : 'inherit', 'inherit'] });
  running = child;
  let stdout = '';
  child.stdout?.on('data', value => { stdout += value; });
  await new Promise((done, fail) => {
    child.on('error', fail);
    child.on('exit', code => code === 0 ? done() : fail(guardFailure ?? new Error(`${command} exited ${code}`)));
  });
  running = undefined;
  return stdout;
}
console.log(`preparation pid ${process.pid}; output ${output}`);
try {
  const stageRoot = join(output, 'stage');
  const archive = spawn('git', ['archive', commit, 'packages/just-bash'], { cwd: source, env, stdio: ['ignore', 'pipe', 'inherit'] });
  const unpack = spawn('tar', ['-x', '-C', stageRoot], { env, stdio: ['pipe', 'inherit', 'inherit'] });
  await Promise.all([
    pipeline(archive.stdout, unpack.stdin),
    new Promise((done, fail) => archive.on('exit', code => code === 0 ? done() : fail(new Error(`git archive exited ${code}`))).on('error', fail)),
    new Promise((done, fail) => unpack.on('exit', code => code === 0 ? done() : fail(new Error(`tar exited ${code}`))).on('error', fail)),
  ]);
  const stage = join(stageRoot, 'packages/just-bash');
  const wasm = join(stage, 'vendor/cpython-emscripten/python.wasm');
  const pointer = await readFile(wasm, 'utf8');
  const wasmHash = /^oid sha256:([a-f0-9]{64})$/m.exec(pointer)?.[1];
  const wasmSize = Number(/^size (\d+)$/m.exec(pointer)?.[1]);
  if (!wasmHash || !wasmSize) throw new Error('Expected the recorded upstream Git-LFS pointer');
  const wasmInput = options.get('--python-wasm');
  if (!wasmInput || !isAbsolute(wasmInput)) throw new Error('--python-wasm must name the materialized upstream LFS object');
  const hashFile = async (path, algorithm) => {
    const hash = createHash(algorithm);
    for await (const block of createReadStream(path)) hash.update(block);
    return hash.digest('hex');
  };
  if ((await stat(wasmInput)).size !== wasmSize || await hashFile(wasmInput, 'sha256') !== wasmHash) throw new Error('Python Wasm does not match the source LFS object');
  await copyFile(wasmInput, wasm);
  const installManifest = { ...manifest, packageManager: root.packageManager, pnpm: root.pnpm, devDependencies: Object.fromEntries(Object.entries(manifest.devDependencies).filter(([name]) => buildTools.has(name))) };
  await writeFile(join(stage, 'package.json'), JSON.stringify(installManifest, null, 2) + '\n');
  await writeFile(join(stage, 'pnpm-lock.yaml'), projectedLock);
  await run('pnpm', ['install', '--ignore-workspace', '--frozen-lockfile', '--ignore-scripts', '--store-dir', join(output, 'store')], stage);
  await writeFile(join(stage, 'package.json'), JSON.stringify({ ...manifest, packageManager: root.packageManager, pnpm: root.pnpm }, null, 2) + '\n');
  const packageManager = (await run('pnpm', ['--version'], stage, true)).trim();
  if (packageManager !== root.packageManager.split('@')[1].split('+')[0]) throw new Error(`Unexpected package manager ${packageManager}`);
  await run('pnpm', ['run', 'build'], stage);
  await writeFile(join(stage, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  const receipt = { package: `${manifest.name}@${manifest.version}`, repository: 'https://github.com/volter-ai/just-bash', sourceCommit: commit, sourceTime, upstreamBase: manifest.volterSource.base, lockSha256: createHash('sha256').update(lock).digest('hex'), buildImporterSha256: createHash('sha256').update(projectedLock).digest('hex'), packageManager: root.packageManager, node: process.version, pythonWasmSha256: wasmHash, buildTools: Object.fromEntries([...buildTools].map(name => [name, JSON.parse(execFileSync(process.execPath, ['-p', `JSON.stringify(require(${JSON.stringify(join(stage, 'node_modules', name, 'package.json'))}).version)`], { env, encoding: 'utf8' }))])), unpublished: true };
  await writeFile(join(stage, 'dist/source-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  const packed = JSON.parse(await run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', join(output, 'artifacts')], stage, true));
  if (packed.length !== 1) throw new Error('Expected exactly one archive');
  const tarball = join(output, 'artifacts', packed[0].filename);
  const sha512 = await hashFile(tarball, 'sha512');
  const artifact = { ...receipt, tarball, bytes: (await stat(tarball)).size, sha256: await hashFile(tarball, 'sha256'), sha512, integrity: `sha512-${Buffer.from(sha512, 'hex').toString('base64')}`, files: packed[0].files };
  await writeFile(join(output, 'artifact-receipt.json'), JSON.stringify(artifact, null, 2) + '\n');
  console.log(JSON.stringify({ tarball, bytes: artifact.bytes, sha256: artifact.sha256, integrity: artifact.integrity, receipt: join(output, 'artifact-receipt.json') }, null, 2));
} finally {
  clearInterval(monitor);
}
