# repo-vet

[繁體中文](./README.zh-TW.md)

Security vetting for third-party code. Static analysis only — the target repo's
code is never executed.

## Skills

### `/repo-scan <github-url>`

Vet an unfamiliar repository **before** you install or run it. Clones into an isolated
`tmp/repo-scan/` directory and scans for:

- **Credential theft** — reads of `~/.ssh`, `~/.aws`, full `process.env` / `os.environ` dumps, browser and wallet data
- **Hidden outbound connections** — full URL/IP inventory classified against the repo's claimed purpose; Discord/Telegram webhooks, paste sites, tunnels, raw-IP endpoints
- **Install-time attacks** — malicious `postinstall` / `setup.py` hooks, `curl | bash`, download-and-execute, persistence (shell profiles, scheduled tasks, registry run keys)
- **Obfuscation & dynamic execution** — `eval`/`exec` fed by base64 payloads, javascript-obfuscator markers, charcode chains
- **Supply chain** — typosquatted dependencies, git-pinned forks, lockfile tampering, unexplained committed binaries
- **Leaked secrets** — committed API keys and private keys (maintainer hygiene signal)
- **CI workflow risks** — `pull_request_target` abuse, script injection, mutable action pins
- **Compromised-maintainer signals** — suspicious git history patterns (dormant repo + sudden install-script commits)
- **AI-reviewer manipulation** — text in the repo attempting to instruct automated reviewers to skip checks

Output: a structured report with a **BLOCK / CAUTION / PASS** verdict, `file:line`
evidence for every finding, the complete outbound-connection inventory, and an explicit
list of what was *not* checked (transitive deps, runtime behavior).

## Install

```bash
# Via the bouob-plugins marketplace (recommended)
/plugin marketplace add bouob/claude-plugins
/plugin install repo-vet@bouob-plugins

# Or directly from this repo
/plugin marketplace add bouob/repo-vet
/plugin install repo-vet@repo-vet
```

## Safety model

- The scan never runs `npm install`, `pip install`, build scripts, or any code from the target repo.
- Clones use `core.symlinks=false` to prevent checkout path escapes.
- Repo content (READMEs, comments) is treated as untrusted data — instructions embedded in the repo aimed at AI reviewers are reported as findings, not followed.

## License

MIT
