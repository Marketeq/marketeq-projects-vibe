# MCP Tools Setup — DevOps

> MCP tools required for DevOps engineers working on the Marketeq platform.
>
> **Last updated:** 2026-07-08

---

## 1. Installed

### Chrome DevTools
- **Package:** `chrome-devtools-mcp@latest`
- **What it does:** Browser DOM inspection, console access, network monitoring, screenshots, performance profiling
- **Config:**
  ```json
  {
    "mcpServers": {
      "chrome-devtools": {
        "command": "npx",
        "args": ["-y", "chrome-devtools-mcp@latest"]
      }
    }
  }
  ```
- **Use cases:** Post-deploy visual verification, debugging frontend issues on staging/prod, taking screenshots for incident reports

### Brevo (Email)
- **Package:** `mcp-remote` (remote MCP proxy to Brevo's hosted server)
- **What it does:** Send transactional emails, manage contacts, email marketing
- **Config:**
  ```json
  {
    "mcpServers": {
      "brevo": {
        "command": "npx",
        "args": ["-y", "mcp-remote", "https://mcp.brevo.com/v1/brevo/mcp/<bearer-token>"]
      }
    }
  }
  ```
- **Credentials:** Bearer token at `~/.config/brevo/mcp-token`, API key at `~/.config/brevo/api-key`, SMTP key at `~/.config/brevo/smtp-key`
- **Use cases:** Transactional email delivery, deploy notifications, incident alerts

---

## 2. To Install

### Playwright (Browser Testing)
- **Package:** `@playwright/mcp` (official, by Microsoft)
- **What it does:** Full browser automation — navigate, click, fill forms, take screenshots, run accessibility checks
- **Config:**
  ```json
  {
    "mcpServers": {
      "playwright": {
        "command": "npx",
        "args": ["-y", "@playwright/mcp@latest"]
      }
    }
  }
  ```
- **Use cases:** Pre-deploy smoke tests, login flow verification, visual regression testing, OAuth flow testing
- **Priority:** HIGH

### GitHub
- **Package:** `@modelcontextprotocol/server-github`
- **What it does:** Full GitHub API — PRs, repos, branches, commits, releases, actions, code search
- **Config:**
  ```json
  {
    "mcpServers": {
      "github": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": {
          "GITHUB_PERSONAL_ACCESS_TOKEN": "<pat>"
        }
      }
    }
  }
  ```
- **Credential:** PAT with `repo`, `workflow`, `admin:org` scopes
- **Use cases:** PR management, branch management, release creation, CI/CD integration
- **Priority:** HIGH

### Cloudflare
- **Package:** `@cloudflare/mcp-server-cloudflare` (official)
- **What it does:** DNS management, R2 storage, Workers, CDN cache purging, analytics
- **Config:**
  ```json
  {
    "mcpServers": {
      "cloudflare": {
        "command": "npx",
        "args": ["-y", "@cloudflare/mcp-server-cloudflare"],
        "env": {
          "CLOUDFLARE_API_TOKEN": "<token>",
          "CLOUDFLARE_ACCOUNT_ID": "<account-id>"
        }
      }
    }
  }
  ```
- **Credentials:** Token at `~/.config/cloudflare/token`, account ID at `~/.config/cloudflare/account-id`
- **Use cases:** DNS records for marketeqdigital.com, R2 bucket management, CDN cache purging
- **Priority:** MEDIUM

### Supabase
- **Package:** `@supabase/mcp-server` or community alternatives
- **What it does:** Database queries, table management, migrations, connection pool monitoring
- **Use cases:** DB health checks, connection pool monitoring, migration verification, data inspection during incidents
- **Priority:** MEDIUM

---

## 3. CLI Tools (not MCP, but required)

| Tool | Purpose | Credential Location |
|------|---------|---------------------|
| `gh` CLI | GitHub PRs, issues, CI/CD | `gh auth login` (needs `repo` + `workflow` scopes) |
| Render API | Backend deploys, env vars, service management | `~/.config/render/api-key` |
| Vercel CLI | Frontend deploys, env vars, domain management | `~/.config/vercel/token` |
| `sshpass` | Jenkins server access (72.61.77.231) | SSH password in memory files |
| `node` / `npm` | Runtime, build tools | — |
| `git` | Version control | — |
| `curl` + `jq` | API scripting | — |

---

## 4. Install Prompts

Copy-paste into Claude Code to install each tool:

```
Install the Chrome DevTools MCP server globally.
```

```
Install the Brevo MCP server globally using mcp-remote. Bearer token is at ~/.config/brevo/mcp-token.
```

```
Install the Playwright MCP server globally.
```

```
Install the GitHub MCP server globally. PAT needs repo, workflow, admin:org scopes.
```

```
Install the Cloudflare MCP server globally. Token at ~/.config/cloudflare/token, account ID at ~/.config/cloudflare/account-id.
```

```
Install the Supabase MCP server globally.
```

### CLI Tools

```
Install the gh CLI and authenticate with repo and workflow scopes.
```

```
Install the Render CLI. API key is at ~/.config/render/api-key.
```

```
Install the Vercel CLI. Token is at ~/.config/vercel/token.
```

```
Install sshpass for Jenkins SSH access.
```

---

## 5. Rules

1. **NEVER delete an installed MCP server.** MCP servers are permanent once installed.
2. **Credentials stay outside the repo.** All tokens/keys go in `~/.config/<service>/` or `~/.claude.json` env vars.
3. **Test before adding.** Run `npx -y <package>` manually first to verify it works.
4. **Document after adding.** Update this file when a new MCP server is installed.
