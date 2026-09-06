# SHANTEL SALES & STORE SYSTEM

Complete sales, inventory, and purchasing management system built with Next.js, NestJS, and PostgreSQL.

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** NestJS, TypeScript, Prisma
- **Database:** PostgreSQL
- **API:** REST /api/v1

## Project Structure

shantel-sales-store/
├── frontend/ # Next.js application
├── backend/ # NestJS API
├── prisma/ # Database schema
└── documentation/ # Project docs


## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Git

### Frontend Setup
```bash
cd frontend
pnpm install
pnpm run dev
# Runs on http://localhost:3000
```

### Backend Setup
```bash
cd backend
pnpm install
pnpm prisma db push
pnpm run start:dev
# Runs on http://localhost:3001
```

### Environment Configuration

Create `.env` files:

**backend/.env**

DATABASE_URL=postgresql://user:password@localhost:5432/shantel
JWT_SECRET=your_secret
API_PORT=3001


**frontend/.env.local**

NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1


## API Documentation

- Swagger Docs: http://localhost:3001/api/docs
- API Base: http://localhost:3001/api/v1

## Development Workflow

1. Create feature branch: `git checkout -b feature/feature-name` 
2. Make changes
3. Test locally
4. Commit: `git commit -m "feat: description"` 
5. Push: `git push origin feature/feature-name` 
6. Create Pull Request

## Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e
```

## Deployment

[Instructions coming in Phase 23]

## Documentation

- [Architecture](./documentation/architecture/)
- [Database Design](./documentation/database/)
- [API Guidelines](./documentation/api/)
- [Business Rules](./documentation/business-rules/)

## Support

Contact: [support email]

---

**Last Updated:** September 4, 2026
**Version:** 1.0
