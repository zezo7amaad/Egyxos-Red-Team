# EGYXOS Red Team

EGYXOS Red Team is an AI-assisted security assessment platform designed for authorized security testing and evidence-driven review. It combines project management, human approval boundaries, scope enforcement, tool orchestration, findings tracking, and reporting in a single command-line experience.

## What is EGYXOS Red Team?

EGYXOS Red Team helps teams run structured red-team and security assessment workflows against approved targets while preserving strict safety boundaries. The platform keeps a human in the loop for sensitive actions, stores evidence in a local-first database, and produces shareable reports with technical findings and remediation guidance.

## Features

- Project-aware assessment workflows
- Session memory and state persistence
- Scope validation for in-scope targets only
- Approval gates for high-impact actions
- Tool registry for recon and testing adapters
- Findings engine with severity and confidence tracking
- Evidence-based reporting in Markdown, HTML, and JSON
- AI provider abstraction with provider and model routing
- Gemini-powered bug bounty analysis skills
- Doctor command to validate configuration and dependencies
- Dry-run preview for safe command planning

## Architecture

The implementation follows a modular design:

- CLI entrypoint for operator control
- Project and session managers
- Scope and approval engine
- Tool registry and adapters
- Agent orchestration layer
- Findings and evidence storage
- Reporting and documentation generation

## Installation

### Linux installation

```bash
sudo apt update
sudo apt install -y git curl build-essential
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

After cloning the repository, run the included installer from its root:

```bash
chmod +x scripts/install-linux.sh
./scripts/install-linux.sh
```

The installer checks for Node.js 20+, runs `npm install`, builds the TypeScript CLI, and runs `npm link`. It does not install external security tools or execute scans.

### Clone and build

```bash
git clone https://github.com/zezo7amaad/Egyxos-Red-Team.git
cd Egyxos-Red-Team
npm install
npm run build
```

Install the CLI globally from the local checkout:

```bash
sudo npm link
egyxos-redteam --help
```

For local development without a global link:

```bash
npx tsx src/index.ts --help
```

### Windows PowerShell

```bash
npm install
npm run build
npm link
```

## Quick Start

```bash
egyxos-redteam project create demo
egyxos-redteam project open demo
egyxos-redteam scope add example.com
egyxos-redteam session start
egyxos-redteam tools list
egyxos-redteam doctor
```

## CLI

The CLI exposes the primary security-assessment workflows:

```bash
egyxos-redteam

egyxos-redteam project create acme
egyxos-redteam project list
egyxos-redteam project open acme

egyxos-redteam scope show
egyxos-redteam scope add example.com

egyxos-redteam session start
egyxos-redteam session list
egyxos-redteam session resume <id>

egyxos-redteam recon start
egyxos-redteam tools list
egyxos-redteam skills list
egyxos-redteam ai ask bug-bounty-triage "Review these authorized observations"
egyxos-redteam findings list
egyxos-redteam report generate
egyxos-redteam doctor
egyxos-redteam config show
```

## Projects

Projects are created under the local storage root and include folders for scope, sessions, evidence, findings, notes, and reports.

## Sessions

Sessions capture the current assessment objective, target, tool activity, approvals, and session-state transitions.

## Reconnaissance

EGYXOS Red Team includes a framework for recon tasks such as service discovery, URL enumeration, technology detection, subdomain discovery, and API discovery through adapters.

Preview a passive subdomain discovery action:

```bash
egyxos-redteam scope add example.com
egyxos-redteam recon start
```

The current CLI displays a scope-checked command preview. External tools are not executed automatically by the CLI yet.

## Security Testing

The platform supports structured web and API testing patterns while requiring explicit approval for potentially impactful actions.

## AI Providers

The initial AI provider is Google Gemini through the Gemini REST API. Credentials are loaded from environment variables and never stored in project files:

```bash
export GEMINI_API_KEY="your-key"
export GEMINI_MODEL="gemini-2.0-flash"
```

PowerShell:

```powershell
$env:GEMINI_API_KEY = "your-key"
$env:GEMINI_MODEL = "gemini-2.0-flash"
```

Ask Gemini to analyze authorized evidence with a named security skill:

```bash
egyxos-redteam skills list
egyxos-redteam ai ask bug-bounty-triage "Review this authorized HTTP response for security issues: ..."
egyxos-redteam ai ask finding-report-writer "Draft a report from this validated evidence: ..."
```

The provider sends only the prompt supplied to the command. Do not paste secrets, credentials, private tokens, or unnecessary personal data into prompts.

## Bug bounty skills

Built-in skills provide constrained operating guidance for authorized programs:

- `bug-bounty-triage` - classify observations into hypotheses and validated findings
- `passive-asset-discovery` - organize approved subdomain and service discovery
- `web-exposure-review` - review headers, exposure, and error behavior
- `api-review` - analyze authorized API documentation and responses
- `finding-report-writer` - draft evidence-backed vulnerability reports

List skills with:

```bash
egyxos-redteam skills list
```

Skills do not grant authorization and do not bypass scope or approval controls. They are designed to help analyze evidence and plan low-impact, permitted testing; they do not autonomously exploit targets.

## Tools

Available adapters include:

- httpx
- katana
- subfinder
- ffuf
- sqlmap
- nmap
- nuclei
- curl
- dig
- whois

### Compact tool command reference

Command previews prefer compact flags where each tool supports them:

| Tool | Compact command preview | Flag meaning |
| --- | --- | --- |
| `httpx` | `httpx -u TARGET -silent -title` | `-u` URL, `-silent` reduced output, `-title` page title |
| `katana` | `katana -u TARGET -silent` | `-u` target URL, `-silent` reduced output |
| `subfinder` | `subfinder -d DOMAIN -silent` | `-d` domain, `-silent` reduced output |
| `ffuf` | `ffuf -u TARGET/FUZZ -w WORDLIST -s` | `-u` URL pattern, `-w` wordlist, `-s` silent output |
| `sqlmap` | `sqlmap -u TARGET --batch --smart` | `-u` URL, `--batch` non-interactive mode, `--smart` smart checks |
| `nmap` | `nmap -sV -T3 TARGET` | `-sV` service detection, `-T3` moderate timing |
| `nuclei` | `nuclei -u TARGET -v ...` | `-u` target URL, `-v` verbose output |
| `curl` | `curl -sSIL TARGET` | `-s` silent, `-S` show errors, `-I` headers, `-L` redirects |
| `dig` | `dig +short DOMAIN` | `+short` concise DNS output |
| `whois` | `whois DOMAIN` | Domain registration lookup |

`nuclei` is intended for approved vulnerability-template checks and `subfinder` is intended for passive subdomain discovery. All tools are listed by `egyxos-redteam tools list`, checked by `egyxos-redteam doctor`, and represented by scope-aware command previews. External tools are never installed or executed silently.

The registry exposes availability checks and dry-run action previews.

The EGYXOS CLI command itself must still come first. For example:

```bash
egyxos-redteam tools list
egyxos-redteam scope show
egyxos-redteam skills list
egyxos-redteam ai ask bug-bounty-triage "Review this authorized evidence"
```

The short flags above are previews for the external security tools. They are not standalone EGYXOS commands.

## Skills

The project supports a modular skill registry for reconnaissance, web, API, authentication, authorization, analysis, and reporting tasks. Skills are dynamically discoverable through the core registry.

## Findings

Findings are represented as structured records containing severity, confidence, target, endpoint, reproduction, evidence, and remediation guidance. Findings are never upgraded to confirmed without enough evidence.

## Reports

Reports can be generated in Markdown, HTML, and JSON. The report engine summarizes the executive overview, scope, findings, evidence, and risk profile for the assessment.

## Configuration

EGYXOS Red Team stores configuration under the local user directory:

```text
~/.egyxos-redteam/config.json
```

The configuration supports project selection, provider/model configuration, scope defaults, storage path overrides, and tool enablement.

The default data directory is:

```text
~/.egyxos-redteam/
```

Override it with:

```bash
export EGYXOS_STORAGE="$HOME/.egyxos-data"
```

PowerShell:

```powershell
$env:EGYXOS_STORAGE = "C:\egyxos-data"
```

## Security Model

The implementation intentionally enforces the following boundaries:

- explicit authorization before risky actions
- least-privilege defaults
- scope validation
- auditability via session and action logs
- no secret leakage in logs
- safe dry-run planning

## Development

```bash
npm install
npm run build
npm test
```

## Testing

Vitest is used for the project test suite, including agent, scope, reporting, project, and tool validation tests.

## Scheduled GitHub Actions scan

The repository includes `.github/workflows/example-com-security-scan.yml`, which runs daily at `00:00 UTC`. It performs passive subdomain enumeration with `subfinder`, then runs Nuclei against the discovered list. It can also be started manually from the Actions tab with a different authorized domain. Results are uploaded as an `example-com-scan-reports` artifact for 14 days.

The workflow uses these compact tool commands:

```bash
subfinder -d example.com -silent
nuclei -l scan_results/example.com_subdomains.txt -v -severity info,low,medium,high,critical -jsonl
```

Only run this workflow against domains you own or have explicit permission to assess. The workflow uses read-only repository permissions and validates the manually supplied domain before scanning.

## Contributing

Contributions are welcome. Please keep the implementation original and aligned with the product identity. Avoid reusing or copying vendor implementation details from the reference project.

## License

MIT.
