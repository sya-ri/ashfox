# Set up or update sya-ri-ashfox

Read this guide completely. You are setting up the CLI from
<https://github.com/sya-ri/ashfox> for a user creating assets in their own project.
Respond in the user's language. The fork is installed globally as
`sya-ri-ashfox`; the official `@ashfox/cli` package and `ashfox` command can coexist.
No MCP server, Blockbench session, account or API key is required.

## Inspect the environment

Read the user's project instructions, asset sources and build configuration.
Preserve unrelated files. Check `node --version`, `npm --version`,
`sya-ri-ashfox --version`, `sya-ri-ashfox --help` and `sya-ri-ashfox doctor --json`
where available. Node.js 24+ and npm are required. Install missing prerequisites
only within the user's authorization and the environment's permissions.

If a working fork is already installed, verify it and use it. Do not rebuild,
replace it or fetch updates unless the user requests an update, a rebuild of
local changes or a different source directory. Do not install the upstream CLI
as a substitute. Compilation does not require Chrome or FFmpeg; capture and
replay need Chrome/Chromium, and OGG encoding needs FFmpeg with libvorbis.
Install optional tools only when the asset task needs them.

## Select the source directory

Use this precedence:

1. The absolute directory explicitly specified by the user.
2. `sourceDirectory` from the saved `config.json` below.
3. The current working directory, if it is the root of a checkout whose
   `origin` is `sya-ri/ashfox`.
4. The default `source` directory below.

| Platform | Configuration | Default source directory |
| --- | --- | --- |
| Windows | `%LOCALAPPDATA%/sya-ri-ashfox/config.json` | `%LOCALAPPDATA%/sya-ri-ashfox/source` |
| macOS | `~/Library/Application Support/sya-ri-ashfox/config.json` | `~/Library/Application Support/sya-ri-ashfox/source` |
| Linux | `${XDG_DATA_HOME:-~/.local/share}/sya-ri-ashfox/config.json` | `${XDG_DATA_HOME:-~/.local/share}/sya-ri-ashfox/source` |

The saved JSON contains exactly one field, `sourceDirectory`, with an absolute
path. Malformed configuration is an error, not a reason to silently clone
elsewhere. An explicit source directory takes precedence over old configuration.
Keep the user's asset project distinct from the compiler checkout unless they
explicitly chose the checkout itself.

Reuse an existing matching checkout. Inspect its `origin`, branch and working
tree before taking action. Never clone over existing files, reset local changes,
switch branches, stash work or delete an old checkout without authorization.
For a new destination, create its parent as needed, then clone the public fork:

```sh
git clone https://github.com/sya-ri/ashfox.git "<absolute-source-directory>"
```

Replace the placeholder with the selected path and quote paths containing spaces.
If the destination contains other files or a different repository, report the
collision and ask for another directory. Changing the saved location does not
move or delete the previous source.

## Build and install

Run from the selected fork checkout. On first setup, restore the locked build
dependencies, then install the bundled CLI:

```sh
npm ci
npm run install:fork-cli -- --source-directory "<absolute-source-directory>"
```

`install:fork-cli` builds the fork, creates
`dist/fork/sya-ri-ashfox-cli.tgz`, and runs
`npm install --global --ignore-scripts --no-audit --no-fund` on that archive.
It verifies the installed executable against the current build, then atomically
records the source directory. It never fetches Git changes. Build or installation
failure must not change the saved location. Do not use `--force` to bypass an
unrelated command collision.

To build an archive without installing or changing saved configuration:

```sh
npm run build:fork-cli
```

Check `npm prefix --global` and command resolution. On Windows the command
directory is the prefix itself; on macOS/Linux it is `<prefix>/bin`. If that
directory is missing from PATH, add it to the user's shell configuration within
their authorization and verify in a fresh shell. Do not change the npm prefix
or reinstall Node just to hide a permission problem. Report blocked access
without claiming installation succeeded.

After installation, verify from the user's asset directory:

```sh
sya-ri-ashfox --version
sya-ri-ashfox doctor --json
sya-ri-ashfox capabilities
```

Record the source commit with `git rev-parse HEAD`, note any local modifications,
and report the saved source path and command resolution. Do not globally install
or update the official package as part of this procedure.

## Update or rebuild local changes

For an explicit update request, use the same source selection rules. Check
`git status --porcelain` and `git branch --show-current`. Only fetch and
fast-forward when the working tree is clean and the branch is `main`:

```sh
git fetch origin main
git merge --ff-only origin/main
npm ci
npm run install:fork-cli -- --source-directory "<absolute-source-directory>"
```

If the tree is dirty, the branch differs or history diverges, preserve it and
explain what prevented the update. Do not switch, reset, rebase or merge divergent
history automatically. A failed update leaves the installed CLI usable.

For a requested rebuild of local customizations, keep the current branch and
changes; do not fetch or merge. Run `npm ci` if dependencies are missing or the
lockfile changed, then rerun `install:fork-cli` with that checkout's absolute path.
The installed bundle is a snapshot, not a symlink: source edits take effect only
after rebuilding and reinstalling. One installation serves every project using
the global command. Running processes keep their current code; new invocations
use the new bundle. Project-local overrides are separate installations.

## Create and verify assets

Read the selected checkout's `docs/guides/agent-workflow.md`,
`docs/guides/cli.md`, `docs/guides/repository-layout.md` and the DSL references
relevant to the requested asset. Replace upstream command examples with
`sya-ri-ashfox`; do not follow their upstream installation instructions.
The installed help and capabilities describe the supported flags and formats.

Preserve the asset project's conventions. For a new project, use grouped native
`.ashfox` sources under `asset/` and ignored generated output under `build/`.
Only run `init` into a new directory. Its generated `assets.mjs` resolves the
global fork package on each run, so updates are shared across projects; Node/npm
must be on PATH. Relative asset paths remain relative to the calling project.

Inspect and compile assets, review PNG captures at useful angles and native pixel
size, replay changed motions and listen to audio when the host supports it.
Successful compilation alone is not visual or audio review. Use `--output` for
saved media, avoiding shell binary redirection. Existing output files are refused.
Use `check`, `build` and `verify` for configured delivery. Never hand-edit generated
artifacts or change the `.ashfox` source language to match the fork's command name.

After setup, continue the user's asset request. If none was provided, ask what
they want to create. Report exact outputs, what was verified and any remaining
receiving-game checks. Commit, publish or install additional tools only within
the user's requested scope.
