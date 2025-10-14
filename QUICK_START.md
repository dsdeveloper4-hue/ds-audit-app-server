# Quick Start Guide - DS Audit App

## Prerequisites
- Node.js installed
- PostgreSQL database running
- Database URL configured in `.env` file

## Setup Steps

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables
Create/update `.env` file:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/ds_audit_db"
NODE_ENV="development"
PORT=5000
SALT_ROUNDS=10
JWT_ACCESS_TOKEN_SECRET="your-access-token-secret"
JWT_REFRESH_TOKEN_SECRET="your-refresh-token-secret"
JWT_ACCESS_TOKEN_EXPIRES_IN=3600
JWT_REFRESH_TOKEN_EXPIRES_IN=86400
```

### 3. Run Database Migrations
```bash
npx prisma migrate dev
```

### 4. (Optional) Seed Database with Sample Data
```bash
npx prisma db seed
```

### 5. Start Development Server
```bash
npm run dev
```

Server should now be running at `http://localhost:5000`

---

## Testing the API

### Step 1: Create Initial Setup

#### 1.1 Create Rooms
```bash
# Room 1
curl -X POST http://localhost:5000/api/v1/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Conference Room A",
    "floor": "2nd Floor",
    "department": "Administration"
  }'

# Room 2
curl -X POST http://localhost:5000/api/v1/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "IT Lab",
    "floor": "3rd Floor",
    "department": "IT"
  }'
```

#### 1.2 Create Items
```bash
# Item 1
curl -X POST http://localhost:5000/api/v1/items \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Office Chair",
    "category": "Furniture",
    "unit": "pieces"
  }'

# Item 2
curl -X POST http://localhost:5000/api/v1/items \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Desktop Computer",
    "category": "Electronics",
    "unit": "pieces"
  }'

# Item 3
curl -X POST http://localhost:5000/api/v1/items \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Whiteboard",
    "category": "Office Supplies",
    "unit": "pieces"
  }'
```

#### 1.3 Create Inventory (Bulk)
```bash
# Create all items for Conference Room A
curl -X POST http://localhost:5000/api/v1/inventories/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "ROOM_ID_FROM_STEP_1.1"
  }'

# Create all items for IT Lab
curl -X POST http://localhost:5000/api/v1/inventories/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "ROOM_ID_FROM_STEP_1.1"
  }'
```

---

### Step 2: Create Monthly Audit

```bash
curl -X POST http://localhost:5000/api/v1/audits \
  -H "Content-Type: application/json" \
  -d '{
    "month": 10,
    "year": 2025,
    "notes": "October 2025 Monthly Audit"
  }'
```

**Expected Result:**
- System creates audit records for ALL inventory items
- All values (recorded_current, recorded_active, etc.) are set to 0
- Ready for you to start adding values

---

### Step 3: View Audit with Records

```bash
curl -X GET http://localhost:5000/api/v1/audits/AUDIT_ID
```

**Response includes:**
- Audit details
- All audit records grouped by room
- Each record shows room, item, and current values (all 0)

---

### Step 4: Update Audit Record Values

#### Single Update
```bash
curl -X PATCH http://localhost:5000/api/v1/audit-records/RECORD_ID \
  -H "Content-Type: application/json" \
  -d '{
    "recorded_current": 50,
    "recorded_active": 48,
    "recorded_broken": 1,
    "recorded_inactive": 1,
    "notes": "Inspected on 2025-10-15"
  }'
```

#### Bulk Update (More Efficient)
```bash
curl -X PATCH http://localhost:5000/api/v1/audit-records/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      {
        "id": "RECORD_ID_1",
        "recorded_current": 50,
        "recorded_active": 48,
        "recorded_broken": 1,
        "recorded_inactive": 1
      },
      {
        "id": "RECORD_ID_2",
        "recorded_current": 30,
        "recorded_active": 28,
        "recorded_broken": 2,
        "recorded_inactive": 0
      }
    ]
  }'
```

---

### Step 5: Complete Audit

```bash
curl -X PATCH http://localhost:5000/api/v1/audits/AUDIT_ID/complete
```

**What happens:**
- Audit status changes to "completed"
- Inventory is updated with the recorded values
- Audit records are preserved for history

---

### Step 6: Next Month

Create a new audit for the next month:
```bash
curl -X POST http://localhost:5000/api/v1/audits \
  -H "Content-Type: application/json" \
  -d '{
    "month": 11,
    "year": 2025,
    "notes": "November 2025 Monthly Audit"
  }'
```

**System automatically:**
- Creates fresh audit records for ALL inventory
- Resets all values to 0
- Ready for new month's inspection

---

## Common Workflows

### Workflow 1: Add New Room During Operation
```bash
# 1. Create room
POST /rooms

# 2. Create inventory for all items in this room
POST /inventories/bulk
{
  "room_id": "new-room-id"
}

# 3. Next audit will automatically include this room
```

### Workflow 2: Add New Item Type
```bash
# 1. Create item
POST /items

# 2. Add to existing rooms
POST /inventories
{
  "room_id": "room-id",
  "item_id": "new-item-id"
}

# 3. Next audit will automatically include this item
```

### Workflow 3: View Audit History
```bash
# Get all audits (sorted by year/month desc)
GET /audits

# View specific audit details
GET /audits/{audit_id}
```

---

## Testing with Postman/Insomnia

Import the following collection structure:

1. **Setup Phase**
   - Create Rooms
   - Create Items
   - Create Bulk Inventory

2. **Audit Phase**
   - Create Audit
   - Get Audit by ID
   - Update Audit Records (Single/Bulk)
   - Complete Audit

3. **Management**
   - Get All Audits
   - Get All Rooms
   - Get All Items
   - Get Inventories by Room

---

## Database Schema Check

View current database schema:
```bash
npx prisma studio
```

This opens a web interface to browse your data.

---

## Troubleshooting

### Database Connection Error
```bash
# Check your DATABASE_URL in .env
# Ensure PostgreSQL is running
# Test connection:
npx prisma db pull
```

### Migration Issues
```bash
# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Then run migrations again
npx prisma migrate dev
```

### Port Already in Use
```bash
# Change PORT in .env file
PORT=5001
```

---

## API Endpoints Summary

| Module | Endpoint | Method | Purpose |
|--------|----------|--------|---------|
| **Rooms** | `/rooms` | POST | Create room |
| | `/rooms` | GET | Get all rooms |
| | `/rooms/:id` | GET | Get room by ID |
| | `/rooms/:id` | PATCH | Update room |
| | `/rooms/:id` | DELETE | Delete room |
| **Items** | `/items` | POST | Create item |
| | `/items` | GET | Get all items |
| | `/items/:id` | GET | Get item by ID |
| | `/items/:id` | PATCH | Update item |
| | `/items/:id` | DELETE | Delete item |
| **Inventory** | `/inventories` | POST | Create single inventory |
| | `/inventories/bulk` | POST | Create all items for room |
| | `/inventories` | GET | Get all inventories |
| | `/inventories/room/:room_id` | GET | Get room inventories |
| | `/inventories/:id` | PATCH | Update inventory |
| **Audits** | `/audits` | POST | **Create audit (auto-creates records with 0 values)** |
| | `/audits` | GET | Get all audits |
| | `/audits/:id` | GET | Get audit by ID |
| | `/audits/:id` | PATCH | Update audit |
| | `/audits/:id/complete` | PATCH | Complete audit & update inventory |
| **Audit Records** | `/audit-records/:id` | PATCH | **Update record values** |
| | `/audit-records/bulk` | PATCH | **Bulk update record values** |
| | `/audit-records/audit/:audit_id` | GET | Get all records for audit |

---

## Next Steps

1. ✅ Set up your rooms and items
2. ✅ Create inventory for all rooms
3. ✅ Create your first audit
4. ✅ Start updating audit record values
5. ✅ Complete the audit
6. ✅ Create next month's audit

For detailed API documentation, see `API_DOCUMENTATION.md`
