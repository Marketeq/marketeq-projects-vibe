# marketeq-projects-vibe

Vibe Coding Marketeq Projects talent network platform.

## Claude CLI Setup (API Key)

Use these steps to install Claude CLI and authenticate with an Anthropic API key.

### 1) Install Claude CLI

Choose one install method:

```bash
# Option A: npm
npm install -g @anthropic-ai/claude-code

# Option B: native installer (macOS/Linux/WSL)
curl -fsSL https://claude.ai/install.sh | bash
```

### 2) Add your API key

Set the key for the current terminal session:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Optional: persist for future shells (zsh):

```bash
echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.zshrc
source ~/.zshrc
```

### 3) Verify and start

```bash
claude --version
claude
```

Inside Claude CLI, run:

```text
/status
```

to confirm authentication is using your API key.

### 4) If auth fails

- Check the key value and organization access in Anthropic Console.
- Remove the variable to fall back to browser login:

```bash
unset ANTHROPIC_API_KEY
claude
```

## Project Notes

- Repo guidance for agents and workflows: `CLAUDE.md`
- Shared agent memory files: `.claude/memory/`
