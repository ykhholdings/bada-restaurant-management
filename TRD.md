# TRD (Technical Requirements Document)
## BADA Restaurant Management System

---

## 1. 기술 스택

### 1.1 Frontend
```
- Platform: GitHub Pages (Static Hosting)
- HTML5: Semantic markup
- CSS3: Flexbox, Grid, Media Queries
- JavaScript (ES6+): Vanilla JS (No framework)
- JSONP: Cross-origin API calls
```

### 1.2 Backend
```
- Google Apps Script (GAS)
  - Version: V8 Runtime
  - Execution: Serverless
  - Triggers: HTTP POST/GET

- Google Sheets
  - Database equivalent
  - Real-time collaboration
  - Built-in backup
```

### 1.3 External APIs
```
- Claude API (Anthropic)
  - Model: claude-3-sonnet-20240229 (또는 최신)
  - Use Case: OCR (영수증 인식)
  - Rate Limit: 고려 필요
```

### 1.4 Development Tools
```
- Git/GitHub: Version control
- VS Code: IDE
- Chrome DevTools: Debugging
- Postman: API testing
```

---

## 2. 시스템 아키텍처

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Pages                         │
│                  (Static Frontend)                      │
│                                                         │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐             │
│  │ HTML    │  │ CSS      │  │ JS       │             │
│  │ Pages   │  │ Styles   │  │ Logic    │             │
│  └─────────┘  └──────────┘  └──────────┘             │
└──────────────────┬──────────────────────────────────────┘
                   │ JSONP (GET)
                   │
┌──────────────────▼──────────────────────────────────────┐
│            Google Apps Script                           │
│               (API Layer)                               │
│                                                         │
│  doGet(e) ──┬──> handleAction() ──┬──> loginUser()    │
│             │                      ├──> createPurchase()│
│             │                      ├──> getSales()      │
│             │                      ├──> calcPayroll()   │
│             │                      └──> checkIn()       │
│             │                                           │
│             └──> Claude API (OCR)                       │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│              Google Sheets                              │
│               (Data Layer)                              │
│                                                         │
│  Users │ Purchases │ Sales │ Payroll │ Attendance │   │
│  Items_Master │ Activity_Log │ ...                     │
└─────────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름

**예시: 영수증 업로드**
```
1. User clicks "Upload Receipt" (Frontend)
   ↓
2. Select file → Convert to Base64
   ↓
3. JSONP call to Apps Script
   payload = {
     action: 'purchase.upload',
     data: {
       image_base64: '...',
       branch_id: 'BR001',
       uploader_id: 'U123'
     }
   }
   ↓
4. Apps Script receives → handleAction()
   ↓
5. Call Claude API for OCR
   ↓
6. Parse OCR result → Extract items
   ↓
7. Insert to Sheets:
   - Purchases table
   - Purchase_Items table
   ↓
8. Return response { ok: true, data: {...} }
   ↓
9. Frontend displays success message
```

---

## 3. 데이터베이스 설계

### 3.1 Google Sheets 구조

#### Sheet 1: Users
```sql
CREATE TABLE Users (
  ID VARCHAR PRIMARY KEY,
  Name VARCHAR NOT NULL,
  Email VARCHAR UNIQUE NOT NULL,
  Password VARCHAR NOT NULL,  -- 평문 또는 해시
  Role ENUM('admin', 'manager', 'staff'),
  Branch VARCHAR FOREIGN KEY REFERENCES Branches(ID),
  Active BOOLEAN DEFAULT TRUE,
  Created TIMESTAMP
)
```

**예시 데이터**:
```
U001 | Admin User | admin@bada.ae | admin123 | admin | ALL | YES | 2025-01-01
U002 | Bhab | bhab@bada.ae | bhab123 | manager | BR001 | YES | 2025-01-01
U003 | Jeseevil | jeseevil@bada.ae | staff123 | staff | BR002 | YES | 2025-01-01
```

#### Sheet 2: Branches
```sql
CREATE TABLE Branches (
  ID VARCHAR PRIMARY KEY,
  Name VARCHAR NOT NULL,
  Location VARCHAR,
  GPS_Lat DECIMAL(10,7),
  GPS_Lng DECIMAL(10,7),
  Radius_Meters INT DEFAULT 100,
  Manager_ID VARCHAR FOREIGN KEY REFERENCES Users(ID)
)
```

**예시 데이터**:
```
BR001 | BADA Restaurant | Al Barsha | 25.0857 | 55.2094 | 100 | U002
BR002 | Crazy Ramen | Al Ghurair | 25.2697 | 55.3273 | 100 | U003
BR003 | Crazy Ramen | Muraqqabat | 25.2656 | 55.3220 | 100 | U004
BR004 | Crazy Ramen | Burjuman | 25.2529 | 55.3021 | 100 | U005
```

#### Sheet 3: Purchases
```sql
CREATE TABLE Purchases (
  ID VARCHAR PRIMARY KEY,
  Date DATE NOT NULL,
  Branch_ID VARCHAR FOREIGN KEY,
  Uploader_ID VARCHAR FOREIGN KEY,
  Approver_ID VARCHAR FOREIGN KEY,
  Supplier VARCHAR,
  Invoice_No VARCHAR,
  Amount_NoTax DECIMAL(10,2),
  Tax DECIMAL(10,2),
  Total DECIMAL(10,2),
  Payment_Mode ENUM('Cash', 'Card', 'Bank Transfer'),
  Status ENUM('Pending', 'Approved', 'Rejected'),
  Receipt_URL VARCHAR,  -- Google Drive link
  Created TIMESTAMP,
  Approved_At TIMESTAMP
)
```

#### Sheet 4: Purchase_Items
```sql
CREATE TABLE Purchase_Items (
  ID VARCHAR PRIMARY KEY,
  Purchase_ID VARCHAR FOREIGN KEY,
  Item_Name VARCHAR NOT NULL,
  Category VARCHAR,  -- Food/Packaging/Supplies/Others
  SubCategory VARCHAR,
  Quantity DECIMAL(10,2),
  Unit VARCHAR,  -- kg/pcs/box/liter
  Unit_Price DECIMAL(10,2),
  Per_Item_Price DECIMAL(10,4),  -- 개당 단가
  Total DECIMAL(10,2)
)
```

#### Sheet 5: Items_Master
```sql
CREATE TABLE Items_Master (
  ID VARCHAR PRIMARY KEY AUTO_INCREMENT,
  Item_Name VARCHAR UNIQUE NOT NULL,
  Category VARCHAR,
  SubCategory VARCHAR,
  Default_Unit VARCHAR,
  Last_Purchase_Price DECIMAL(10,2),
  Avg_Price DECIMAL(10,2),
  Last_Updated TIMESTAMP
)
```

**자동 업데이트 로직**:
```
Purchase가 Approved될 때:
1. Items_Master에서 Item_Name 검색
2. 존재하면:
   - Last_Purchase_Price 업데이트
   - Avg_Price 재계산
   - Last_Updated 업데이트
3. 존재하지 않으면:
   - 새로운 행 Insert
```

#### Sheet 6: Sales
```sql
CREATE TABLE Sales (
  ID VARCHAR PRIMARY KEY,
  Date DATE NOT NULL,
  Branch_ID VARCHAR FOREIGN KEY,
  Opening_Cash DECIMAL(10,2),
  Cash_Sales DECIMAL(10,2),
  Card_Sales DECIMAL(10,2),
  Total_Sales DECIMAL(10,2),  -- Cash + Card
  Expenses DECIMAL(10,2),
  Closing_Cash DECIMAL(10,2),
  Difference DECIMAL(10,2),  -- Actual - Expected
  Submitted_By VARCHAR FOREIGN KEY,
  Created TIMESTAMP
)
```

#### Sheet 7: Sales_Details
```sql
CREATE TABLE Sales_Details (
  ID VARCHAR PRIMARY KEY,
  Sales_ID VARCHAR FOREIGN KEY,
  Category VARCHAR,  -- Expense category
  Item VARCHAR,
  Qty INT,
  Price DECIMAL(10,2),
  Total DECIMAL(10,2)
)
```

**또는 Sales_Expenses로 이름 변경 가능**

#### Sheet 8: Employees
```sql
CREATE TABLE Employees (
  ID VARCHAR PRIMARY KEY,
  Name VARCHAR NOT NULL,
  Branch_ID VARCHAR FOREIGN KEY,
  Base_Salary DECIMAL(10,2),
  Start_Date DATE,
  Status ENUM('Active', 'Inactive'),
  Created TIMESTAMP
)
```

**Note**: Users와 통합 가능 (현재는 분리)

#### Sheet 9: Salary_Changes
```sql
CREATE TABLE Salary_Changes (
  ID VARCHAR PRIMARY KEY,
  Employee_ID VARCHAR FOREIGN KEY,
  Old_Salary DECIMAL(10,2),
  New_Salary DECIMAL(10,2),
  Effective_Date DATE,
  Changed_By VARCHAR FOREIGN KEY,
  Created TIMESTAMP
)
```

#### Sheet 10: Attendance
```sql
CREATE TABLE Attendance (
  ID VARCHAR PRIMARY KEY,
  Employee_ID VARCHAR FOREIGN KEY,
  Date DATE NOT NULL,
  Check_In TIMESTAMP,
  Check_Out TIMESTAMP,
  GPS_Lat DECIMAL(10,7),
  GPS_Lng DECIMAL(10,7),
  Hours DECIMAL(4,2),  -- 총 근무시간
  Is_Half_Day BOOLEAN DEFAULT FALSE,
  Status ENUM('Pending', 'Approved'),
  Approved_By VARCHAR FOREIGN KEY,
  Created TIMESTAMP,

  UNIQUE(Employee_ID, Date)
)
```

#### Sheet 11: Payroll
```sql
CREATE TABLE Payroll (
  ID VARCHAR PRIMARY KEY,
  Employee_ID VARCHAR FOREIGN KEY,
  Month INT,  -- 1-12
  Year INT,   -- 2025
  Base_Salary DECIMAL(10,2),
  Working_Days DECIMAL(4,1),  -- 25.5
  Actual_Days INT DEFAULT 26,
  Calculated_Amount DECIMAL(10,2),
  Rounded_Amount DECIMAL(10,2),  -- 1 AED 이하 반올림
  Paid_Date DATE,
  Status ENUM('Pending', 'Paid'),

  UNIQUE(Employee_ID, Month, Year)
)
```

**계산 공식**:
```
Calculated_Amount = (Base_Salary ÷ Actual_Days) × Working_Days
Rounded_Amount = ROUND(Calculated_Amount, 0)
```

#### Sheet 12: Announcements
```sql
CREATE TABLE Announcements (
  ID VARCHAR PRIMARY KEY,
  Branch_ID VARCHAR FOREIGN KEY,  -- 'ALL' for all branches
  Manager_ID VARCHAR FOREIGN KEY,
  Message TEXT NOT NULL,
  Created TIMESTAMP,
  Active BOOLEAN DEFAULT TRUE
)
```

#### Sheet 13: Activity_Log
```sql
CREATE TABLE Activity_Log (
  ID VARCHAR PRIMARY KEY AUTO_INCREMENT,
  User_ID VARCHAR NOT NULL,
  Module VARCHAR NOT NULL,  -- Purchase/Sales/Payroll/Attendance
  Action VARCHAR NOT NULL,   -- Create/Update/Delete/Approve
  Before_Data TEXT,  -- JSON
  After_Data TEXT,   -- JSON
  IP VARCHAR,
  Timestamp TIMESTAMP
)
```

**Note**: Immutable (삭제 불가)

### 3.2 인덱스 전략

**Google Sheets에는 인덱스 없음**, 하지만 최적화 방법:
```
1. 자주 조회하는 컬럼을 앞쪽에 배치
2. Filter/Sort 기능 활용
3. Apps Script에서 캐싱 사용
```

### 3.3 데이터 검증

**Apps Script에서 처리**:
```javascript
function validatePurchase(data) {
  if (!data.date) throw new Error('Date is required');
  if (!data.branch_id) throw new Error('Branch is required');
  if (!data.uploader_id) throw new Error('Uploader is required');
  if (data.total <= 0) throw new Error('Total must be positive');
  // ...
}
```

---

## 4. API 설계

### 4.1 Base URL
```
Production: https://script.google.com/macros/s/{SCRIPT_ID}/exec
```

### 4.2 Request Format (JSONP)

**URL 구조**:
```
GET {BASE_URL}?callback={CALLBACK}&payload={JSON_STRING}
```

**Payload 구조**:
```json
{
  "action": "module.action",
  "data": {
    // action-specific data
  },
  "token": "session_token_here"
}
```

**예시**:
```
https://script.google.com/...?callback=jsonp_callback_abc123&payload=%7B%22action%22%3A%22auth.login%22%2C%22data%22%3A%7B%22email%22%3A%22admin%40bada.ae%22%2C%22password%22%3A%22admin123%22%7D%7D
```

### 4.3 Response Format

**성공**:
```json
{
  "ok": true,
  "data": {
    // response data
  }
}
```

**실패**:
```json
{
  "ok": false,
  "error": "Error message here"
}
```

### 4.4 API Endpoints

#### 4.4.1 Authentication

**auth.login**
```
Request:
{
  "action": "auth.login",
  "data": {
    "email": "admin@bada.ae",
    "password": "admin123"
  }
}

Response:
{
  "ok": true,
  "data": {
    "token": "uuid-v4-token",
    "user": {
      "id": "U001",
      "name": "Admin User",
      "email": "admin@bada.ae",
      "role": "admin",
      "branch": "ALL"
    }
  }
}
```

**auth.validate**
```
Request:
{
  "action": "auth.validate",
  "token": "uuid-v4-token"
}

Response:
{
  "ok": true,
  "data": {
    "valid": true,
    "user": { /* same as login */ }
  }
}
```

**auth.logout**
```
Request:
{
  "action": "auth.logout",
  "token": "uuid-v4-token"
}

Response:
{
  "ok": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

#### 4.4.2 Purchase Management

**purchase.upload**
```
Request:
{
  "action": "purchase.upload",
  "data": {
    "image_base64": "data:image/jpeg;base64,...",
    "branch_id": "BR001",
    "uploader_id": "U003",
    "approver_id": "U002"
  },
  "token": "..."
}

Response:
{
  "ok": true,
  "data": {
    "purchase_id": "P20250101001",
    "ocr_result": {
      "date": "2025-01-05",
      "supplier": "Carrefour",
      "invoice_no": "INV-12345",
      "items": [
        {
          "name": "Chicken Breast",
          "quantity": 5,
          "unit": "kg",
          "unit_price": 25.0,
          "amount": 125.0,
          "category": "Food"
        }
      ],
      "total": 125.0
    },
    "status": "Pending"
  }
}
```

**purchase.list**
```
Request:
{
  "action": "purchase.list",
  "data": {
    "branch_id": "BR001",  // optional
    "status": "Pending",   // optional
    "date_from": "2025-01-01",  // optional
    "date_to": "2025-01-31"     // optional
  },
  "token": "..."
}

Response:
{
  "ok": true,
  "data": {
    "purchases": [
      {
        "id": "P20250101001",
        "date": "2025-01-05",
        "branch": "BADA Restaurant",
        "uploader": "John Doe",
        "supplier": "Carrefour",
        "total": 125.0,
        "status": "Pending"
      }
    ],
    "total_count": 15,
    "page": 1,
    "per_page": 50
  }
}
```

**purchase.approve**
```
Request:
{
  "action": "purchase.approve",
  "data": {
    "purchase_id": "P20250101001",
    "status": "Approved",  // or "Rejected"
    "note": "Looks good"   // optional
  },
  "token": "..."
}

Response:
{
  "ok": true,
  "data": {
    "message": "Purchase approved successfully",
    "purchase_id": "P20250101001"
  }
}
```

**purchase.items.master**
```
Request:
{
  "action": "purchase.items.master",
  "data": {
    "category": "Food"  // optional filter
  },
  "token": "..."
}

Response:
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "I001",
        "name": "Chicken Breast",
        "category": "Food",
        "sub_category": "Meat",
        "default_unit": "kg",
        "last_price": 25.0,
        "avg_price": 24.5,
        "last_updated": "2025-01-05"
      }
    ]
  }
}
```

#### 4.4.3 Sales Management

**sales.submit**
```
Request:
{
  "action": "sales.submit",
  "data": {
    "date": "2025-01-05",
    "branch_id": "BR001",
    "opening_cash": 700.0,
    "cash_sales": 793.0,
    "card_sales": 888.0,
    "total_sales": 1681.0,  // auto-calculated
    "expenses": [
      {
        "buyer": "Staff A",
        "items": "ICE",
        "price": 15.0,
        "notes": ""
      },
      {
        "buyer": "Staff B",
        "items": "SANA WATER",
        "price": 30.0,
        "notes": ""
      }
    ],
    "total_expenses": 122.5,
    "closing_cash": {
      "100": 4,
      "50": 5,
      "20": 0,
      "10": 4,
      "5": 2,
      "1": 1,
      "0.5": 0,
      "0.25": 0
    },
    "closing_cash_amount": 901.0
  },
  "token": "..."
}

Response:
{
  "ok": true,
  "data": {
    "sales_id": "S20250105001",
    "expected_closing": 870.5,  // Opening + Cash - Expenses
    "actual_closing": 901.0,
    "difference": 30.5,
    "message": "Closing submitted. Difference: +30.5 AED"
  }
}
```

**sales.list**
```
Request:
{
  "action": "sales.list",
  "data": {
    "branch_id": "BR001",
    "date_from": "2025-01-01",
    "date_to": "2025-01-31"
  },
  "token": "..."
}

Response:
{
  "ok": true,
  "data": {
    "sales": [
      {
        "id": "S20250105001",
        "date": "2025-01-05",
        "branch": "BADA Restaurant",
        "total_sales": 1681.0,
        "cash_sales": 793.0,
        "card_sales": 888.0,
        "difference": 30.5,
        "submitted_by": "Manager A"
      }
    ],
    "summary": {
      "total_sales": 45620.0,
      "cash_ratio": 0.47,
      "card_ratio": 0.53
    }
  }
}
```

#### 4.4.4 Payroll Management

**payroll.calculate**
```
Request:
{
  "action": "payroll.calculate",
  "data": {
    "month": 1,
    "year": 2025,
    "employee_id": "E001"  // optional, for single employee
  },
  "token": "..."
}

Response:
{
  "ok": true,
  "data": {
    "payrolls": [
      {
        "employee_id": "E001",
        "employee_name": "Bhab",
        "base_salary": 3000.0,
        "working_days": 28.5,
        "actual_days": 26,
        "calculated_amount": 3288.46,
        "rounded_amount": 3288.5,
        "status": "Pending"
      }
    ]
  }
}
```

**payroll.generate**
```
Request:
{
  "action": "payroll.generate",
  "data": {
    "month": 1,
    "year": 2025
  },
  "token": "..."
}

Response:
{
  "ok": true,
  "data": {
    "message": "Payroll generated for 15 employees",
    "total_amount": 44667.5,
    "employees": 15
  }
}
```

**payroll.payslip**
```
Request:
{
  "action": "payroll.payslip",
  "data": {
    "employee_id": "E001",
    "month": 1,
    "year": 2025
  },
  "token": "..."
}

Response:
{
  "ok": true,
  "data": {
    "employee": {
      "id": "E001",
      "name": "Bhab",
      "branch": "BADA Restaurant"
    },
    "month": "January 2025",
    "base_salary": 3000.0,
    "working_days": 28.5,
    "net_payment": 3288.5,
    "status": "Paid"
  }
}
```

#### 4.4.5 Attendance Management

**attendance.checkin**
```
Request:
{
  "action": "attendance.checkin",
  "data": {
    "employee_id": "E001",
    "gps_lat": 25.0858,
    "gps_lng": 55.2095
  },
  "token": "..."
}

Response:
{
  "ok": true,
  "data": {
    "attendance_id": "A20250105E001",
    "check_in": "2025-01-05 09:00:15",
    "message": "Checked in successfully",
    "location_verified": true
  }
}
```

**attendance.checkout**
```
Request:
{
  "action": "attendance.checkout",
  "data": {
    "employee_id": "E001"
  },
  "token": "..."
}

Response:
{
  "ok": true,
  "data": {
    "attendance_id": "A20250105E001",
    "check_out": "2025-01-05 18:30:45",
    "total_hours": 9.5,
    "message": "Checked out successfully"
  }
}
```

**attendance.list**
```
Request:
{
  "action": "attendance.list",
  "data": {
    "employee_id": "E001",
    "month": 1,
    "year": 2025
  },
  "token": "..."
}

Response:
{
  "ok": true,
  "data": {
    "attendance": [
      {
        "date": "2025-01-05",
        "check_in": "09:00",
        "check_out": "18:30",
        "hours": 9.5,
        "is_half_day": false,
        "status": "Approved"
      }
    ],
    "summary": {
      "total_days": 28.5,
      "present": 28,
      "half_day": 1,
      "absent": 2
    }
  }
}
```

**attendance.approve**
```
Request:
{
  "action": "attendance.approve",
  "data": {
    "attendance_id": "A20250105E001",
    "status": "Approved",
    "is_half_day": false,  // optional
    "note": ""             // optional
  },
  "token": "..."
}

Response:
{
  "ok": true,
  "data": {
    "message": "Attendance approved"
  }
}
```

#### 4.4.6 Announcements

**announcement.list**
```
Request:
{
  "action": "announcement.list",
  "data": {
    "branch_id": "BR001"  // optional
  },
  "token": "..."
}

Response:
{
  "ok": true,
  "data": {
    "announcements": [
      {
        "id": "AN001",
        "branch": "BADA Restaurant",
        "message": "Team meeting at 3 PM today",
        "created": "2025-01-05 10:00",
        "created_by": "Manager A"
      }
    ]
  }
}
```

**announcement.create**
```
Request:
{
  "action": "announcement.create",
  "data": {
    "branch_id": "BR001",  // or "ALL"
    "message": "New menu items coming next week!"
  },
  "token": "..."
}

Response:
{
  "ok": true,
  "data": {
    "announcement_id": "AN002",
    "message": "Announcement created successfully"
  }
}
```

#### 4.4.7 Activity Log

**log.query**
```
Request:
{
  "action": "log.query",
  "data": {
    "module": "Purchase",  // optional
    "date_from": "2025-01-01",  // optional
    "date_to": "2025-01-31",    // optional
    "user_id": "U001"           // optional
  },
  "token": "..."
}

Response:
{
  "ok": true,
  "data": {
    "logs": [
      {
        "id": "L12345",
        "timestamp": "2025-01-05 14:30:00",
        "user": "Admin User",
        "module": "Purchase",
        "action": "Approve",
        "record_id": "P20250101001",
        "changes": {
          "status": {
            "before": "Pending",
            "after": "Approved"
          }
        }
      }
    ],
    "total_count": 150
  }
}
```

---

## 5. Claude API 통합

### 5.1 OCR 처리 흐름

```
1. Frontend: 이미지 선택 → Base64 변환
2. Apps Script: 이미지 받기
3. Apps Script → Claude API:
   - Model: claude-3-sonnet-20240229
   - Max Tokens: 2048
   - Prompt: OCR 지시사항
4. Claude API Response: JSON 구조화된 데이터
5. Apps Script: 파싱 및 검증
6. Sheets: 데이터 저장
```

### 5.2 Claude API Request

**Endpoint**:
```
POST https://api.anthropic.com/v1/messages
```

**Headers**:
```
x-api-key: YOUR_API_KEY
anthropic-version: 2023-06-01
content-type: application/json
```

**Body**:
```json
{
  "model": "claude-3-sonnet-20240229",
  "max_tokens": 2048,
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image",
          "source": {
            "type": "base64",
            "media_type": "image/jpeg",
            "data": "/9j/4AAQSkZJRg..."
          }
        },
        {
          "type": "text",
          "text": "Analyze this receipt and extract the following information in JSON format:\n{\n  \"date\": \"YYYY-MM-DD\",\n  \"supplier\": \"Company Name\",\n  \"invoice_no\": \"Invoice Number\",\n  \"items\": [\n    {\n      \"name\": \"Item name\",\n      \"quantity\": number,\n      \"unit\": \"unit (kg/pcs/box)\",\n      \"unit_price\": number,\n      \"amount\": number,\n      \"category\": \"estimated category (Food/Packaging/Supplies/Others)\"\n    }\n  ],\n  \"amount_without_tax\": number,\n  \"tax_amount\": number,\n  \"total_amount\": number,\n  \"payment_method\": \"Cash/Card/Bank Transfer\"\n}\n\nIf you cannot read certain fields clearly, use \"N/A\" or null."
        }
      ]
    }
  ]
}
```

**Response**:
```json
{
  "id": "msg_01...",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "{\n  \"date\": \"2025-01-05\",\n  \"supplier\": \"Carrefour\",\n  \"invoice_no\": \"INV-12345\",\n  \"items\": [\n    {\n      \"name\": \"Chicken Breast\",\n      \"quantity\": 5,\n      \"unit\": \"kg\",\n      \"unit_price\": 25.0,\n      \"amount\": 125.0,\n      \"category\": \"Food\"\n    }\n  ],\n  \"amount_without_tax\": 120.0,\n  \"tax_amount\": 5.0,\n  \"total_amount\": 125.0,\n  \"payment_method\": \"Card\"\n}"
    }
  ],
  "stop_reason": "end_turn"
}
```

### 5.3 Apps Script에서 Claude 호출

```javascript
function callClaudeOCR(imageBase64) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');

  var payload = {
    model: 'claude-3-sonnet-20240229',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBase64.split(',')[1]  // Remove data:image/jpeg;base64,
            }
          },
          {
            type: 'text',
            text: getOCRPrompt()
          }
        ]
      }
    ]
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', options);
    var json = JSON.parse(response.getContentText());

    if (json.content && json.content[0] && json.content[0].text) {
      var ocrData = JSON.parse(json.content[0].text);
      return ocrData;
    } else {
      throw new Error('Invalid Claude API response');
    }
  } catch (error) {
    Logger.log('Claude API error: ' + error);
    throw error;
  }
}
```

### 5.4 Fallback 처리

```javascript
if (claudeError) {
  // 수동 입력 모드로 전환
  return {
    ok: true,
    data: {
      manual_entry: true,
      message: 'OCR failed. Please enter details manually.',
      error: claudeError.toString()
    }
  };
}
```

---

## 6. 보안 구현

### 6.1 인증 (Authentication)

**세션 관리**:
```javascript
// Apps Script - createSession
function createSession(user) {
  var token = Utilities.getUuid();
  var sessionData = {
    token: token,
    user_id: user.ID,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24*60*60*1000).toISOString()  // 24 hours
  };

  // PropertiesService에 저장 (임시 세션 저장소)
  var cache = CacheService.getScriptCache();
  cache.put(token, JSON.stringify(sessionData), 24*60*60);  // 24 hours TTL

  return token;
}

// Apps Script - validateSession
function validateSession(token) {
  if (!token) return null;

  var cache = CacheService.getScriptCache();
  var sessionJson = cache.get(token);

  if (!sessionJson) return null;

  var session = JSON.parse(sessionJson);
  var now = new Date();
  var expires = new Date(session.expires_at);

  if (now > expires) {
    cache.remove(token);
    return null;
  }

  return session;
}
```

### 6.2 권한 검증 (Authorization)

```javascript
function checkPermission(user, action, resource) {
  var role = user.role;

  // Admin: 모든 권한
  if (role === 'admin') return true;

  // Manager: 자기 지점만
  if (role === 'manager') {
    if (action === 'purchase.approve' && resource.branch_id === user.branch) {
      return true;
    }
    if (action === 'sales.submit' && resource.branch_id === user.branch) {
      return true;
    }
    if (action === 'attendance.approve' && resource.branch_id === user.branch) {
      return true;
    }
    return false;
  }

  // Staff: 제한적
  if (role === 'staff') {
    if (action === 'purchase.upload') return true;
    if (action === 'attendance.checkin') return true;
    if (action === 'payroll.view' && resource.employee_id === user.id) return true;
    return false;
  }

  return false;
}
```

### 6.3 입력 검증 (Input Validation)

```javascript
function sanitizeInput(input) {
  if (typeof input === 'string') {
    // XSS 방지
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  return input;
}

function validateEmail(email) {
  var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateDate(dateStr) {
  var date = new Date(dateStr);
  return !isNaN(date.getTime());
}
```

---

## 7. 성능 최적화

### 7.1 Apps Script 최적화

**배치 작업**:
```javascript
// Bad: 개별 Insert (느림)
for (var i = 0; i < items.length; i++) {
  sheet.appendRow([items[i].name, items[i].price]);
}

// Good: 배치 Insert (빠름)
var rows = items.map(function(item) {
  return [item.name, item.price];
});
sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 2).setValues(rows);
```

**캐싱**:
```javascript
// Cache frequently accessed data
var cache = CacheService.getScriptCache();

function getBranches() {
  var cached = cache.get('branches');
  if (cached) return JSON.parse(cached);

  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Branches');
  var data = sheet.getDataRange().getValues();
  var branches = parseBranches(data);

  cache.put('branches', JSON.stringify(branches), 3600);  // 1 hour
  return branches;
}
```

### 7.2 프론트엔드 최적화

**이미지 압축**:
```javascript
function compressImage(file, maxWidth, maxHeight) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        var width = img.width;
        var height = img.height;

        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(function(blob) {
          resolve(blob);
        }, 'image/jpeg', 0.8);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
```

**Debouncing**:
```javascript
function debounce(func, wait) {
  var timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Usage
var searchInput = document.getElementById('search');
searchInput.addEventListener('input', debounce(function() {
  performSearch(this.value);
}, 500));
```

### 7.3 페이징

```javascript
// Frontend
function loadPurchases(page = 1, perPage = 50) {
  API.call('purchase.list', {
    page: page,
    per_page: perPage
  }).then(function(result) {
    if (result.ok) {
      displayPurchases(result.data.purchases);
      displayPagination(result.data.total_count, page, perPage);
    }
  });
}

// Backend
function listPurchases(data) {
  var page = data.page || 1;
  var perPage = data.per_page || 50;

  var sheet = getSheet('Purchases');
  var allData = sheet.getDataRange().getValues();

  var start = (page - 1) * perPage + 1;  // +1 for header
  var end = Math.min(start + perPage, allData.length);

  var pageData = allData.slice(start, end);

  return {
    purchases: pageData.map(parsePurchaseRow),
    total_count: allData.length - 1,  // -1 for header
    page: page,
    per_page: perPage
  };
}
```

---

## 8. 테스트 전략

### 8.1 단위 테스트

**Apps Script (GAS Test Framework)**:
```javascript
function testLoginUser() {
  var result = loginUser({
    email: 'admin@bada.ae',
    password: 'admin123'
  });

  assert(result.token !== null, 'Token should be generated');
  assert(result.user.email === 'admin@bada.ae', 'Email should match');
  assert(result.user.role === 'admin', 'Role should be admin');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error('Assertion failed: ' + message);
  }
}
```

### 8.2 통합 테스트

**Postman/Thunder Client**:
```
Collection: BADA Restaurant API

1. Login
   - POST {BASE_URL}?callback=test&payload={"action":"auth.login",...}
   - Verify: ok = true, token exists

2. Upload Purchase
   - POST with token
   - Verify: purchase_id returned, status = Pending

3. Approve Purchase
   - POST with manager token
   - Verify: status = Approved, Items_Master updated
```

### 8.3 E2E 테스트

**Manual Checklist**:
```
[ ] Login as Admin → Dashboard loads
[ ] Upload receipt → OCR processes → Data saved
[ ] Manager approves purchase → Status changes
[ ] Submit daily sales → Calculations correct
[ ] Staff checks in → GPS verified
[ ] Manager approves attendance → Working days updated
[ ] Generate payroll → Amounts calculated correctly
[ ] Export to Excel → File downloads
[ ] Activity log → All actions logged
```

---

## 9. 배포

### 9.1 Apps Script 배포

**단계**:
```
1. 코드 완성
2. 배포 → 새 배포
   - 유형: 웹 앱
   - 실행 권한: 나
   - 액세스 권한: 모든 사용자
3. 배포 URL 복사
4. Frontend config.js 업데이트
```

**버전 관리**:
```
- 배포 → 배포 관리
- 설명: "v1.0.0 - Initial Release"
- 새 버전 배포 시 기존 유지 (롤백 가능)
```

### 9.2 GitHub Pages 배포

**단계**:
```
1. Repository → Settings → Pages
2. Source: main branch, /docs folder
3. Save
4. URL: https://ykhholdings.github.io/bada-restaurant-management/
```

**자동 배포**:
```
- main 브랜치에 push → 자동 배포
- GitHub Actions (이미 설정됨)
```

### 9.3 Claude API 설정

**Apps Script Properties**:
```
1. Apps Script 편집기
2. 프로젝트 설정 → 스크립트 속성
3. 추가:
   - CLAUDE_API_KEY: sk-ant-...
   - SPREADSHEET_ID: 1ABC...
```

### 9.4 Google Sheets 설정

**시트 생성**:
```
1. Google Sheets 새 스프레드시트 생성
2. 이름: "BADA Restaurant Management DB"
3. 시트 추가:
   - Users
   - Branches
   - Purchases
   - Purchase_Items
   - Items_Master
   - Sales
   - Sales_Details
   - Employees
   - Salary_Changes
   - Attendance
   - Payroll
   - Announcements
   - Activity_Log
4. 헤더 행 추가 (각 시트)
5. 스프레드시트 ID 복사 (URL에서)
6. Apps Script Properties에 저장
```

---

## 10. 모니터링 및 유지보수

### 10.1 로깅

**Apps Script Logger**:
```javascript
function logAction(user, action, details) {
  Logger.log({
    timestamp: new Date().toISOString(),
    user: user.email,
    action: action,
    details: details
  });

  // 또는 Sheets에 기록
  var logSheet = getSheet('Activity_Log');
  logSheet.appendRow([
    new Date(),
    user.id,
    action,
    JSON.stringify(details)
  ]);
}
```

### 10.2 에러 추적

**Try-Catch 패턴**:
```javascript
function handleAction(action, data, token) {
  try {
    // Action logic
    return result;
  } catch (error) {
    // Log error
    Logger.log('Error in ' + action + ': ' + error.toString());

    // Send email alert (optional)
    MailApp.sendEmail({
      to: 'admin@bada.ae',
      subject: 'BADA System Error',
      body: 'Error: ' + error.toString() + '\nAction: ' + action
    });

    throw error;  // Re-throw for client
  }
}
```

### 10.3 백업

**자동 백업 (Apps Script Trigger)**:
```javascript
function backupSheets() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var backupFolder = DriveApp.getFolderById('BACKUP_FOLDER_ID');

  var copy = ss.copy('BADA Backup ' + new Date().toISOString());
  backupFolder.addFile(DriveApp.getFileById(copy.getId()));
}

// Trigger: 매일 자정 실행
```

---

## 11. 향후 개선사항

### Phase 2
```
- 대시보드 차트 (Chart.js)
- 실시간 알림 (Firebase Cloud Messaging)
- 오프라인 지원 (Service Worker + IndexedDB)
- PDF 생성 (급여명세서, 영수증)
```

### Phase 3
```
- PWA (Progressive Web App)
- AI 기반 매출 예측
- 재고 관리 모듈
- 공급업체 포털
```

---

**문서 버전**: 1.0
**작성일**: 2025-12-07
**기술 검토**: Approved
