---
name: awesome-design-md
description: 'Access curated DESIGN.md files from 68+ popular websites. Use for: adding professional design systems to your project, getting pixel-perfect UI specifications for resume builders, referencing design patterns from Claude, Vercel, Cursor, and other dev tools. Copy DESIGN.md files into your project and tell AI agents "build me a page that looks like this".'
---

# Awesome DESIGN.md

A curated collection of DESIGN.md files from real, professional websites to guide AI-generated UI design and consistency.

## What is DESIGN.md?

**DESIGN.md** is a plain-text design system document that AI agents read to generate pixel-perfect, consistent UI. It's just markdown—no Figma exports, no JSON, no special tooling. Drop it into your project root and any AI agent understands exactly how your UI should look and feel.

- **Simple format**: Markdown file anyone can read and edit
- **Agent-native**: LLMs read markdown better than any other format
- **Reusable**: Copy from real websites you admire

## When to Use

- **Adding design consistency**: Get professional design specifications without hiring a designer
- **Referencing proven layouts**: Copy design approaches from Claude, Vercel, GitHub, Raycast
- **AI-generated UI**: Tell your agent "build a page matching this DESIGN.md" for pixel-perfect results
- **Design documentation**: Document your project's design system for team consistency

## How to Use

### 1. Choose a Design

Browse the [awesome-design-md collection](https://github.com/VoltAgent/awesome-design-md) for designs matching your needs. Popular categories:

- **AI Platforms**: Claude, Cohere, Mistral, ElevenLabs
- **Developer Tools**: Cursor, Expo, Raycast, Vercel, Warp
- **Backend/DevOps**: ClickHouse, Composio, HashiCorp, Stripe

### 2. Get the DESIGN.md File

Visit https://getdesign.md/{company}/design-md and copy the markdown content

**Examples:**
- https://getdesign.md/claude/design-md
- https://getdesign.md/vercel/design-md
- https://getdesign.md/cursor/design-md

### 3. Add to Your Project

```bash
# Save to your project root
cp DESIGN.md ./DESIGN.md
```

### 4. Reference in Prompts

Tell your AI agent (e.g., Copilot) to build UI matching your DESIGN.md:
- "Build a component matching DESIGN.md specifications"
- "Create a page with the layout and colors from DESIGN.md"
- "Generate a UI following the design system in DESIGN.md"

## Key Design Categories

| Category | Examples |
|----------|----------|
| **AI & LLM** | Claude, Cohere, ElevenLabs, Mistral, Ollama, Replicate, RunwayML, xAI |
| **Developer Tools** | Cursor, Expo, Lovable, Raycast, Superhuman, Vercel, Warp |
| **Backend & DevOps** | ClickHouse, Composio, HashiCorp, LaunchDarkly, Stripe |
| **Design & Content** | Figma, Framer, Notion, Webflow |
| **Productivity** | GitHub, GitLab, Linear, Slack |

## Integration with Your Project

Once you have a DESIGN.md:

1. **Reference document**: Read it yourself to understand your design vision
2. **Agent instruction**: Link it in your `copilot-instructions.md`:
   ```markdown
   When generating UI, follow the design system in DESIGN.md.
   ```
3. **Build pages**: Ask your AI agent to create pages matching the design specs

## Learn More

- [Google Stitch DESIGN.md Docs](https://stitch.withgoogle.com/docs/design-md/overview/)
- [awesome-design-md GitHub](https://github.com/VoltAgent/awesome-design-md)
- [Get DESIGN.md for your site](https://getdesign.md/request)
