---
paths: ["src/components/**", "src/pages/**", "src/features/**"]
---

# Frontend Rules

<!-- CUSTOMIZE: Replace with your actual frontend conventions -->

## Component Structure
- One component per file
- File name matches the default export
- Props interface defined above the component

## State Management
- Use the project's state management solution (see CLAUDE.md)
- Don't prop-drill more than 2 levels deep
- Colocate state with the component that owns it

## Accessibility
- All interactive elements must be keyboard accessible
- Images need alt text
- Form inputs need labels
- Use semantic HTML elements

## Performance
- Memoize expensive computations
- Lazy-load routes and heavy components
- Don't render lists without keys
