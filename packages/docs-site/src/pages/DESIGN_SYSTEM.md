# NoirForge Design System

This document describes the cohesive visual and interaction design system applied across all interactive pages of the NoirForge Docusaurus site.

## Overview

The design system consists of:
- **Shared module** (`shared.module.css`) - Common patterns and components
- **Design tokens** (in `custom.css`) - Color, spacing, and typography variables
- **Page-specific CSS modules** - Minimal overrides, importing shared styles
- **Semantic markup** - Proper hierarchy and accessibility

## Design Tokens

### Colors

All colors are defined in `custom.css` and referenced via CSS variables:

**Backgrounds:**
- `--nf-color-bg-dark`: `#0b1020` - Primary background
- `--nf-color-bg-mid`: `#0f172a` - Secondary background
- `--nf-color-bg-light`: `#111827` - Tertiary background

**Text:**
- `--nf-color-text-primary`: `rgba(255, 255, 255, 0.95)` - Primary text
- `--nf-color-text-secondary`: `rgba(255, 255, 255, 0.7)` - Secondary text
- `--nf-color-text-tertiary`: `rgba(255, 255, 255, 0.5)` - Tertiary text

**State Colors:**
- Success: `#10b981` with light/border variants
- Error: `#ef4444` with light/border variants
- Warning: `#f59e0b` with light/border variants
- Info: `#3b82f6` with light/border variants

### Spacing Scale

- `xs`: 0.25rem
- `sm`: 0.5rem
- `md`: 0.75rem
- `lg`: 1rem
- `xl`: 1.5rem
- `2xl`: 2rem
- `3xl`: 2.5rem

### Border Radius

- `sm`: 8px (form elements, small components)
- `md`: 12px (cards)
- `lg`: 14px (legacy - being standardized to `md`)

## Component Patterns

### Page Layout

```css
.page {
  min-height: calc(100vh - var(--ifm-navbar-height));
  background: linear-gradient(...);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem;
}
```

**Features:**
- Full-height viewport minus navbar
- Responsive gradient background
- Max-width container with responsive padding
- Mobile-first approach

### Cards

```css
.card {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 1.5rem;
  backdrop-filter: blur(8px);
  transition: all 0.2s ease-in-out;
}

.card:hover {
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(0, 0, 0, 0.38);
}
```

**Features:**
- Glassmorphism effect with semi-transparent background and backdrop blur
- Subtle hover state with increased border visibility
- Responsive padding (1.25rem on mobile)
- Smooth transitions

### Form Elements

All inputs (`textarea`, `.file`, `.search`, `input[type="text"]`, `input[type="email"]`) share:

```css
border: 1px solid rgba(255, 255, 255, 0.12);
background: rgba(0, 0, 0, 0.35);
border-radius: 8px;
padding: 0.75rem;
transition: all 0.15s ease;

/* Focus state */
outline: 2px solid rgba(47, 111, 235, 0.5);
outline-offset: 2px;
border-color: rgba(255, 255, 255, 0.28);
background: rgba(0, 0, 0, 0.4);
```

**Features:**
- Consistent styling across all input types
- Clear focus state with colored outline
- Responsive font size and padding

### Badges & Alerts

Four semantic badge types:

- `.badgeOk` - Success state (green)
- `.badgeErr` - Error state (red)
- `.badgeWarn` - Warning state (amber)
- `.badgeInfo` - Info state (blue)

Each consists of a colored border, light background, and padding:

```css
border: 1px solid rgba(COLOR, 0.35);
background: rgba(COLOR, 0.08);
padding: 1rem;
border-radius: 8px;
```

### Tables

Tables use sticky headers and subtle row hovers:

```css
.table thead th {
  position: sticky;
  top: 0;
  background: rgba(0, 0, 0, 0.5);
}

.table tbody tr:hover {
  background: rgba(255, 255, 255, 0.03);
}
```

## Typography

- **Font stack**: System fonts via `font-sans` from Docusaurus
- **Monospace**: `ui-monospace, SFMono-Regular, Monaco, Inconsolata, Menlo`
- **Line height**: 1.5-1.6 for body text
- **Title scales**: `clamp(1.75rem, 5vw, 2.5rem)` for responsive sizing

## Mobile Responsiveness

Breakpoints and adjustments:

- **< 480px**: Stack layouts, reduce padding, adjust font sizes
- **640px**: Smaller titles and spacing adjustments
- **900px**: Two-column grids activate
- **1200px**: Max container width

Key adjustments:
- Card padding: 1.5rem → 1rem (mobile)
- Title size: responsive with `clamp()`
- Grid: single column → two columns at 900px
- Textarea height: 220px → 180px (mobile)

## Accessibility

- **Focus states**: 2px outline with 2px offset on all interactive elements
- **Color contrast**: WCAG AA compliance for all text on backgrounds
- **Semantic HTML**: Proper `<main>`, `<section>`, `<h1>-<h6>` hierarchy
- **ARIA labels**: Added to search inputs and interactive elements
- **Keyboard navigation**: All buttons and links are keyboard accessible

## Usage

### For new pages:

1. Create a new `.module.css` file
2. Import shared styles:
   ```css
   @import './shared.module.css';
   ```
3. Add page-specific overrides only:
   ```css
   .myElement {
     /* custom styles */
   }
   ```

### For new components:

Use shared classes wherever possible:

```jsx
import styles from './shared.module.css';

export function MyCard() {
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Title</h2>
      <p className={styles.small}>Description</p>
    </section>
  );
}
```

## File Structure

```
src/
├── css/
│   └── custom.css          # Design tokens, global overrides
├── pages/
│   ├── shared.module.css   # Shared component patterns
│   ├── demo.module.css     # Demo page (minimal)
│   ├── metrics.module.css  # Metrics page (minimal)
│   ├── templates.module.css # Templates page (minimal)
│   ├── playground.module.css # Playground page (minimal)
│   ├── index.js            # Home page
│   ├── demo.jsx
│   ├── metrics.jsx
│   ├── templates.jsx
│   └── playground.jsx
```

## Future Enhancements

- Consider adding Tailwind for rapid development if the site grows significantly
- Dark mode toggle (currently always dark, but design supports light mode)
- Animation library for micro-interactions
- Component library extraction for reuse in the demo dApp
