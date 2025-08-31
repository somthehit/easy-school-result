# Database Migration Guide

## Current Issue
The application is failing with a database error because the database tables haven't been created yet. You need to run the database migrations to create the necessary tables.

## Steps to Fix

### 1. Run Database Migrations
Open a terminal in your project root and run:

```bash
# Generate migration files (if needed)
npm run drizzle:generate

# Apply migrations to database
npm run drizzle:migrate
```

Or using npx directly:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 2. Verify Database Connection
Make sure your `.env` file has the correct `DATABASE_URL`:

```env
DATABASE_URL=your_database_connection_string
```

### 3. Check Migration Files
The following migration files should exist in the `drizzle/` directory:
- `0000_shocking_namor.sql` (main schema)
- `0003_flexible_subject_parts.sql` (if you created it)
- `0004_fix_master_subject_constraints.sql` (if you created it)

### 4. Manual Migration (Alternative)
If the automatic migration doesn't work, you can manually run the SQL from the migration files in your database client.

## Error Handling Added
I've added error handling to the subjects actions to prevent crashes when the database isn't ready:
- Returns empty data instead of crashing
- Logs errors for debugging
- Allows the app to load even without database connection

## Next Steps
1. Run the migrations as described above
2. Restart your development server
3. The subjects page should now work correctly

## Troubleshooting
- If migrations fail, check your database connection string
- Ensure your database server is running
- Check the console logs for specific error messages
- Verify you have the correct database permissions
