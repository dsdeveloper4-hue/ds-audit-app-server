# DS Audit App - API Documentation

## Base URL
```
http://localhost:PORT/api/v1
```

---

## 🔐 Authentication Module

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "mobile": "01700000000",
  "password": "password123"
}
```

### Refresh Token
```http
POST /auth/refresh-token
```

### Logout
```http
POST /auth/logout
```

---

## 🏢 Room Module

### Create Room
```http
POST /rooms
Content-Type: application/json

{
  "name": "Conference Room A",
  "description": "Main conference room",
  "floor": "2nd Floor",
  "department": "Administration"
}
```

### Get All Rooms
```http
GET /rooms
```

### Get Room by ID
```http
GET /rooms/{room_id}
```

### Update Room
```http
PATCH /rooms/{room_id}
Content-Type: application/json

{
  "name": "Updated Room Name",
  "description": "Updated description"
}
```

### Delete Room
```http
DELETE /rooms/{room_id}
```

---

## 📦 Item Module

### Create Item
```http
POST /items
Content-Type: application/json

{
  "name": "Office Chair",
  "category": "Furniture",
  "unit": "pieces",
  "description": "Ergonomic office chair"
}
```

### Get All Items
```http
GET /items
```

### Get Item by ID
```http
GET /items/{item_id}
```

### Update Item
```http
PATCH /items/{item_id}
Content-Type: application/json

{
  "name": "Updated Item Name",
  "category": "Updated Category"
}
```

### Delete Item
```http
DELETE /items/{item_id}
```

---

## 📊 Inventory Module

### Create Single Inventory
```http
POST /inventories
Content-Type: application/json

{
  "room_id": "uuid-of-room",
  "item_id": "uuid-of-item"
}
```

### Create Bulk Inventory (All Items for a Room)
```http
POST /inventories/bulk
Content-Type: application/json

{
  "room_id": "uuid-of-room"
}
```
**Note:** This creates inventory records for ALL items in the specified room.

### Get All Inventories
```http
GET /inventories
```

### Get Inventories by Room
```http
GET /inventories/room/{room_id}
```

### Get Inventory by ID
```http
GET /inventories/{inventory_id}
```

### Update Inventory
```http
PATCH /inventories/{inventory_id}
Content-Type: application/json

{
  "current_quantity": 50,
  "active_quantity": 45,
  "broken_quantity": 3,
  "inactive_quantity": 2
}
```

### Delete Inventory
```http
DELETE /inventories/{inventory_id}
```

---

## 📋 Audit Module (Core Feature)

### Create Audit
```http
POST /audits
Content-Type: application/json

{
  "month": 10,
  "year": 2025,
  "notes": "October 2025 Audit",
  "conducted_by": "uuid-of-user"
}
```

**Key Feature:** 
- Automatically creates audit records for **ALL existing inventory items**
- All values (recorded_current, recorded_active, recorded_broken, recorded_inactive) start at **0**
- Users then update these values during the audit process
- Each month creates a fresh audit with values reset to 0

**Response:**
```json
{
  "success": true,
  "message": "Audit created successfully with 150 records!",
  "data": {
    "audit": {
      "id": "uuid",
      "month": 10,
      "year": 2025,
      "status": "in_progress",
      "notes": "October 2025 Audit",
      "conducted_by": "uuid-of-user"
    },
    "auditRecords": [...],
    "totalRecords": 150
  }
}
```

### Get All Audits
```http
GET /audits
```

### Get Audit by ID (with all records grouped by room)
```http
GET /audits/{audit_id}
```

### Update Audit
```http
PATCH /audits/{audit_id}
Content-Type: application/json

{
  "status": "in_progress",
  "notes": "Updated notes",
  "conducted_by": "uuid-of-user"
}
```
**Valid status values:** `in_progress`, `completed`, `reviewed`

### Complete Audit (Updates Inventory with Recorded Values)
```http
PATCH /audits/{audit_id}/complete
```

**Key Feature:**
- Marks the audit as completed
- Updates all inventory records with the values recorded during the audit
- Inventory quantities are updated based on audit findings

### Delete Audit
```http
DELETE /audits/{audit_id}
```
**Note:** Can only delete audits with status `in_progress`

---

## 📝 Audit Record Module (Update Values)

### Get Audit Record by ID
```http
GET /audit-records/{record_id}
```

### Get All Audit Records by Audit ID
```http
GET /audit-records/audit/{audit_id}
```

### Update Audit Record (Single)
```http
PATCH /audit-records/{record_id}
Content-Type: application/json

{
  "recorded_current": 48,
  "recorded_active": 45,
  "recorded_broken": 2,
  "recorded_inactive": 1,
  "notes": "Item inspection notes"
}
```

**Key Feature:**
- This is where users **add values** during the audit
- Values start at 0 when audit is created
- Users update these values as they inspect items
- Can only update if audit status is `in_progress`

### Bulk Update Audit Records
```http
PATCH /audit-records/bulk
Content-Type: application/json

{
  "records": [
    {
      "id": "record-uuid-1",
      "recorded_current": 48,
      "recorded_active": 45,
      "recorded_broken": 2,
      "recorded_inactive": 1
    },
    {
      "id": "record-uuid-2",
      "recorded_current": 30,
      "recorded_active": 28,
      "recorded_broken": 1,
      "recorded_inactive": 1
    }
  ]
}
```

**Key Feature:**
- Update multiple audit records in one request
- All records must belong to the same audit
- More efficient for bulk data entry

### Add Participant to Audit Record
```http
POST /audit-records/{record_id}/participant
Content-Type: application/json

{
  "user_id": "uuid-of-user"
}
```

### Remove Participant from Audit Record
```http
DELETE /audit-records/{record_id}/participant/{user_id}
```

---

## 🔄 Typical Workflow

### 1. Setup Phase (One-time)
```
1. Create Rooms → POST /rooms
2. Create Items → POST /items
3. Create Inventory for all rooms → POST /inventories/bulk (for each room)
```

### 2. Monthly Audit Process

#### Step 1: Create New Audit
```http
POST /audits
{
  "month": 10,
  "year": 2025,
  "conducted_by": "user-uuid"
}
```
✅ **System automatically creates audit records for ALL inventory items with values = 0**

#### Step 2: Update Audit Records (During Inspection)
```http
PATCH /audit-records/{record_id}
{
  "recorded_current": 50,
  "recorded_active": 48,
  "recorded_broken": 1,
  "recorded_inactive": 1,
  "notes": "Checked on 2025-10-15"
}
```
✅ **Users add actual values as they inspect items**

#### Step 3: Complete Audit
```http
PATCH /audits/{audit_id}/complete
```
✅ **System updates inventory with the recorded values**

### 3. Next Month
```
Create new audit → Same process, all values reset to 0 again
```

---

## 📊 Data Models Overview

### Audit Status Flow
```
in_progress → completed → reviewed
```

### Inventory vs Audit Records
- **Inventory**: Master record of room-item combinations (permanent)
  - Stores current totals
  - Updated when audit is completed

- **Audit Records**: Snapshot for specific audit period
  - Created fresh each month with values = 0
  - Users fill in values during audit
  - Multiple audit records exist per inventory (one per audit)

### Value Types
- **recorded_current**: Total quantity counted
- **recorded_active**: Functional/in-use items
- **recorded_broken**: Damaged/non-functional items
- **recorded_inactive**: Not in use but functional items

---

## 🎯 Key Features

1. ✅ **Auto-generation**: Creating an audit automatically creates records for ALL inventory
2. ✅ **Zero Values**: All audit record values start at 0
3. ✅ **Fresh Start**: Each month's audit creates new records with values reset to 0
4. ✅ **Bulk Updates**: Update multiple records efficiently
5. ✅ **Status Control**: Cannot update completed/reviewed audits
6. ✅ **Room Grouping**: Audit results grouped by room for easy navigation
7. ✅ **Participants**: Track who inspected each item
8. ✅ **History**: All audits are preserved for historical tracking

---

## 🚀 Getting Started

1. **Setup Database**
   ```bash
   npx prisma migrate dev
   ```

2. **Start Server**
   ```bash
   npm run dev
   ```

3. **Create Initial Data**
   - Create rooms
   - Create items
   - Create inventory (bulk create for each room)

4. **Start First Audit**
   - Create audit for current month
   - System auto-creates all audit records with 0 values
   - Start updating values as you inspect items

---

## 📝 Notes

- All dates are handled automatically by the system
- UUIDs are auto-generated for all records
- Soft delete is not implemented (records are permanently deleted)
- Authentication tokens are stored in HTTP-only cookies
- CORS is configured for localhost:3000 and localhost:3001
