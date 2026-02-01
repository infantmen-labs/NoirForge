# NoirForge Design System - Visual Reference

## Color Palette

### Backgrounds
```
Dark Gradient:   #0b1020
Mid Gradient:    #0f172a  
Light Gradient:  #111827

Card BG:         rgba(0, 0, 0, 0.35)
Card BG Hover:   rgba(0, 0, 0, 0.38)
```

### Text Colors
```
Primary Text:    rgba(255, 255, 255, 0.95)
Secondary Text:  rgba(255, 255, 255, 0.7)
Tertiary Text:   rgba(255, 255, 255, 0.5)
```

### State Colors
```
Success:  #10b981 (Emerald)
Error:    #ef4444 (Red)
Warning:  #f59e0b (Amber)
Info:     #3b82f6 (Blue)
Primary:  #2f6feb (Sky)
```

## Component Library

### Cards
```
Border:        1px solid rgba(255, 255, 255, 0.12)
Border Hover:  1px solid rgba(255, 255, 255, 0.18)
Radius:        12px (md)
Padding:       1.5rem (1rem on mobile)
Backdrop:      blur(8px)
Transition:    0.2s ease-in-out
```

### Forms
```
Border:        1px solid rgba(255, 255, 255, 0.12)
Border Focus:  rgba(255, 255, 255, 0.28)
Background:    rgba(0, 0, 0, 0.35)
BG Focus:      rgba(0, 0, 0, 0.4)
Radius:        8px (sm)
Padding:       0.75rem
Outline:       2px solid rgba(47, 111, 235, 0.5) + offset 2px
```

### Buttons
```
Primary:       #2f6feb (Docusaurus primary)
Hover:         #2a63d4 (darker variant)
Border:        1px solid (inherited from theme)
Transition:    0.2s ease
```

### Badges
```
Success Badge:
  Border:      1px solid rgba(16, 185, 129, 0.35)
  Background:  rgba(16, 185, 129, 0.08)
  
Error Badge:
  Border:      1px solid rgba(239, 68, 68, 0.35)
  Background:  rgba(239, 68, 68, 0.08)
  
Warning Badge:
  Border:      1px solid rgba(245, 158, 11, 0.35)
  Background:  rgba(245, 158, 11, 0.08)

Info Badge:
  Border:      1px solid rgba(59, 130, 246, 0.35)
  Background:  rgba(59, 130, 246, 0.08)

Padding:       1rem
Radius:        8px
```

## Typography Scale

```
Page Title:    clamp(1.75rem, 5vw, 2.5rem)  | Font weight 700, Letter spacing -0.01em
Card Title:    1.25rem                        | Font weight 600
Text/P:        1rem                           | Line height 1.5-1.6
Small Text:    0.875rem                       | Color secondary
Mono/Code:     0.9em (relative)              | Font family ui-monospace
```

## Spacing Scale

```
xs = 0.25rem (4px)
sm = 0.5rem  (8px)
md = 0.75rem (12px)
lg = 1rem    (16px)
xl = 1.5rem  (24px)
2xl = 2rem   (32px)
3xl = 2.5rem (40px)
```

## Border Radius Scale

```
sm = 8px   (form elements, small UI)
md = 12px  (cards, modals)
lg = 14px  (legacy, being standardized)
```

## Breakpoints

```
480px   - Mobile extra small
640px   - Mobile
900px   - Tablet / Desktop transition (grid → 2 columns)
1200px  - Desktop max width
```

## Component States

### Card States
```
Default:   Background: rgba(0, 0, 0, 0.35), Border: light
Hover:     Background: rgba(0, 0, 0, 0.38), Border: lighter
Active:    (inherited from child interactive elements)
```

### Button States
```
Default:   Primary or Secondary variant
Hover:     Darker background
Focus:     2px outline with shadow
Disabled:  Opacity 0.6, cursor not-allowed (Docusaurus default)
```

### Input States
```
Default:   Border light, background dim
Focus:     Border lighter, outline colored, background slightly brighter
Error:     (use error badge nearby for feedback)
Success:   (use success badge for confirmation)
```

## Shadows & Depth

The design uses minimal shadows, relying on:
- Border colors for definition
- Backdrop blur for depth (cards)
- Background opacity changes for layering

No drop shadows on cards for minimal visual clutter.

## Animation Specifications

```
Buttons:      transition: all 0.2s ease
Forms:        transition: all 0.15s ease
Hover States: transition: all 0.2s ease-in-out
```

## Accessibility

### Focus Indicators
```
Outline:      2px solid rgba(47, 111, 235, 0.5)
Offset:       2px
Color:        Primary blue variant
Visible:      Always visible on keyboard tab
```

### Color Contrast (WCAG AA)
```
White text on backgrounds: ✓ Meets AA
Secondary text on backgrounds: ✓ Meets AA
Links (#2f6feb): ✓ Meets AA on dark backgrounds
```

### Responsive Text
```
Large titles scale from 1.75rem to 2.5rem via clamp()
Line heights ensure readability at all sizes
Font sizes remain above 14px for body text
```

## Usage Examples

### Creating a Consistent Card
```jsx
<section className={styles.card}>
  <div className={styles.cardTitle}>
    <h2>Title</h2>
  </div>
  <p className={styles.small}>Description</p>
  <div className={styles.kv}>
    <div className={styles.k}>Label</div>
    <div className={styles.v}>Value</div>
  </div>
</section>
```

### Alert/Feedback
```jsx
<div className={styles.badgeOk}>
  <div className={styles.badgeTitle}>Success!</div>
  <p className={styles.small}>Operation completed.</p>
</div>
```

### Form Group
```jsx
<div style={{ marginTop: '0.75rem' }}>
  <div className={styles.small} style={{ marginBottom: '0.35rem' }}>
    Label
  </div>
  <input className={styles.file} type="file" />
  <div className={styles.small} style={{ marginTop: '0.35rem' }}>
    Helper text
  </div>
</div>
```

## Design Philosophy

1. **Consistency First**: All pages share the same visual language
2. **Mobile-First**: Responsive design starts small and enhances up
3. **Minimal**: Reduce visual clutter with purposeful use of color and space
4. **Accessible**: WCAG AA compliance, keyboard navigation, semantic HTML
5. **Performance**: CSS Modules for scope, no animation overload
6. **Maintainability**: Centralized tokens for easy updates
