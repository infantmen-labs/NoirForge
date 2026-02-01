# Getting Started with the NoirForge Design System

## Quick Start

The NoirForge design system provides a cohesive set of styles and components for all interactive pages. It's built on **CSS Modules** and **CSS Variables** (no new dependencies).

## For Developers

### Adding a New Interactive Page

1. **Create your page component** (e.g., `src/pages/mypage.jsx`)

2. **Create a CSS module** (e.g., `src/pages/mypage.module.css`) with:
   ```css
   @import './shared.module.css';
   
   /* Your custom styles only */
   .myCustomElement {
     /* custom CSS here */
   }
   ```

3. **Use shared classes** in your JSX:
   ```jsx
   import Layout from '@theme/Layout';
   import styles from './mypage.module.css';

   export default function MyPage() {
     return (
       <Layout title="My Page">
         <div className={styles.page}>
           <div className={styles.container}>
             <header className={styles.header}>
               <h1 className={styles.title}>My Page Title</h1>
               <p className={styles.subtitle}>Description here</p>
             </header>

             <section className={styles.card}>
               <div className={styles.cardTitle}>
                 <h2>Card Title</h2>
               </div>
               <p className={styles.small}>Card content</p>
             </section>
           </div>
         </div>
       </Layout>
     );
   }
   ```

### Available Shared Classes

#### Layout & Structure
- `.page` - Full-height page container with background gradient
- `.container` - Centered max-width container (1200px)
- `.header` - Header section with bottom margin
- `.grid` - Responsive grid (single column → 2 columns at 900px+)
- `.row` - Flexbox row with wrapping

#### Typography
- `.title` - Page title (responsive, clamps 1.75rem-2.5rem)
- `.subtitle` - Page subtitle (secondary text color)
- `.small` - Small text (0.875rem, secondary color)
- `.mono` - Monospace font for code

#### Cards & Containers
- `.card` - Glassmorphic card with hover state
- `.cardTitle` - Card title container (flex, space-between)
- `.outputBox` - Container for output/results
- `.outputLine` - Flex line for output items
- `.outputText` - Styled code/text output display

#### Forms
- `.textarea` - Full-width textarea with monospace option
- `.file` - File input styling
- `.search` - Search input (max-width: 520px)
- `.row` - Flex row to group form buttons

#### Data Display
- `.kv` - Key-value grid display (140px/1fr columns)
- `.k` - Key label (secondary text, small)
- `.v` - Value display
- `.table` - Styled table with sticky headers
- `.tableWrap` - Table wrapper with scroll
- `.badges` - Badge container (flex)
- `.badge` - Individual badge pill

#### Alerts & Feedback
- `.badgeOk` - Success alert (green)
- `.badgeErr` - Error alert (red)
- `.badgeWarn` - Warning alert (amber)
- `.badgeInfo` - Info alert (blue)
- `.badgeTitle` - Alert title (bold, top margin)

#### Charts & Visualization
- `.sparkline` - Sparkline chart container
- `.sparklineEmpty` - Empty state sparkline

#### Actions
- `.actions` - Container for action buttons (flex, gap)

### Using Design Tokens

All colors and spacing are available as CSS variables in `custom.css`:

```css
/* Colors */
color: var(--nf-color-text-primary);
background: var(--nf-color-bg-dark);
border-color: var(--nf-color-border-light);

/* Spacing */
padding: var(--nf-spacing-lg);
margin-bottom: var(--nf-spacing-md);
gap: var(--nf-spacing-sm);

/* Radii */
border-radius: var(--nf-radius-md);
```

### Responsive Design

The system uses CSS media queries for responsive behavior:

```css
@media (max-width: 640px) {
  /* Mobile adjustments */
}

@media (min-width: 900px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 480px) {
  /* Extra small screens */
}
```

### Form Elements

All form elements (textarea, input, file) share consistent styling:

```jsx
<textarea
  className={styles.textarea}
  placeholder="Paste JSON"
  value={value}
  onChange={handleChange}
/>

<input
  className={styles.file}
  type="file"
  onChange={handleFileSelect}
/>

<input
  className={styles.search}
  placeholder="Search..."
  value={query}
  onChange={handleSearch}
/>
```

### Alerts & Badges

For user feedback, use semantic badge classes:

```jsx
{/* Success alert */}
<div className={styles.badgeOk}>
  <div className={styles.badgeTitle}>Valid manifest v1</div>
  <div className={styles.kv}>
    <div className={styles.k}>name</div>
    <div className={styles.v}>{manifest.name}</div>
  </div>
</div>

{/* Error alert */}
{error && (
  <div className={styles.badgeErr}>
    <div className={styles.badgeTitle}>Validation errors</div>
    <ul>
      {errors.map(err => <li key={err}>{err}</li>)}
    </ul>
  </div>
)}

{/* Inline badges */}
<div className={styles.badges}>
  <span className={styles.badge}>important</span>
  <span className={styles.badge}>zk</span>
</div>
```

## For Designers

### Color System

The design uses a **dark theme with semantic colors**:

- **Primary Backgrounds**: Deep navy gradients (#0b1020, #0f172a, #111827)
- **Text**: White with varying opacity for hierarchy
- **Accent Colors**: Green (success), Red (error), Amber (warning), Blue (info)
- **UI Elements**: Semi-transparent borders and backgrounds with glassmorphism

See `VISUAL_REFERENCE.md` for detailed color specifications.

### Typography

- **Display**: Responsive clamp sizing for flexibility
- **Body**: 1rem, 1.5-1.6 line height for readability
- **Small**: 0.875rem for secondary information
- **Mono**: Code blocks and data display

### Spacing

The system uses an 8px base unit:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 0.25rem | Very tight spacing |
| sm | 0.5rem | Button groups, small gaps |
| md | 0.75rem | Component padding |
| lg | 1rem | Card padding |
| xl | 1.5rem | Section margins |

### Mobile-First Approach

- Design starts at 480px (small phone)
- Enhanced at 640px (larger phone)
- Grid layout activates at 900px (tablet+)
- Max width at 1200px (desktop)

### Accessibility

Every component includes:
- ✓ WCAG AA color contrast
- ✓ Visible focus indicators
- ✓ Keyboard navigation support
- ✓ Semantic HTML structure
- ✓ Proper heading hierarchy

## Common Patterns

### Card with Data
```jsx
<section className={styles.card}>
  <div className={styles.cardTitle}>
    <h2>Title</h2>
  </div>
  <p className={styles.small}>Description</p>
  <div className={styles.kv}>
    <div className={styles.k}>Key</div>
    <div className={styles.v}>Value</div>
  </div>
</section>
```

### Two-Column Layout
```jsx
<div className={styles.grid}>
  <section className={styles.card}>
    {/* Left column */}
  </section>
  <section className={styles.card}>
    {/* Right column - stacks on mobile */}
  </section>
</div>
```

### Form Group
```jsx
<div style={{ marginTop: '0.75rem' }}>
  <label className={styles.small}>Upload file</label>
  <input className={styles.file} type="file" />
  <div className={styles.small} style={{ marginTop: '0.35rem' }}>
    Supported formats: .json, .txt
  </div>
</div>
```

### Action Row
```jsx
<div className={styles.row}>
  <button className="button button--primary button--sm">Primary</button>
  <button className="button button--secondary button--sm">Secondary</button>
</div>
```

## Customization

To override a shared component for a specific page:

```css
/* mypage.module.css */
@import './shared.module.css';

/* Override specific to this page */
.card {
  padding: 2rem; /* Increase padding */
  background: rgba(0, 0, 0, 0.5); /* Darker background */
}
```

## Maintaining Consistency

When updating styles:

1. **For global changes**: Update `shared.module.css` or `custom.css`
2. **For page-specific changes**: Update the page's `.module.css` file
3. **For color/spacing changes**: Update `custom.css` CSS variables
4. **For components**: Always check if a shared class exists before creating new CSS

## Troubleshooting

### Styles not applying?
- Check that the CSS Module is imported correctly
- Verify class names match between CSS and JSX
- Check browser DevTools for specificity conflicts

### Layout broken on mobile?
- Verify media queries are present in shared.module.css
- Check that flex/grid classes wrap properly
- Test at 640px and 480px breakpoints

### Colors not matching?
- Verify you're using CSS variable names (e.g., `--nf-color-text-primary`)
- Check custom.css for the variable definition
- Look up the value in VISUAL_REFERENCE.md

## Resources

- **Design System Details**: See `src/pages/DESIGN_SYSTEM.md`
- **Visual Reference**: See `VISUAL_REFERENCE.md`
- **Implementation Summary**: See `DESIGN_SYSTEM_CHANGES.md`
- **Shared CSS**: `src/pages/shared.module.css` (444 lines)
- **Tokens**: `src/css/custom.css` (color and spacing variables)

## Next Steps

1. Review `VISUAL_REFERENCE.md` for the complete design specifications
2. Open a page (e.g., `demo.jsx`) to see the system in action
3. Try adding a new section using shared classes
4. Test on mobile using browser DevTools
5. Add new pages following the pattern in "Adding a New Interactive Page"
