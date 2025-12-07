# PRD (Product Requirements Document)
## BADA Restaurant Management System

---

## 1. 제품 개요

### 1.1 제품명
**BADA Restaurant Management System**

### 1.2 목적
두바이 소재 BADA Restaurant 및 Crazy Ramen 3개 지점의 통합 운영 관리 시스템

### 1.3 대상 사용자
- **Admin** (최고 관리자): 전체 지점 관리, 모든 권한
- **Branch Manager** (지점 매니저): 자기 지점만 관리
  - BADA Restaurant Manager
  - Crazy Ramen Manager (각 지점별)
- **Staff** (직원): 출퇴근, 본인 급여 조회, 구매 업로드

### 1.4 지점 정보
| 브랜드 | 지점명 | 위치 | 좌표 |
|--------|--------|------|------|
| BADA Restaurant | Main Branch | Al Barsha | 25.0857, 55.2094 |
| Crazy Ramen | Branch 1 | Al Ghurair | 25.2697, 55.3273 |
| Crazy Ramen | Branch 2 | Muraqqabat | 25.2656, 55.3220 |
| Crazy Ramen | Branch 3 | Burjuman | 25.2529, 55.3021 |

---

## 2. 핵심 기능 요구사항

### 2.1 구매 관리 (Purchase Management)

#### 목적
- 식자재/용기 구매 내역 자동화
- VAT 신고 준비
- 품목별 단가 관리

#### 기능 상세

**2.1.1 영수증 OCR 업로드**
- **입력**: 영수증/Invoice 사진 업로드
- **OCR 처리**: Claude API를 통한 자동 인식
- **추출 정보**:
  - Date (구매일자)
  - Supplier (공급업체명)
  - Invoice No. (송장 번호)
  - Items (품목 리스트)
    - 품목명
    - 수량
    - 단위 (kg, pcs, box 등)
    - 단가
    - 금액
  - Amount Without Tax (세전 금액)
  - Tax Amount (세금)
  - Total Amount (총액)
  - Payment Method (결제 방법)

**2.1.2 메타데이터 입력**
- **업로더 선택**: 드롭다운에서 직원 선택
- **승인자 선택**: 드롭다운에서 매니저 선택
- **지점 선택**: 구매 발생 지점
- **카테고리 자동 분류**:
  - 식자재 (Food Ingredients)
  - 용기 (Packaging)
  - 소모품 (Supplies)
  - 기타 (Others)

**2.1.3 이중 데이터 처리**

**A. 지점별 비용 내역**
- 각 지점의 일별/월별 구매 비용 집계
- 카테고리별 분류
- 승인자별 분류
- Excel 다운로드 기능

**B. 품목별 단가 DB**
- 중복 제거된 품목 마스터
- 품목당 정보:
  ```
  - 품목명 (Item Name)
  - 카테고리 (Category)
  - 서브카테고리 (Sub-category)
  - 구매처 (Supplier)
  - 구매 단위 (Unit: kg/pcs/box)
  - 개당 단가 (Unit Price)
  - 최근 구매가 (Latest Price)
  - 평균 구매가 (Average Price)
  - 최저가/최고가 (Min/Max Price)
  - 마지막 구매일 (Last Purchase Date)
  ```

**2.1.4 승인 워크플로우**
```
Upload → Pending → Manager Review → Approved/Rejected
```
- **Pending**: 업로드 직후
- **Approved**: 매니저 승인 시 지점별 비용 및 품목 DB에 반영
- **Rejected**: 거절 시 사유 입력, 재업로드 가능

**2.1.5 OCR Prompt 설계**
```
다음 영수증 이미지를 분석해서 JSON 형식으로 반환해주세요:

{
  "date": "YYYY-MM-DD",
  "supplier": "공급업체명",
  "invoice_no": "송장번호",
  "items": [
    {
      "name": "품목명",
      "quantity": 숫자,
      "unit": "단위",
      "unit_price": 숫자,
      "amount": 숫자,
      "category": "추정 카테고리 (Food/Packaging/Supplies/Others)"
    }
  ],
  "amount_without_tax": 숫자,
  "tax_amount": 숫자,
  "total_amount": 숫자,
  "payment_method": "Cash/Card/Bank Transfer"
}
```

---

### 2.2 매출 관리 (Sales Management)

#### 목적
- 지점별 일일 마감 기록
- 매출 분석 및 리포팅

#### 기능 상세

**2.2.1 Daily Closing Report 입력**

**참고**: 첨부된 Daily Closing Report 양식 기반

**입력 필드**:
```
1. 기본 정보
   - Date (날짜)
   - Branch (지점)
   - Checked By (확인자)

2. 매출 정보
   - Opening Cash (시재금)
   - Cash Sales (현금 매출)
   - Card Sales (카드 매출)
   - Total Sales (자동 계산 = Cash + Card)

3. Closing Cash 상세
   - 100 AED × 수량
   - 50 AED × 수량
   - 20 AED × 수량
   - 10 AED × 수량
   - 5 AED × 수량
   - 1 AED × 수량
   - 0.5 AED × 수량
   - 0.25 AED × 수량
   - Closing Cash Amount (자동 계산)

4. Expenses (비용 내역)
   - Buyer (구매자)
   - Items (항목)
   - Price (금액)
   - Notes (메모)
   - Total Expenses (자동 계산)

5. 차액 계산
   - Expected Closing = Opening + Cash Sales - Expenses
   - Actual Closing = Closing Cash Amount
   - Difference = Actual - Expected
   - 차액 발생 시 경고 표시
```

**2.2.2 POS 시스템 통합 (참고)**
- 첨부된 X Report, Z Report 참조
- 카테고리별 매출:
  - Beverages (음료)
  - Promo (프로모션)
  - Ramen (라면)
  - Rice Meal (밥류)
  - Side Menu (사이드 메뉴)

**2.2.3 매출 분석 대시보드**
- **일별 매출**: 캘린더 뷰
- **주별/월별 집계**: 그래프
- **지점별 비교**: 막대 그래프
- **Payment Type 분석**: 원형 차트 (Cash vs Card 비율)
- **카테고리별 매출**: 테이블 및 차트
- **Excel 다운로드**: 날짜 범위 선택

---

### 2.3 급여 관리 (Payroll Management)

#### 목적
- 직원 급여 자동 계산
- 근무일수 기반 정산
- 급여 명세서 생성

#### 접근 권한
- **Admin**: 전체 직원 급여 관리
- **Manager**: 자기 지점 직원만
- **Staff**: 본인 급여만 조회

#### 기능 상세

**2.3.1 직원 급여 설정**
```
직원 정보:
- Employee ID
- Name
- Email
- Branch
- Role (Staff/Manager/Admin)
- Monthly Salary (월급여)
- Hire Date (입사일)
- Status (Active/Inactive)

급여 변동 이력:
- Effective Date (적용일)
- Previous Salary (이전 급여)
- New Salary (새 급여)
- Reason (사유)
```

**2.3.2 급여 자동 계산**

**공식** (첨부된 급여 시트 참조):
```
표준 근무일수 = 26일 (주 1회 휴무 기준)

1. 급여 변동이 없는 경우:
   Payment = (Monthly Salary ÷ 26) × Actual Working Days

2. 급여 변동이 있는 경우:
   - 변경 전 기간: (Old Salary ÷ 26) × Days Before Change
   - 변경 후 기간: (New Salary ÷ 26) × Days After Change
   - Total Payment = Sum of above

3. 반올림:
   - 1 AED 이하 반올림
   - 예: 2884.615 → 2884.6 → 2885.0

4. 특수 케이스:
   - 반일 근무: 0.5일로 계산
   - 예: 25.5일 근무
```

**예시** (첨부 이미지 참조):
```
Bhab:
- Salary: 3000 AED
- Working Days: 28.5일
- Payment: (3000 ÷ 26) × 28.5 = 3288.46 → 3288.5 AED

Luneza:
- Salary: 2500 AED
- Working Days: 30일
- Payment: (2500 ÷ 26) × 30 = 2884.61 → 2884.6 AED
```

**2.3.3 급여 명세서 생성**
```
Payslip 내용:
- Employee Name
- Employee ID
- Branch
- Month & Year
- Basic Salary
- Working Days (Actual / Standard)
- Gross Payment
- Deductions (if any)
- Net Payment
```

**2.3.4 급여 리포트**
- **월별 급여 요약**: 전체 지점 또는 지점별
- **직원별 급여 이력**: 월별 추이
- **Excel 다운로드**: 급여 대장

---

### 2.4 출퇴근 관리 (Attendance Management)

#### 목적
- GPS 기반 출석 체크
- 근무시간 자동 집계
- 급여 계산 연동

#### 기능 상세

**2.4.1 출근 체크 (Check-in)**
```
프로세스:
1. 직원이 Check-in 버튼 클릭
2. GPS 위치 획득
3. 지점 위치와 비교 (반경 100m 이내)
4. 위치 확인 시:
   - Check-in 시간 기록
   - 상태: Pending
5. 매니저 승인 대기
```

**GPS 좌표 (재확인 필요)**:
```
BADA Restaurant: 25.0857, 55.2094
Crazy Ramen Al Ghurair: 25.2697, 55.3273
Crazy Ramen Muraqqabat: 25.2656, 55.3220
Crazy Ramen Burjuman: 25.2529, 55.3021

허용 오차: 100m (0.001도)
```

**2.4.2 퇴근 체크 (Check-out)**
```
프로세스:
1. 직원이 Check-out 버튼 클릭
2. Check-out 시간 기록
3. 총 근무시간 자동 계산
4. 매니저 승인 대기
```

**2.4.3 매니저 승인**
```
승인 화면:
- 일자별 출석 리스트
- 직원명, Check-in 시간, Check-out 시간
- GPS 좌표 표시
- 근무시간 표시
- 승인/수정/거절 버튼

수정 가능 항목:
- Check-in/Check-out 시간 수정
- 반일 근무 표시
- 메모 추가
```

**2.4.4 근무일수 집계**
```
월별 자동 계산:
- 총 출근 일수
- 반일 근무 포함 (예: 25.5일)
- 결근 일수
- 지각/조퇴 횟수
- 총 근무시간

급여 계산 연동:
- Actual Working Days → Payroll 계산
```

**2.4.5 출석 캘린더**
```
월별 캘린더 뷰:
- 출근: 초록색
- 반일: 노란색
- 결근: 빨간색
- 주말/휴무: 회색
- 클릭 시 상세 정보 표시
```

---

### 2.5 활동 로그 (Activity Log)

#### 목적
- 모든 수정/삭제 이력 추적
- 감사 추적 (Audit Trail)
- 보안 및 책임 추적

#### 기능 상세

**2.5.1 로그 기록 항목**
```
모든 데이터 변경 시 자동 기록:
- Timestamp (정확한 시각)
- User ID & Name (사용자)
- Action Type (Create/Update/Delete)
- Module (Purchase/Sales/Payroll/Attendance)
- Record ID (대상 레코드)
- Before Data (변경 전 데이터) - JSON
- After Data (변경 후 데이터) - JSON
- IP Address (선택사항)
- Device Info (선택사항)
```

**2.5.2 로그 조회**
```
필터링:
- 날짜 범위
- 사용자
- 모듈
- 액션 타입

표시 형식:
- 타임라인 뷰
- 테이블 뷰
- 상세 Diff 뷰 (변경 전/후 비교)
```

**2.5.3 보안**
```
- Admin만 전체 로그 조회 가능
- Manager는 자기 지점 로그만
- Staff는 본인 관련 로그만
- 로그는 삭제 불가 (Immutable)
```

---

## 3. 사용자 인터페이스 요구사항

### 3.1 로그인 화면

#### 디자인 요소
- **로고 이미지**: 상단 중앙, 반응형 (최대 200px 높이)
- **로그인 폼**:
  ```
  - Email 입력
  - Password 입력 (마스킹)
  - Remember Me 체크박스 (선택사항)
  - Login 버튼
  - Forgot Password 링크
  ```
- **반응형 디자인**:
  - 모바일: 세로 레이아웃
  - 태블릿/PC: 중앙 카드 형식

#### 색상 테마 (예시)
```
Primary: #4A90E2 (블루)
Secondary: #F5A623 (오렌지)
Success: #7ED321 (그린)
Danger: #D0021B (레드)
Background: #F8F9FA (밝은 회색)
```

### 3.2 대시보드 (역할별)

#### Admin Dashboard
```
레이아웃:
┌─────────────────────────────────┐
│  Header (Logo, User Info)      │
├─────────────────────────────────┤
│  Summary Cards (4개)            │
│  - Total Sales (Today)          │
│  - Pending Approvals            │
│  - Active Employees             │
│  - Alerts/Notifications         │
├─────────────────────────────────┤
│  Main Menu (큰 아이콘 버튼)     │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐      │
│  │ 구 │ │ 매 │ │ 급 │ │ 출 │     │
│  │ 매 │ │ 출 │ │ 여 │ │ 석 │     │
│  └───┘ └───┘ └───┘ └───┘      │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐      │
│  │분석│ │로그│ │설정│ │ ? │      │
│  └───┘ └───┘ └───┘ └───┘      │
└─────────────────────────────────┘
```

#### Manager Dashboard
```
- 자기 지점 매출/비용 요약
- 승인 대기 항목 (배지 표시)
- 직원 출석 현황
- 빠른 액세스 메뉴 (구매 승인, 출석 승인)
```

#### Staff Dashboard
```
- 간소화된 메뉴
- 큰 버튼:
  - Check In (출근)
  - Check Out (퇴근)
  - Upload Receipt (영수증 업로드)
  - My Payslip (급여 조회)
- 공지사항
```

### 3.3 반응형 디자인

#### 모바일 (< 768px)
```
- 세로 스크롤
- 큰 터치 버튼 (최소 44px)
- 햄버거 메뉴
- 단일 컬럼 레이아웃
```

#### 태블릿 (768px - 1024px)
```
- 2컬럼 그리드
- 사이드바 메뉴
```

#### PC (> 1024px)
```
- 3-4컬럼 그리드
- 고정 사이드바
- 대시보드 위젯
```

### 3.4 UX 고려사항

**3.4.1 중복 제출 방지**
```javascript
버튼 클릭 시:
1. 버튼 즉시 비활성화
2. 로딩 스피너 표시
3. "Processing..." 텍스트
4. 완료/오류 후 버튼 재활성화
```

**3.4.2 로딩 인디케이터**
```
- API 호출 중: 스피너 표시
- 이미지 업로드 중: 진행률 표시
- OCR 처리 중: "Analyzing receipt..." 메시지
```

**3.4.3 에러 핸들링**
```
- 네트워크 오류: "Connection failed. Retrying..."
- Validation 오류: 필드별 에러 메시지
- 서버 오류: "Server error. Please try again later."
```

**3.4.4 성공 피드백**
```
- 저장 성공: 녹색 체크 아이콘 + "Saved successfully!"
- 승인 완료: "Approved!" 메시지
- 업로드 완료: "Receipt uploaded and processed!"
```

---

## 4. 데이터 관리

### 4.1 Google Sheets 구조

#### Master Data Sheets
```
1. Users
   - ID, Name, Email, Password, Role, Branch, Active, Created

2. Branches
   - ID, Name, Location, Lat, Lng, Type (Restaurant/Ramen)

3. Categories
   - ID, Name, Type (Purchase/Sales), Parent

4. Suppliers
   - ID, Name, Contact, Email, Phone, Address
```

#### Transaction Sheets
```
5. Purchases
   - ID, Date, Branch, Supplier, Invoice_No, Uploader, Approver,
     Status, Amount_No_Tax, Tax, Total, Payment, Image_URL,
     OCR_Data (JSON), Created, Updated

6. Purchase_Items
   - ID, Purchase_ID, Item_Name, Category, Quantity, Unit,
     Unit_Price, Amount

7. Items_Master
   - Item_Name, Category, Latest_Supplier, Latest_Unit,
     Latest_Price, Avg_Price, Min_Price, Max_Price, Last_Purchase

8. Sales
   - ID, Date, Branch, Checked_By, Opening_Cash, Cash_Sales,
     Card_Sales, Total_Sales, Expenses, Closing_Cash, Difference,
     Created

9. Sales_Expenses
   - ID, Sales_ID, Buyer, Items, Price, Notes

10. Payroll
    - ID, Employee_ID, Month, Year, Basic_Salary, Working_Days,
      Payment, Status, Created

11. Salary_Changes
    - ID, Employee_ID, Effective_Date, Old_Salary, New_Salary,
      Reason

12. Attendance
    - ID, Employee_ID, Date, Check_In, Check_Out, Total_Hours,
      GPS_Lat_In, GPS_Lng_In, Status, Approved_By, Notes,
      Is_Half_Day

13. Activity_Log
    - ID, Timestamp, User_ID, User_Name, Action, Module,
      Record_ID, Before (JSON), After (JSON), IP
```

### 4.2 Excel 내보내기

**각 모듈별 내보내기 버튼**:
```
옵션:
- 날짜 범위 선택
- 지점 필터
- 상태 필터 (Pending/Approved/Rejected)
- 카테고리 필터

파일명 형식:
- BADA_Purchases_2025-01-01_to_2025-01-31.xlsx
- BADA_Sales_AlBarsha_2025-01.xlsx
- BADA_Payroll_2025-01.xlsx
```

---

## 5. 보안 및 권한

### 5.1 역할별 권한 매트릭스

| 기능 | Admin | Manager | Staff |
|------|-------|---------|-------|
| **Purchase** |
| - Upload Receipt | ✓ | ✓ | ✓ |
| - Approve Purchase | ✓ | ✓ (own branch) | ✗ |
| - View All Purchases | ✓ | ✓ (own branch) | ✗ |
| - Edit Item Master | ✓ | ✗ | ✗ |
| **Sales** |
| - Submit Daily Closing | ✓ | ✓ (own branch) | ✗ |
| - View Sales Reports | ✓ | ✓ (own branch) | ✗ |
| - Export Sales Data | ✓ | ✓ (own branch) | ✗ |
| **Payroll** |
| - View All Payroll | ✓ | ✓ (own branch) | ✗ |
| - View Own Payslip | ✓ | ✓ | ✓ |
| - Edit Salary | ✓ | ✗ | ✗ |
| - Generate Payslips | ✓ | ✓ (own branch) | ✗ |
| **Attendance** |
| - Check In/Out | ✓ | ✓ | ✓ |
| - Approve Attendance | ✓ | ✓ (own branch) | ✗ |
| - View Own Attendance | ✓ | ✓ | ✓ |
| - Edit Attendance | ✓ | ✓ (own branch) | ✗ |
| **Activity Log** |
| - View All Logs | ✓ | ✗ | ✗ |
| - View Own Branch Logs | ✗ | ✓ | ✗ |
| **Settings** |
| - Manage Users | ✓ | ✗ | ✗ |
| - Manage Branches | ✓ | ✗ | ✗ |
| - System Settings | ✓ | ✗ | ✗ |

### 5.2 데이터 보안
```
- Password Hashing: SHA-256 (또는 평문 - 현재 구현)
- Session Token: Random UUID
- Session Expiry: 24 hours
- HTTPS Only (GitHub Pages 기본)
- Input Validation: XSS 방지
- SQL Injection 방지: (N/A - Google Sheets)
```

---

## 6. 기술적 고려사항

### 6.1 성능

**6.1.1 Google Apps Script 제한**
```
- 최대 실행 시간: 6분
- 일일 Quota: 20,000 트리거 (무료 계정)
- 동시 실행: 30개
```

**대응 방안**:
```
- 대용량 데이터: 페이징 처리 (한 번에 100개)
- 배치 작업: 트리거 분할
- 캐싱: Properties Service 활용
```

**6.1.2 Claude API 최적화**
```
- 이미지 크기: 최대 1MB (압축 필요)
- 재시도 로직: 최대 3회
- Fallback: 수동 입력 옵션
```

**6.1.3 프론트엔드 최적화**
```
- 이미지 Lazy Loading
- API 응답 캐싱 (LocalStorage)
- 번들 최소화 (필요시)
```

### 6.2 GPS 정확도

**설정**:
```javascript
navigator.geolocation.getCurrentPosition(
  successCallback,
  errorCallback,
  {
    enableHighAccuracy: true, // 고정확도 모드
    timeout: 10000,           // 10초 타임아웃
    maximumAge: 0             // 캐시 사용 안 함
  }
);
```

**허용 오차**:
```
지점 좌표와의 거리 계산 (Haversine formula):
- 허용 반경: 100m
- GPS 오차: ±10m 고려
```

**대체 방안**:
```
- GPS 미지원: 매니저가 수동 승인
- GPS 오류: 사진 촬영 (매장 내부 증빙)
```

### 6.3 중복 제출 방지

**클라이언트 측**:
```javascript
button.addEventListener('click', async function() {
  // 1. 버튼 비활성화
  this.disabled = true;
  this.textContent = 'Processing...';

  try {
    await submitData();
    // 2. 성공 메시지
    alert('Success!');
  } catch (error) {
    // 3. 에러 처리
    alert('Error: ' + error.message);
  } finally {
    // 4. 버튼 재활성화
    this.disabled = false;
    this.textContent = 'Submit';
  }
});
```

**서버 측** (Apps Script):
```javascript
- Idempotency Key: 고유 요청 ID
- Duplicate Check: 최근 1분 내 동일 요청 차단
```

### 6.4 오프라인 지원 (선택사항)

**Phase 2 고려**:
```
- Service Worker
- IndexedDB 로컬 저장
- 온라인 복귀 시 자동 동기화
```

---

## 7. 비기능 요구사항

### 7.1 사용성
- 모바일 우선 설계 (출석체크 주 사용)
- 3클릭 이내 모든 기능 접근
- 직관적인 아이콘 및 라벨

### 7.2 성능
- 페이지 로드: < 2초
- API 응답: < 3초 (OCR 제외)
- OCR 처리: < 10초

### 7.3 접근성
- WCAG 2.1 Level AA 준수 (가능한 범위)
- 키보드 네비게이션
- 명확한 에러 메시지

### 7.4 확장성
- 향후 지점 추가 용이
- 새로운 모듈 추가 가능한 구조
- API 버전 관리

---

## 8. 출시 계획

### Phase 1: MVP (4주)
```
Week 1: 인증 + 데이터 구조
Week 2: 구매 관리 + OCR
Week 3: 매출 + 급여
Week 4: 출석 + 로그 + 테스트
```

### Phase 2: Enhancement (2주)
```
- 대시보드 차트/그래프
- 고급 필터링
- 알림 기능
```

### Phase 3: Advanced (미정)
```
- 오프라인 지원
- 모바일 앱 (PWA)
- AI 기반 매출 예측
```

---

## 9. 성공 지표

### KPI
```
- 구매 입력 시간: 수동 5분 → 자동 30초
- 급여 계산 시간: 수동 2시간 → 자동 1분
- 출석 승인 시간: < 5분
- 시스템 가용성: > 99%
- 사용자 만족도: > 4.5/5
```

---

## 10. 참고 자료

### 첨부 문서
1. Daily Closing Report 양식
2. X Report / Z Report
3. 급여 계산 예시
4. PRD 요구사항 상세

### 기술 문서
- Google Apps Script API
- Claude API Documentation
- Google Sheets API

---

**문서 버전**: 1.0
**작성일**: 2025-12-07
**승인자**: Admin

