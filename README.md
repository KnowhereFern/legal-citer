# Story Builder

This workspace includes a resumable story-generation runner that reads the `Proposals` sheet from `Fern_Project_Proposals.xlsx` and builds Markdown development stories for feature rows.

## Provider Model

- Story Markdown generation defaults to Codex: `gpt-5.4`.
- Codex researches and writes each Markdown story in one pass using the logged-in Codex CLI, `--search`, and any MCP servers exposed to your Codex environment.
- DeepSeek remains available only as an optional override when you explicitly pass `--provider deepseek`.
- Tavily remains available only as a DeepSeek research-provider override when you explicitly pass `--provider deepseek --research-provider tavily`.
- Actual product code implementation should still be done by Codex after the feature stories exist.

DeepSeek direct API mode does not have native access to web search or MCP servers. If you opt into DeepSeek, the runner uses a research provider first, then passes the research packet to DeepSeek. Research is mandatory: at least web search or MCP research must be enabled.

## What It Does

- Launches an interactive menu by default when you run `./run_story_builder`
- Reads one feature proposal row at a time from the workbook by default
- Generates implementation-ready Markdown stories under `outputs/story_builder/stories/`
- Tracks completion state in `outputs/story_builder/manifest.json`
- For Codex runs, stores the final structured story payload in the manifest for traceability
- Updates the source workbook with status, completion timestamp, story link, raw response link, research summary, observations, UI component decision notes, errors, and contract version
- Creates a workbook backup in `outputs/story_builder/workbook_backups/` before writing status updates
- Shows a live terminal spinner with elapsed time while the provider is working on each row
- Skips already completed rows on later runs unless the source row changed, the required Markdown artifact is missing, or you pass `--force`
- Excludes `decision` and `action_item` rows by default because those are planning/context artifacts, not development stories
- For UI stories, requires shadcn/ui-first guidance: prefer existing shadcn components, blocks, and configured registry items before recommending custom UI

## Setup

No API key is needed for the default Codex path as long as your Codex CLI is already logged in.

Optional DeepSeek key in `.env.local` if you explicitly use `--provider deepseek`:

```bash
DEEPSEEK_API_KEY="your_key_here"
```

The runner also accepts normal shell exports. Optional DeepSeek override in `.env.local`:

```bash
DEEPSEEK_BASE_URL="https://api.deepseek.com"
```

Optional Tavily key in `.env.local` if you explicitly use `--provider deepseek --research-provider tavily`:

```bash
TAVILY_API_KEY="your_tavily_key_here"
```

Configured defaults:

- Markdown story builder: Codex `gpt-5.4`
- Story row type filter: `feature`
- Optional DeepSeek story builder: `deepseek-v4-pro`, `reasoning_effort="xhigh"`, `thinking={"type":"enabled"}`
- Code implementation after the stories are built: Codex/GPT-5.4 in this project workspace

## Run It

Open the interactive menu:

```bash
./run_story_builder
```

The menu supports:

- Resume from the next pending row
- Run all pending rows
- Run the next N pending rows
- Run a specific row
- Preview what would run
- Show progress details
- Edit settings such as provider, model, workbook updates, markdown saving, and force-rerun mode
- Regenerate all candidate rows with force, after an explicit confirmation

Run one row directly with the default Codex provider:

```bash
./run_story_builder --limit 1
```

Use DeepSeek instead for story generation:

```bash
./run_story_builder --provider deepseek
```

Include non-feature planning artifacts only when you explicitly want them:

```bash
./run_story_builder --proposal-types all
```

Force Tavily as the research provider:

```bash
./run_story_builder --provider deepseek --research-provider tavily
```

Use shorter Tavily snippets instead of raw source content:

```bash
./run_story_builder --provider deepseek --research-provider tavily --tavily-raw-content off
```

Force Codex as the research provider:

```bash
./run_story_builder --provider deepseek --research-provider codex
```

Process one explicit sheet row:

```bash
./run_story_builder --row 12
```

Preview without calling Codex or DeepSeek:

```bash
./run_story_builder --dry-run
```

Regenerate completed rows:

```bash
./run_story_builder --force
```

Keep going past a bad row and record failures:

```bash
./run_story_builder --continue-on-error
```

Disable Markdown files for a run:

```bash
./run_story_builder --no-save-markdown
```

Save raw structured model JSON too:

```bash
./run_story_builder --save-raw-json
```

## Notes

- The runner defaults to the only `.xlsx` file in the current directory. Use `--workbook` if that changes later.
- The current default sheet is `Proposals`; `MVP Recommendations` is used only as shared context.
- The current default story type is `feature`. Use `--proposal-types feature,action_item` or `--proposal-types all` only if you intentionally want non-feature artifacts.
- Resume works through the manifest and always advances to the next row that is not completed for the current source row. If every row is completed, resume intentionally does nothing; use a forced rerun only when you want to regenerate existing artifacts.
- Tavily is DeepSeek-only fallback research. It defaults to raw markdown content, then caps source excerpts before sending them to DeepSeek. Use `--provider deepseek --research-provider tavily --tavily-raw-content off` only when you intentionally want cheaper, shorter snippet-style context.
- Raw `.json` responses are optional and only written when you pass `--save-raw-json`.
- Open `Fern_Project_Proposals.xlsx` and use the rightmost `Story ...` columns to follow progress. Green means completed, yellow means running, and red means error.
- `UI Component Decision Notes` records whether existing shadcn components/blocks were enough or why custom UI is justified.
- Codex loads your normal user config by default, so MCP availability comes from the MCP servers exposed to your logged-in Codex CLI environment.
- The shell wrapper prefers `python3` if it already has `openpyxl`; otherwise it falls back to the bundled Codex runtime Python.
