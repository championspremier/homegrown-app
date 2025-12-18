# Homegrown App Structure

## Overview

This document explains the folder structure and how the application is organized.

## Main Entry Point

**`src/index.html`** - This is the main application entry point
- Contains the full layout: sidebar, main-content area, top-bar
- Loads shared layout CSS and JS
- All page content is dynamically loaded into the `contentArea` div

## Folder Structure

```
src/
├── index.html                    # Main app entry point (DO NOT DELETE)
├── app/
│   ├── layout/                   # Shared layout files
│   │   ├── layout.css           # Global styles, CSS variables, theme
│   │   └── layout.js             # Theme toggle, sidebar, page loading
│   └── views/                    # Role-specific page content
│       ├── player/               # ✅ Player pages (implemented)
│       │   ├── home/
│       │   ├── schedule/
│       │   ├── solo/
│       │   ├── tracking/
│       │   └── profile/
│       ├── coach/                # ⏳ Coach pages (to be implemented)
│       ├── admin/                # ⏳ Admin pages (to be implemented)
│       └── parent/               # ⏳ Parent pages (to be implemented)
├── auth/                         # Authentication pages
│   ├── unlock/
│   └── login-signup/
└── public/                       # Static assets (icons, images)
```

## How Pages Work

1. **User clicks navigation** → `layout.js` intercepts the click
2. **Role is determined** → Currently defaults to 'player' (can be changed in `layout.js`)
3. **Page loads** → HTML fragment is fetched from `app/views/{role}/{pageName}/{pageName}.html`
4. **Content injected** → HTML is inserted into the `contentArea` div in `index.html`
5. **CSS/JS loaded** → Page-specific CSS and JS are dynamically loaded

## Key Files

### `src/index.html`
- **Purpose**: Main application shell
- **Contains**: Sidebar, top-bar, content-area container
- **DO NOT**: Put page-specific content here (use view folders instead)

### `src/app/layout/layout.css`
- **Purpose**: Global styles and CSS variables
- **Provides**: Theme variables (`--bg`, `--surface`, `--text`, etc.)
- **Used by**: All pages (player, coach, admin, parent)

### `src/app/layout/layout.js`
- **Purpose**: App-wide functionality
- **Manages**: Theme toggle, sidebar toggle, page loading
- **Role-aware**: Loads pages from `app/views/{role}/` folders

### `src/app/views/{role}/{page}/`
- **Purpose**: Role-specific page content
- **Structure**: Each page has its own folder with:
  - `{pageName}.html` - Page content (HTML fragment, no `<html>` or `<body>` tags)
  - `{pageName}.css` - Page-specific styles (uses CSS variables from layout.css)
  - `{pageName}.js` - Page-specific JavaScript

## Adding New Pages

1. Create a folder: `src/app/views/player/newpage/`
2. Add files:
   - `newpage.html` - HTML content (fragment only, no full HTML structure)
   - `newpage.css` - Styles (optional, uses layout.css variables)
   - `newpage.js` - JavaScript (optional)
3. Add navigation link in `src/index.html` sidebar:
   ```html
   <li class="button" title="New Page">
     <a href="#" data-page="newpage" class="nav-link">
       <i class="bx bx-icon"></i>
       <span class="label">New Page</span>
     </a>
   </li>
   ```

## Role System

The app supports multiple user roles. Currently, only 'player' is implemented.

### Changing Roles

In `src/app/layout/layout.js`, you can:
- Set default role: `const CURRENT_ROLE = 'player';`
- Change role programmatically: `window.setCurrentRole('coach');`

### Future Implementation

When implementing authentication:
1. After login, determine user role from auth system
2. Call `window.setCurrentRole('coach')` or appropriate role
3. The app will automatically load pages from the correct role folder

## Important Notes

- ❌ **DO NOT** create full HTML pages in view folders (no `<html>`, `<head>`, `<body>` tags)
- ✅ **DO** create HTML fragments (just the content that goes in `contentArea`)
- ✅ **DO** use CSS variables from `layout.css` in your page CSS files
- ✅ **DO** keep page-specific styles in page CSS files, not in `layout.css`

## Example Page Structure

**`src/app/views/player/home/home.html`**:
```html
<!-- Just the content, no HTML structure -->
<div class="sectionOne mySchedule">
  <h1>MY SCHEDULE</h1>
  <!-- page content -->
</div>
```

**`src/app/views/player/home/home.css`**:
```css
/* Uses CSS variables from layout.css */
.sectionOne {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
}
```

