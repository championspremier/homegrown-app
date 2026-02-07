# Views Structure

This directory contains role-specific page content for different user types.

## Folder Structure

```
src/app/views/
├── player/          # Player-specific pages (Home, Schedule, Solo, Tracking, Profile)
├── coach/           # Coach-specific pages (to be implemented)
├── admin/           # Admin-specific pages (to be implemented)
└── parent/          # Parent-specific pages (to be implemented)
```

## How It Works

1. **Main App Entry**: `src/index.html` is the main application entry point
   - Contains the layout (sidebar, main-content area)
   - Loads `src/app/layout/layout.css` and `src/app/layout/layout.js`

2. **Layout Files**: `src/app/layout/` contains shared layout resources
   - `layout.css`: Global styles and CSS variables
   - `layout.js`: Theme toggle, sidebar toggle, and page loading logic

3. **Role-Specific Pages**: Each role folder contains page content
   - Each page has its own folder: `{pageName}/`
   - Each page folder contains: `{pageName}.html`, `{pageName}.css`, `{pageName}.js`
   - Example: `player/home/home.html`, `player/home/home.css`, `player/home/home.js`

## Page Loading

When a user navigates to a page:
1. `layout.js` determines the current user role (default: 'player')
2. It loads the HTML fragment from `app/views/{role}/{pageName}/{pageName}.html`
3. It injects the HTML into the `contentArea` div in `index.html`
4. It dynamically loads the page-specific CSS and JS files

## Adding New Roles

To add support for a new role (e.g., 'coach'):
1. Create a folder: `src/app/views/coach/`
2. Create page folders: `coach/home/`, `coach/schedule/`, etc.
3. Add page files: `home.html`, `home.css`, `home.js`
4. Update `index.html` sidebar navigation if needed
5. Set the role in `layout.js` or via authentication

## Current Status

- ✅ **Player**: Fully implemented with all pages
- ⏳ **Coach**: Folder created, pages to be implemented
- ⏳ **Admin**: Folder created, pages to be implemented
- ⏳ **Parent**: Folder created, pages to be implemented

