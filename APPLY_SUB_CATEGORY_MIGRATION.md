# Apply Sub-Category Migration

## Quick Start

Run these commands in the `ds-audit-app-server` directory:

### Option 1: Using Prisma Migrate (Recommended)

```bash
# Generate a new migration
npx prisma migrate dev --name add_sub_category_to_item

# This will:
# 1. Create a new migration file
# 2. Apply it to your database
# 3. Regenerate the Prisma client
```

### Option 2: Manual SQL Migration

If you prefer to run the SQL manually:

```bash
# Apply the migration SQL
psql -U your_username -d your_database_name -f prisma/migrations/add_sub_category_to_item.sql

# Then regenerate Prisma client
npx prisma generate
```

### Option 3: Using Prisma Studio

```bash
# Open Prisma Studio
npx prisma studio

# Manually add the sub_category column through the UI
```

## Verify Migration

After applying the migration, verify it worked:

```bash
# Check the schema
npx prisma db pull

# Or connect to your database and check
psql -U your_username -d your_database_name
\d "Item"
```

You should see a `sub_category` column of type `TEXT`.

## Restart the Server

After migration, restart your development server:

```bash
npm run dev
```

## Troubleshooting

### Error: "Column already exists"

If you get an error that the column already exists, it means the migration was already applied. Just run:

```bash
npx prisma generate
```

### Error: "Cannot find module '@prisma/client'"

Run:

```bash
npm install
npx prisma generate
```

### Migration not applying

Try resetting and reapplying:

```bash
npx prisma migrate reset
npx prisma migrate dev
```

**Warning**: This will delete all data in your database!
