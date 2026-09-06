# Database Migrations

## Strategy

- **Single Source of Truth**: `schema.prisma` 
- **Version Control**: All migrations tracked in git
- **Reversibility**: Each migration can be rolled back
- **Production Safe**: Migrations tested before deployment

## Migration Workflow

### Creating a Migration

```bash
# 1. Modify schema.prisma
# 2. Create migration
pnpm prisma migrate dev --name add_feature_description

# 3. Review generated SQL
cat prisma/migrations/[timestamp]_add_feature_description/migration.sql

# 4. Commit to git
git add prisma/migrations/
git commit -m "db: add feature description"
```

### Applying Migrations

```bash
# Development
pnpm prisma migrate dev

# Production
pnpm prisma migrate deploy

# Dry run (preview)
pnpm prisma migrate resolve --applied migration_name
```

### Rolling Back

```bash
# Development only
pnpm prisma migrate resolve --rolled-back migration_name

# Production: Create inverse migration manually
```

## Important Rules

1. **Never edit migrations manually** — always use schema.prisma
2. **Test migrations locally first** — before applying to production
3. **Backup before production migrations** — always
4. **Keep migrations small** — easier to debug
5. **Document breaking changes** — in migration files