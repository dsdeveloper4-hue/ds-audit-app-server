# DS Audit App - Server Setup Guide

## Database Schema Overview

The application uses the following database structure:
- **Users & Roles**: User authentication with role-based permissions
- **Rooms & Items**: Base entities for audit management
- **ItemDetails**: Junction table linking Rooms, Items, and Audits (replaces old Inventory/AuditRecord)
- **Audits**: Audit records with participants and item details
- **AuditHistory**: Tracks all changes made during audits

## Initial Setup

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Setup Environment Variables
Create a `.env` file based on `.env.example`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/ds_audit_db"
ACCESS_TOKEN_SECRET="your-secret-key"
REFRESH_TOKEN_SECRET="your-refresh-secret-key"
ACCESS_TOKEN_EXPIRES_IN=86400
REFRESH_TOKEN_EXPIRES_IN=604800
SALT_ROUNDS=10
```

### 3. Database Migration
```bash
npx prisma migrate dev
```

### 4. Seed Database with Permissions & Default Admin
```bash
pnpm seed
```

This will create:
- **4 Roles**: ADMIN, MANAGER, AUDITOR, VIEWER
- **12 Permissions**: All CRUD operations for audit, room, and item resources
- **Default Admin User**:
  - Mobile: `01700000000`
  - Password: `admin123`

### 5. Start Development Server
```bash
pnpm dev
```

## Permission System

### Roles & Permissions

#### ADMIN
- Full access to all resources (create, read, update, delete)

#### MANAGER
- Can create, read, and update all resources
- Cannot delete resources

#### AUDITOR
- Can create, read, and update audits
- Can read rooms and items
- Cannot delete or modify rooms/items

#### VIEWER
- Read-only access to all resources

### Resource Permissions

Each resource (audit, room, item) has 4 permission actions:
- `create`: Create new records
- `read`: View records
- `update`: Modify existing records
- `delete`: Remove records

## API Endpoints

All endpoints require authentication via Bearer token, except `/auth/login` and `/auth/register`.

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login

### Rooms
- `POST /api/v1/rooms` - Create room (requires `room:create`)
- `GET /api/v1/rooms` - List all rooms (requires `room:read`)
- `GET /api/v1/rooms/:id` - Get room details (requires `room:read`)
- `PATCH /api/v1/rooms/:id` - Update room (requires `room:update`)
- `DELETE /api/v1/rooms/:id` - Delete room (requires `room:delete`)

### Items
- `POST /api/v1/items` - Create item (requires `item:create`)
- `GET /api/v1/items` - List all items (requires `item:read`)
- `GET /api/v1/items/:id` - Get item details (requires `item:read`)
- `PATCH /api/v1/items/:id` - Update item (requires `item:update`)
- `DELETE /api/v1/items/:id` - Delete item (requires `item:delete`)

### Audits
- `POST /api/v1/audits` - Create audit (requires `audit:create`)
- `GET /api/v1/audits` - List all audits (requires `audit:read`)
- `GET /api/v1/audits/:id` - Get audit details with item details (requires `audit:read`)
- `PATCH /api/v1/audits/:id` - Update audit status/notes (requires `audit:update`)
- `DELETE /api/v1/audits/:id` - Delete audit (requires `audit:delete`)

### Audit Item Details
- `POST /api/v1/audits/:audit_id/items` - Add item to audit (requires `audit:update`)
- `PATCH /api/v1/audits/items/:detail_id` - Update item quantities (requires `audit:update`)
- `DELETE /api/v1/audits/items/:detail_id` - Remove item from audit (requires `audit:delete`)

## Audit Workflow

1. **Create Audit**: Create an audit for a specific month/year
2. **Add Items**: Add room-item combinations to the audit
3. **Update Quantities**: Auditors update the quantities (active, broken, inactive)
4. **Track History**: All changes are automatically logged in AuditHistory
5. **Change Status**: Update audit status (IN_PROGRESS → COMPLETED or CANCELED)

## Key Changes from Previous Implementation

### Removed Models
- ❌ `Inventory` (replaced by ItemDetails per audit)
- ❌ `AuditRecord` (replaced by ItemDetails)
- ❌ `AuditRecordParticipant` (replaced by direct Audit-User relation)

### New/Updated Models
- ✅ `ItemDetails`: Junction table for Room-Item-Audit combinations
- ✅ `AuditHistory`: Tracks all audit changes
- ✅ `Audit.participants`: Many-to-many relation with users

### Status Values
- Old: `"in_progress"`, `"completed"`, `"reviewed"`
- New: `"IN_PROGRESS"`, `"COMPLETED"`, `"CANCELED"` (enum values)

## Development Tips

1. **Check Permissions**: Use the admin user to grant/modify permissions
2. **Audit History**: All updates to audits are automatically logged
3. **Cascade Deletes**: Deleting an audit will remove all associated ItemDetails
4. **Unique Constraints**: One audit per month/year, one ItemDetail per room-item-audit combination

## Troubleshooting

### Permission Denied Error
- Ensure user has the correct role and permissions
- Run seed script to recreate permissions: `pnpm seed`

### Database Connection Error
- Check DATABASE_URL in .env
- Ensure PostgreSQL is running

### TypeScript Errors
- Run `npx prisma generate` to regenerate Prisma Client
- Clear node_modules and reinstall if needed

## Next Steps

1. Login with default admin credentials
2. Create additional users with appropriate roles
3. Create rooms and items
4. Start creating audits and adding item details
