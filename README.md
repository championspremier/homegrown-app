# Homegrown App

A comprehensive soccer development platform with role-based authentication for players, parents, and coaches.

## Features

- **Player Accounts**: Sign up and track training progress
- **Parent Accounts**: Manage multiple player accounts, view schedules and tracking
- **Coach Accounts**: Dashboard for managing players, communication, schedules, and more
- **Account Switcher**: Seamless switching between linked parent/player accounts
- **Notion Integration**: Automatic sync of player signups to Notion database
- **Theme Toggle**: Light/dark mode support

## Project Structure

```
homegrown-app/
├── src/
│   ├── auth/              # Authentication pages
│   │   ├── login-signup/  # Player/Parent login & signup
│   │   ├── coach-login/   # Coach login & signup
│   │   └── unlock/        # Unlock/login page
│   ├── app/
│   │   ├── layout/        # Shared layout components
│   │   └── views/         # Role-specific views
│   │       ├── player/    # Player dashboard pages
│   │       ├── parent/    # Parent dashboard pages
│   │       ├── coach/     # Coach dashboard pages
│   │       └── admin/     # Admin dashboard pages
│   └── index.html         # Main app entry point
├── supabase/
│   └── functions/         # Supabase Edge Functions
│       └── sync-to-notion/ # Notion integration
├── sql/
│   ├── migrations/        # Database migration scripts
│   └── fixes/             # Database fix scripts
├── docs/                  # Documentation
│   ├── setup/             # Setup guides
│   ├── troubleshooting/   # Troubleshooting guides
│   ├── planning/          # Planning documents
│   └── reference/         # Reference documentation
└── public/                # Static assets

```

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd homegrown-app
   ```

2. **Set up Supabase**
   - Follow the [Supabase Setup Guide](./docs/setup/SUPABASE_SETUP.md)
   - Run the migration scripts in `sql/migrations/`

3. **Configure Environment**
   - Update `src/auth/config/supabase.js` with your Supabase credentials
   - Set up Notion integration (see [Notion Troubleshooting](./docs/troubleshooting/NOTION_TROUBLESHOOTING.md))

4. **Deploy Edge Functions**
   - Follow the [Edge Function Deployment Guide](./docs/setup/DEPLOY_EDGE_FUNCTION.md)

5. **Start Development**
   - Open `src/index.html` in a local server
   - Or use a simple HTTP server: `python -m http.server 8000`

## Documentation

### Setup Guides
- [Supabase Setup](./docs/setup/SUPABASE_SETUP.md) - Database and authentication setup
- [Edge Function Deployment](./docs/setup/DEPLOY_EDGE_FUNCTION.md) - Deploying Supabase Edge Functions
- [Zoho CRM Setup](./docs/setup/ZOHO_CRM_SETUP.md) - Zoho integration setup

### Troubleshooting
- [Notion Integration](./docs/troubleshooting/NOTION_TROUBLESHOOTING.md) - Fix Notion sync issues
- [Parent Signup Errors](./docs/troubleshooting/FIX_PARENT_SIGNUP_ERROR.md) - Common parent signup issues

### Planning & Reference
- [Parent-Player Signup Plan](./docs/planning/PARENT_PLAYER_SIGNUP_PLAN.md) - Implementation plan
- [Flow Documentation](./docs/reference/FLOW_DOCUMENTATION.md) - Application flow
- [Project Structure](./docs/reference/STRUCTURE.md) - Detailed structure documentation

## Database

### Migrations
Run these in order in your Supabase SQL Editor:
1. `sql/migrations/supabase-schema.sql` - Base schema
2. `sql/migrations/supabase-migration-parent-player.sql` - Parent/player support
3. `sql/migrations/supabase-coach-signup.sql` - Coach support

### Fixes
If you encounter issues, check `sql/fixes/` for specific fix scripts.

## Technologies

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Integrations**: Notion API, Zoho CRM (in progress)
- **Icons**: Boxicons
- **Fonts**: Racing Sans One, Zalando Sans Expanded

## User Roles

### Player
- Sign up with player information
- View schedule and training plans
- Track progress
- Solo training sessions

### Parent
- Sign up with parent + player information
- Manage linked player accounts
- View schedules and tracking for all linked players
- Switch between parent and player views

### Coach
- Separate login/signup flow
- Dashboard with communication tools
- People management
- Schedule management
- Solo creation tools
- Plans and payments management

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

[Your License Here]
