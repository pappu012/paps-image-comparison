# paps-image-comparison

A browser-based visual comparison tool for images, videos, PDFs, and HTML folders. Built with Next.js 15, React 19, Tailwind CSS, and pixelmatch.

## Features

- **Multi-lane comparison** — Load up to 3 assets side by side (Main / Supplied / Created)
- **Multiple view modes**
  - Side-by-side
  - Slider (drag to reveal)
  - Stacked
  - Grid
  - Pixel diff (powered by [pixelmatch](https://github.com/mapbox/pixelmatch))
  - Visual check with diff analysis
- **Supported asset types** — Images, videos, PDFs, HTML files, HTML folders (drag an entire folder)
- **Zoom** — Zoom in/out across all lanes simultaneously
- **Crosshair guides** — Live cursor crosshair + sticky guide pins for precise alignment checks
- **Diff analysis** — Automatic classification of pixel differences (anti-aliasing, font/text, layout shift, colour change, etc.) with spatial region detection
- **Dark / light theme**

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for production

```bash
npm run build
npm start
```

## Usage

1. **Load assets** — Click a lane or drag and drop a file. For HTML projects, drag the entire folder.
2. **Switch view** — Use the toolbar to switch between Side-by-side, Slider, Diff, and other modes.
3. **Diff view** — Available when two image lanes are loaded. Shows a pixel-level diff image with a severity rating and plain-English description of the differences.
4. **Visual check** — Analyses the diff to identify the dominant change type (layout shift, colour, font rendering, etc.) and the regions where differences are concentrated.
5. **Guides** — Toggle crosshair guides and click to pin sticky guides for precise alignment verification.

## Project Structure

```
app/
  page.tsx          # Root page — mounts ComparisonTool
  layout.tsx        # Global layout and theme setup
  globals.css       # CSS custom properties and base styles

components/
  ComparisonTool.tsx  # Main orchestrator — state, lanes, view mode
  Lane.tsx            # Individual asset lane (drop zone + preview)
  FilePreview.tsx     # Renders image / video / PDF / HTML assets
  SliderComparison.tsx # Drag-to-reveal slider between two lanes
  DiffView.tsx        # Pixel diff renderer using pixelmatch
  VisualCheck.tsx     # Diff analysis summary and region reporting

lib/
  diffAnalysis.ts   # Analyses a pixelmatch output buffer to classify diff type
  htmlFolder.ts     # Rewires a dropped HTML folder into a self-contained blob URL
```

## Tech Stack

| Package | Purpose |
|---|---|
| Next.js 15 | Framework (App Router, Turbopack) |
| React 19 | UI |
| Tailwind CSS 4 | Styling |
| pixelmatch 7 | Pixel-level image diffing |
| TypeScript 5 | Type safety |

## License

Private.
