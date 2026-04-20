# Design Playground — Master Prompt

> Copy everything below the line, fill in your details in the [brackets], and paste it into Claude Code.

---
AT ANY point: you are stuck. You have to stop and tell that you are stuck. You can't take more than two minutes. Also, whenever there is a possibility, fire parallel agents to execute all the tasks simultaneously. You have to ask for the Figma link. 

First, check that both the Figma MCP and Linear MCP servers are connected. If either one isn't working, stop and tell me what's wrong before doing anything else. I'll give you the figma links and svgs when you are ready 

Pull the Linear ticket 780 for context.

I need you to build a Design Playground — a self-contained folder in the repo that showcases our design system so developers can see every component and ship features fast.

Pull the designs from our Figma file:

- Colors page
- Typography page
- Buttons page
- SVG icons

Get screenshots of each so you can see what they look like, then extract all the actual values from the design context.

Font files are at download. Extract the needed weights into the playground's assets folder.

Create a DesignPlayground/ folder at the project root with:

1. Theme tokens file — all the colors, typography, spacing, border radius, shadows, and button tokens extracted from Figma. This is the single source of truth. Don't guess any values, pull everything from what Figma gives you.

2. Section components (React Native) for each part of the design system:
   - Typography — showing each type style with live rendered samples
   - Colors — swatch cards with hex values, token names, and descriptions
   - Buttons — all variants rendered with the 3D shadow technique if the design uses it (two layered views, not native shadows). Grab any icon SVGs from the Figma response.
   - Spacing and layout — visual bars for spacing tokens, border radius preview boxes, shadow elevation cards
   - Components — cards, text inputs, tags/chips, dividers

3. Main playground screen — loads any custom fonts, then renders all sections in a scrollable view

4. HTML design preview (preview.html) — a standalone HTML file I can open in any browser to see the entire design system visually. Inline CSS, no external dependencies except Google Fonts for the typefaces.

5. HTML structure map (structure.html) — a second HTML file that shows the full file tree of what you built, what each file does, how they connect to each other, and how a developer would import and use them.

6. Route — add a route file so I can navigate to the playground screen in the app. Register it in the navigator.

Don't touch any existing code except adding the route registration. Don't import from any existing theme file — this is a new design system. All values must come from what you pull from Figma.

When you're done, run a type check to make sure there are no errors, then open both HTML files in my browser so I can see everything immediately.

NEVER GO BEYOND THE FIGMA REQUIRMENTS ALWAYS ASK BEFORE CREATING ANYTHING NEW