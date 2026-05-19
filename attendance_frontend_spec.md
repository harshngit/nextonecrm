# Attendance Module — Frontend Spec
## For Trae AI / Developer Handoff

---

## Tech Stack (match existing project)
- React + Vite
- Redux Toolkit (state management)
- TailwindCSS
- Lucide React (icons)
- Axios (API calls via `api` instance with base URL + Bearer token)
- React Router v6

---

## Base URL
All endpoints: `GET/POST/PATCH/DELETE /api/v1/attendance/...`
Auth: Bearer token in header (handled by axios instance already set up)

---

## Status Values (used everywhere)
| Value | Display | Color |
|-------|---------|-------|
| `present` | Present | Green |
| `late` | Late | Amber/Yellow |
| `absent` | Absent | Red |
| `on_leave` | On Leave | Indigo/Purple |
| `half_day` | Half Day | Pink |
| `weekend` | Weekend | Gray |

---

## Role-Based Access
| Role | What they can see/do |
|------|---------------------|
| `super_admin` | Everything — all users, all reports, delete records |
| `admin` | Everything except delete (only super_admin can delete) |
| `sales_manager` | Their own attendance + their team's attendance |
| `sales_executive` | Only their own attendance — check-in/checkout/history |
| `external_caller` | Only their own attendance — check-in/checkout/history |

---

---

# PAGE 1 — Attendance Home (My Attendance)
**Route:** `/attendance`
**Visible to:** All roles

## What this page shows
The main attendance page. Shows today's status + check-in/checkout actions + personal history.

## Layout
```
[ Today's Card — Check-in / Checkout ]
[ Monthly Summary Stats ]
[ Attendance Calendar — this month ]
[ History List — paginated ]
```

---

### Section A — Today's Status Card

**API Call on page load:**
```
GET /api/v1/attendance/today
Headers: Authorization: Bearer <token>
No body / params
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2026-05-20",
    "is_checked_in": true,
    "is_checked_out": false,
    "status": "present",
    "check_in_time": "2026-05-20T09:02:00.000Z",
    "check_out_time": null,
    "working_hours": null,
    "checkin_photo": "/uploads/attendance/checkin/uuid_xxx.jpg",
    "checkout_photo": null,
    "checkin_location": {
      "latitude": 19.076,
      "longitude": 72.8777,
      "address": "Andheri West, Mumbai"
    },
    "checkout_location": null,
    "full_record": { ...full attendance row }
  }
}
```

**UI Logic:**
- If `is_checked_in = false` → show **Check In** button (green)
- If `is_checked_in = true` AND `is_checked_out = false` → show **Check Out** button (red) + show check-in time
- If both true → show working hours, both timestamps, status badge — no action buttons
- Show status badge with color coding

---

### Section B — Check In Flow (2 steps)

**Step 1 — Upload Selfie (optional but recommended)**
```
POST /api/v1/attendance/upload-photo?type=checkin
Headers: Authorization: Bearer <token>
Content-Type: multipart/form-data

Body (form-data):
  photo: <image file>   -- field name must be "photo"
                           JPEG / PNG / WEBP, max 10 MB
```

**Response:**
```json
{
  "success": true,
  "data": {
    "photo_url": "/uploads/attendance/checkin/uuid_2026-05-20_1234567890.jpg"
  }
}
```

**Step 2 — Check In**
```
POST /api/v1/attendance/checkin
Headers: Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "photo_url": "/uploads/attendance/checkin/uuid_xxx.jpg",  // from step 1, optional
  "latitude": 19.0760,          // from browser Geolocation API, optional
  "longitude": 72.8777,         // optional
  "address": "Andheri West, Mumbai",  // reverse geocode or manual, optional
  "device": "Chrome / Windows",       // navigator.userAgent, optional
  "notes": ""                         // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "attendance": {
      "id": "uuid",
      "date": "2026-05-20",
      "check_in_time": "2026-05-20T09:14:00.000Z",
      "status": "present",
      "checkin_photo": "/uploads/attendance/checkin/uuid_xxx.jpg",
      "checkin_latitude": 19.076,
      "checkin_longitude": 72.8777
    },
    "user": {
      "full_name": "Rahul Sharma",
      "role": "sales_executive"
    }
  }
}
```

**Status auto-set by backend:**
- Check-in before 14:00 → `present`
- Check-in after 14:00 → `half_day`

**Error cases:**
- 400: `"Already checked in today"` — show toast error

---

### Section C — Check Out Flow (2 steps, same as check in)

**Step 1 — Upload Selfie (optional)**
```
POST /api/v1/attendance/upload-photo?type=checkout
Headers: Authorization: Bearer <token>
Content-Type: multipart/form-data

Body (form-data):
  photo: <image file>
```

**Step 2 — Check Out**
```
POST /api/v1/attendance/checkout
Headers: Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "photo_url": "/uploads/attendance/checkout/uuid_xxx.jpg",  // optional
  "latitude": 19.0760,
  "longitude": 72.8777,
  "address": "Andheri West, Mumbai",
  "device": "Chrome / Windows",
  "notes": ""
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "attendance": {
      "check_in_time": "2026-05-20T09:14:00.000Z",
      "check_out_time": "2026-05-20T19:35:00.000Z",
      "working_hours": 10.35,
      "status": "present"
    },
    "working_hours": 10.35,
    "status": "present",
    "checkout_rule": {
      "checked_out_at": "19:35",
      "full_day_requires": "19:30",
      "is_full_day": true
    }
  }
}
```

**Status rule applied at checkout by backend:**
- Checkout before 19:30 → `half_day` (even if checked in on time)
- Checkout at/after 19:30 → keeps `present`

**Show to user after checkout:**
- Working hours
- Status (if downgraded to half_day show a warning)

---

### Section D — My Attendance History

**API Call:**
```
GET /api/v1/attendance/me
Headers: Authorization: Bearer <token>

Query params:
  from       -- string, date YYYY-MM-DD, default: 1st of current month
  to         -- string, date YYYY-MM-DD, default: today
  page       -- integer, default 1
  per_page   -- integer, default 30
```

**Response:**
```json
{
  "data": [...attendance records],
  "pagination": {
    "total": 120,
    "page": 1,
    "per_page": 30,
    "total_pages": 4
  },
  "summary": {
    "present": 18,
    "absent": 2,
    "on_leave": 1,
    "late": 3,
    "total_working_hours": 155.5
  },
  "salary": {
    "monthly_salary": 35000,
    "present_days": 18.5,
    "per_day_salary": 1346.15,
    "earned_salary": 24914.77,
    "slip_generated": false,
    "slip_final_salary": null,
    "slip_deductions": null
  },
  "period": { "from": "2026-05-01", "to": "2026-05-20" }
}
```

**Each attendance record in data:**
```json
{
  "id": "uuid",
  "date": "2026-05-20",
  "status": "present",
  "check_in_time": "2026-05-20T09:02:00Z",
  "check_out_time": "2026-05-20T19:38:00Z",
  "working_hours": 10.6,
  "checkin_photo": "/uploads/attendance/checkin/...",
  "checkout_photo": "/uploads/attendance/checkout/...",
  "checkin_address": "Andheri West, Mumbai",
  "is_manual_entry": false,
  "reason": null
}
```

**UI:** Show summary stats row + paginated list of days with status badges

---

### Section E — Monthly Calendar View

**API Call:**
```
GET /api/v1/attendance/calendar
Headers: Authorization: Bearer <token>

Query params:
  month   -- integer 1-12, default current month
  year    -- integer, default current year
  user_id -- uuid (optional, admin/manager only — to view another user's calendar)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "full_name": "Rahul Sharma", "role": "sales_executive" },
    "month": 5,
    "year": 2026,
    "days": [
      {
        "date": "2026-05-01",
        "day": "Fri",
        "is_weekend": false,
        "status": "present",
        "check_in_time": "2026-05-01T09:01:00Z",
        "check_out_time": "2026-05-01T19:40:00Z",
        "working_hours": 10.65
      },
      {
        "date": "2026-05-03",
        "day": "Sun",
        "is_weekend": true,
        "status": "weekend"
      }
    ],
    "summary": {
      "present": 18,
      "absent": 2,
      "on_leave": 1,
      "late": 3,
      "working_days": 22,
      "total_working_hours": 155.5
    }
  }
}
```

**UI:** Render a month grid — each cell shows status with color. Click a day to see details.

---

---

# PAGE 2 — Team Attendance
**Route:** `/attendance/team`
**Visible to:** `sales_manager`, `admin`, `super_admin`

## What this page shows
- Sales Manager: sees their own team members' attendance
- Admin: sees everyone (can filter by manager)

---

### Section A — Today's Team Overview (by-date)

**API Call:**
```
GET /api/v1/attendance/by-date
Headers: Authorization: Bearer <token>

Query params:
  date       -- string YYYY-MM-DD (required)
               Default to today on page load
  user_id    -- uuid (optional, admin filter for one user)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2026-05-20",
    "summary": {
      "present": 18,
      "late": 3,
      "absent": 2,
      "on_leave": 1,
      "total": 24
    },
    "records": [
      {
        "id": "uuid",
        "date": "2026-05-20",
        "status": "present",
        "check_in_time": "2026-05-20T09:02:00Z",
        "check_out_time": "2026-05-20T19:38:00Z",
        "working_hours": 10.6,
        "full_name": "Rahul Sharma",
        "role": "sales_executive",
        "email": "rahul@company.com",
        "checkin_address": "Andheri West",
        "is_manual_entry": false
      }
    ],
    "no_record": [
      {
        "id": "uuid",
        "full_name": "Priya Mehta",
        "role": "sales_executive",
        "status": "absent",
        "check_in_time": null,
        "check_out_time": null
      }
    ]
  }
}
```

**UI:**
- Date picker to select any date
- Summary row: Present / Late / Absent / On Leave cards
- Table: all records + no_record users (marked absent)
- Admin can click a record to approve/edit

---

### Section B — Monthly Grid (by-month)

**API Call:**
```
GET /api/v1/attendance/by-month
Headers: Authorization: Bearer <token>

Query params:
  month       -- integer 1-12, default current month
  year        -- integer, default current year
  user_id     -- uuid (optional, filter to one user)
  manager_id  -- uuid (optional, admin only — filter to one manager's team)
  page        -- integer, default 1
  per_page    -- integer, default 50
```

**Response:**
```json
{
  "data": [
    {
      "user": {
        "id": "uuid",
        "full_name": "Rahul Sharma",
        "role": "sales_executive",
        "email": "rahul@company.com"
      },
      "summary": {
        "present": 18,
        "absent": 2,
        "on_leave": 1,
        "late": 3,
        "working_days": 22,
        "total_working_hours": 155.5
      },
      "days": [
        {
          "date": "2026-05-01",
          "day": "Fri",
          "is_weekend": false,
          "status": "present",
          "check_in_time": "2026-05-01T09:01:00Z",
          "check_out_time": "2026-05-01T19:40:00Z",
          "working_hours": 10.65,
          "checkin_address": "Andheri West",
          "is_manual_entry": false
        }
      ]
    }
  ],
  "pagination": { "total": 10, "page": 1, "per_page": 50, "total_pages": 1 },
  "month": 5,
  "year": 2026,
  "all_days": ["2026-05-01", "2026-05-02", ...]
}
```

**UI:** Spreadsheet-style grid
- Rows = employees
- Columns = dates (1–31)
- Each cell = colored letter (P / L / A / OL / H / -)
- Click cell to see details / admin can edit

---

### Section C — Team Summary (summary)

**API Call:**
```
GET /api/v1/attendance/summary
Headers: Authorization: Bearer <token>

Query params:
  from     -- string YYYY-MM-DD, default 1st of month
  to       -- string YYYY-MM-DD, default today
  user_id  -- uuid (optional, single user)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": { "from": "2026-05-01", "to": "2026-05-20" },
    "data": [
      {
        "id": "uuid",
        "full_name": "Rahul Sharma",
        "role": "sales_executive",
        "email": "rahul@company.com",
        "present": 18,
        "absent": 2,
        "on_leave": 1,
        "late": 3,
        "total_days": 24,
        "total_working_hours": 155.5,
        "attendance_percent": 87.5,
        "last_present": "2026-05-20"
      }
    ]
  }
}
```

**UI:** Table with attendance % per employee. Color code % (green ≥90, amber ≥75, red <75)

---

### Section D — Team Attendance Feed (team endpoint)

**API Call:**
```
GET /api/v1/attendance/team
Headers: Authorization: Bearer <token>

Query params:
  from        -- string YYYY-MM-DD
  to          -- string YYYY-MM-DD
  page        -- integer, default 1
  per_page    -- integer, default 30
  manager_id  -- uuid (admin only — to scope to specific manager's team)
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "date": "2026-05-20",
      "status": "present",
      "check_in_time": "2026-05-20T09:02:00Z",
      "check_out_time": "2026-05-20T19:38:00Z",
      "working_hours": 10.6,
      "full_name": "Rahul Sharma",
      "role": "sales_executive"
    }
  ],
  "summary": { "present": 18, "absent": 2, "late": 3, "on_leave": 1 },
  "team_size": 4,
  "team_members": [
    { "id": "uuid", "full_name": "Rahul Sharma", "role": "sales_executive" }
  ],
  "pagination": { "total": 60, "page": 1, "per_page": 30, "total_pages": 2 },
  "period": { "from": "2026-05-01", "to": "2026-05-20" }
}
```

---

---

# PAGE 3 — Admin Attendance Management
**Route:** `/attendance/admin`
**Visible to:** `admin`, `super_admin` only

---

### Section A — All Attendance Records (filterable table)

**API Call:**
```
GET /api/v1/attendance
Headers: Authorization: Bearer <token>

Query params:
  from       -- string YYYY-MM-DD
  to         -- string YYYY-MM-DD
  user_id    -- uuid (filter to one user)
  status     -- string: present | absent | on_leave | half_day | late
  page       -- integer, default 1
  per_page   -- integer, default 30
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "date": "2026-05-20",
      "status": "present",
      "check_in_time": "2026-05-20T09:02:00Z",
      "check_out_time": "2026-05-20T19:38:00Z",
      "working_hours": 10.6,
      "full_name": "Rahul Sharma",
      "role": "sales_executive",
      "email": "rahul@company.com",
      "phone_number": "+919876543210",
      "checkin_photo": "/uploads/attendance/checkin/...",
      "checkin_address": "Andheri West",
      "is_manual_entry": false
    }
  ],
  "summary": { "present": 18, "absent": 2, "late": 3, "on_leave": 1 },
  "pagination": { "total": 200, "page": 1, "per_page": 30, "total_pages": 7 },
  "period": { "from": "2026-05-01", "to": "2026-05-20" }
}
```

---

### Section B — Pending Approvals

**API Call:**
```
GET /api/v1/attendance/pending
Headers: Authorization: Bearer <token>

Query params:
  date  -- string YYYY-MM-DD (default today)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2026-05-20",
    "summary": {
      "not_checked_out": 5,
      "absent": 3,
      "late": 4,
      "total": 12
    },
    "records": [
      {
        "id": "uuid",
        "date": "2026-05-20",
        "status": "late",
        "check_in_time": "2026-05-20T14:30:00Z",
        "check_out_time": null,
        "full_name": "Suresh Patel",
        "role": "sales_executive",
        "email": "suresh@company.com",
        "phone_number": "+919876543210"
      }
    ]
  }
}
```

**UI:** Badge showing count on the tab. Admin can click a record to approve/change status.

---

### Section C — Approve / Change Status

**API Call:**
```
PATCH /api/v1/attendance/:id/approve
Headers: Authorization: Bearer <token>
Content-Type: application/json

URL param:
  :id  -- uuid of the attendance record

Body:
{
  "status": "present",            // required: present | absent | on_leave | half_day | late
  "reason": "Was on field visit"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Status updated to \"present\" successfully",
  "data": {
    "attendance": { ...updated record },
    "employee": {
      "full_name": "Suresh Patel",
      "role": "sales_executive"
    },
    "change": {
      "old_status": "absent",
      "new_status": "present",
      "reason": "Was on field visit",
      "approved_by": "Admin Name",
      "approved_at": "2026-05-20T10:00:00Z"
    }
  }
}
```

---

### Section D — Manual Entry

**API Call:**
```
POST /api/v1/attendance/manual
Headers: Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "user_id": "uuid",                        // required
  "date": "2026-05-20",                     // required YYYY-MM-DD
  "status": "present",                      // required: present | absent | on_leave | half_day | late
  "check_in_time": "2026-05-20T09:00:00Z",  // optional
  "check_out_time": "2026-05-20T19:30:00Z", // optional
  "reason": "Forgot to check in"            // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Manual entry saved",
  "data": {
    "attendance": { ...saved record },
    "user": { "id": "uuid", "full_name": "Rahul Sharma", "role": "sales_executive" }
  }
}
```

---

### Section E — Mark Leave

**API Call:**
```
POST /api/v1/attendance/leave
Headers: Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "user_id": "uuid",          // required
  "date": "2026-05-20",       // required YYYY-MM-DD
  "leave_type": "casual",     // optional: full_day | half_day | sick | casual | unpaid (default: full_day)
  "reason": "Personal work"   // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Leave marked",
  "data": {
    "attendance": { ...saved record },
    "user": { "id": "uuid", "full_name": "Rahul Sharma" }
  }
}
```

---

### Section F — Edit Attendance Record

**API Call:**
```
PATCH /api/v1/attendance/:id
Headers: Authorization: Bearer <token>
Content-Type: application/json

URL param:
  :id  -- uuid of attendance record

Body (all optional — only send what you want to change):
{
  "check_in_time": "2026-05-20T09:00:00Z",
  "check_out_time": "2026-05-20T19:30:00Z",
  "status": "present",
  "reason": "Corrected entry",
  "notes": "Admin override"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Updated",
  "data": {
    "attendance": { ...updated record },
    "user": { "id": "uuid", "full_name": "Rahul Sharma" }
  }
}
```

---

### Section G — Delete Attendance Record (super_admin only)

**API Call:**
```
DELETE /api/v1/attendance/:id
Headers: Authorization: Bearer <token>

URL param:
  :id  -- uuid of attendance record
```

**Response:**
```json
{
  "success": true,
  "message": "Record deleted"
}
```

---

### Section H — Per-User Attendance

**API Call:**
```
GET /api/v1/attendance/user/:user_id
Headers: Authorization: Bearer <token>

URL param:
  :user_id  -- uuid

Query params:
  from       -- string YYYY-MM-DD
  to         -- string YYYY-MM-DD
  page       -- integer, default 1
  per_page   -- integer, default 30
```

**Response:**
```json
{
  "data": [ ...attendance records ],
  "user": { "id": "uuid", "full_name": "Rahul Sharma", "role": "sales_executive" },
  "summary": { "present": 18, "absent": 2, "on_leave": 1, "late": 3, "total_working_hours": 155.5 },
  "pagination": { "total": 22, "page": 1, "per_page": 30, "total_pages": 1 },
  "period": { "from": "2026-05-01", "to": "2026-05-20" }
}
```

---

### Section I — Export to Excel

**API Call:**
```
GET /api/v1/attendance/export
Headers: Authorization: Bearer <token>

Query params:
  month    -- integer 1-12 (default current month)
  year     -- integer (default current year)
  from     -- string YYYY-MM-DD (override start date)
  to       -- string YYYY-MM-DD (override end date)
  user_id  -- uuid (export single user only)
```

**Response:** Binary Excel file download (.xlsx)
Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

**Frontend code to trigger download:**
```javascript
const res = await api.get('/attendance/export', {
  params: { month, year },
  responseType: 'blob'
})
const url = URL.createObjectURL(res.data)
const a = document.createElement('a')
a.href = url
a.download = `Attendance_May_2026.xlsx`
document.body.appendChild(a)
a.click()
a.remove()
URL.revokeObjectURL(url)
```

**Excel has 4 tabs:** All Records · By Month (grid) · Summary · Late Arrivals

---

---

# Redux State Structure (attendanceSlice)

```javascript
{
  attendance: {
    // Today
    today: null,                    // from GET /today
    todayLoading: false,

    // My history
    myList: [],
    myPagination: {},
    mySummary: {},
    mySalary: {},                   // earned salary info
    myLoading: false,

    // My calendar
    calendar: null,                 // { user, days[], summary }
    calendarLoading: false,

    // Team (manager/admin)
    teamList: [],
    teamPagination: {},
    teamSummary: {},
    teamLoading: false,

    // By date (admin/manager)
    byDate: null,                   // { date, summary, records[], no_record[] }
    byDateLoading: false,

    // By month grid
    monthGrid: [],
    monthGridPagination: {},
    monthGridLoading: false,

    // All records (admin)
    allList: [],
    allPagination: {},
    allSummary: {},
    allLoading: false,

    // Pending approvals
    pending: null,
    pendingLoading: false,

    // Per-user
    userRecord: null,
    userLoading: false,

    // Actions
    actionLoading: false,
    actionError: null,
    actionSuccess: null,
  }
}
```

---

# Attendance Rules (show these to users in UI)

Display this info card on the check-in screen:

```
✅ Full Day:   Check-in by 2:00 PM + Check-out after 7:30 PM
⚠️  Half Day:   Check-in after 2:00 PM  OR  Check-out before 7:30 PM
```

Salary impact (show on My Attendance page):
```
Full Day  (present/late)  → 100% of daily salary
Half Day                  → 50% of daily salary
Absent / Leave            → ₹0
```

---

# UI Components Needed

| Component | Used in |
|-----------|---------|
| `StatusBadge` | All pages — color coded status pill |
| `CheckInCard` | Page 1 — today's card with action buttons |
| `SelfieCapture` | Page 1 — camera/file upload for selfie |
| `LocationPicker` | Page 1 — get GPS + show address |
| `AttendanceCalendar` | Page 1, Page 2 — monthly grid |
| `SummaryStats` | All pages — present/absent/late/leave count cards |
| `AttendanceTable` | Page 2, Page 3 — sortable/filterable table |
| `MonthGrid` | Page 2 — spreadsheet grid (rows=users, cols=dates) |
| `ApproveModal` | Page 3 — admin approve/change status |
| `ManualEntryModal` | Page 3 — admin manual entry form |
| `LeaveModal` | Page 3 — mark leave form |
| `EditRecordModal` | Page 3 — edit check-in/out times |
| `SalaryCard` | Page 1 — earned salary display |
| `ExportButton` | Page 2, Page 3 — triggers Excel download |

---

# Key Frontend Notes

1. **Geolocation** — Use `navigator.geolocation.getCurrentPosition()` to get lat/lng before check-in. Show a "Getting location..." state.

2. **Selfie upload** — Upload the photo FIRST (get `photo_url`), THEN call checkin/checkout with the URL. These are 2 separate API calls.

3. **Photo field name** — The multipart field name for the photo MUST be `photo` (not `file` or `image`).

4. **Status after checkout** — The backend may downgrade status to `half_day` at checkout. Read the `status` field from the checkout response and show a toast if it changed.

5. **Today auto-refresh** — After check-in or checkout, re-call `GET /today` to update the UI.

6. **Role gating** — Team and Admin pages should not be accessible to `sales_executive` / `external_caller`. Use route guards.

7. **Month default** — All history endpoints default to current month if no `from`/`to` passed.

8. **Late arrivals report** — Separate GET `/api/v1/attendance/late` endpoint also available for a dedicated late arrivals view.
```
GET /api/v1/attendance/late
Query params: from, to, user_id
```
