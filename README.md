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

### Local development

```bash
npm install
npm run build
```

### Run the CLI

```bash
npx tsx src/index.ts --help
```

### Global install

```bash
npm link
```

Then run:

```bash
egyxos-redteam --help
```

## Quick Start

```bash
egyxos-redteam project create demo
egyxos-redteam project open demo
egyxos-redteam scope add example.com
egyxos-redteam session start
egyxos-redteam tools list
egyxos-redteam findings list
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
egyxos-redteam findings list
egyxos-redteam report generate
egyxos-redteam doctor
```

## Projects

Projects are created under the local storage root and include folders for scope, sessions, evidence, findings, notes, and reports.

## Sessions

Sessions capture the current assessment objective, target, tool activity, approvals, and session-state transitions.

## Reconnaissance

EGYXOS Red Team includes a framework for recon tasks such as service discovery, URL enumeration, technology detection, and API discovery through adapters.

## Security Testing

The platform supports structured web and API testing patterns while requiring explicit approval for potentially impactful actions.

## AI Providers

The provider abstraction is ready for OpenAI-compatible APIs, Anthropic, Gemini, OpenRouter, Ollama, and other compatible models. Credentials are loaded from environment variables and the config system rather than hardcoded values.

## Tools

Available adapters include:

- httpx
- katana
- ffuf
- sqlmap
- nmap
- nuclei
- curl
- dig
- whois

The registry exposes availability checks and dry-run action previews.

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

The configuration supports project selection, provider configuration, scope defaults, storage path overrides, and tool enablement.

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

## Contributing

Contributions are welcome. Please keep the implementation original and aligned with the product identity. Avoid reusing or copying vendor implementation details from the reference project.

## License

MIT.
