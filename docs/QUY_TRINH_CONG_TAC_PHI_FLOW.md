# Quy Trình Công Tác Phí - Flow Ngắn Gọn

## 📋 Tổng Quan

Quy trình công tác phí được chia thành **2 flow riêng biệt** tùy thuộc vào loại địa điểm:

- 🏠 **Trong nước (DOMESTIC)**: 2 bước phê duyệt (Cấp 1 + Cấp 2)
- 🛫 **Ngoài nước (INTERNATIONAL)**: 3 bước phê duyệt (Cấp 1 + Cấp 2 + CEO)

---

## 🏠 FLOW CÔNG TÁC TRONG NƯỚC (DOMESTIC)

```
[1] Nhân viên tạo đơn
    ├─ Chọn "Trong nước"
    ├─ Nhập: Mục đích, Địa điểm, Thời gian, Số tiền tạm ứng
    ├─ Phụ cấp: 230,000 VND/ngày (nếu qua đêm)
    └─ Trạng thái: Chờ duyệt cấp 1
          │
          ↓
[2] Quản lý Trực tiếp duyệt
    ├─ Duyệt/Từ chối với ghi chú
    └─ Nếu duyệt:
          │
          ↓
    Trạng thái: Chờ duyệt cấp 2
          │
          ↓
[3] Giám đốc Chi nhánh duyệt
    ├─ Duyệt/Từ chối với ghi chú
    └─ Nếu duyệt:
          │
          ↓
    Trạng thái: Chờ xử lý tạm ứng ✅
    (BỎ QUA bước CEO)
          │
          ↓
[4] HR xử lý tạm ứng
    ├─ Xác nhận/Điều chỉnh số tiền
    ├─ Chọn hình thức thanh toán
    └─ Trạng thái tạm ứng: Chờ kế toán xác nhận
          │
          ↓
[5] Kế toán xác nhận chuyển khoản
    ├─ Thực hiện chuyển khoản
    └─ Trạng thái tạm ứng: Đã chuyển khoản
          │
          ↓
    Trạng thái: Chờ quyết toán
          │
          ↓
[6] Nhân viên submit báo cáo hoàn ứng
    ├─ Nhập chi phí thực tế
    ├─ Upload hóa đơn/chứng từ
    └─ Trạng thái quyết toán: Đã gửi
          │
          ↓
[7] HR xác nhận báo cáo
    ├─ Kiểm tra tính hợp lệ
    └─ Trạng thái quyết toán: HR đã xác nhận
          │
          ↓
    Trạng thái: Chờ kế toán xử lý
          │
          ↓
[8] Kế toán kiểm tra, quyết toán & giải ngân
    ├─ Đối chiếu chi phí vs tạm ứng
    ├─ Nếu chi phí <= tạm ứng + đầy đủ chứng từ:
    │     ├─ Giải ngân ngay
    │     └─ Trạng thái: Đã hoàn tất ✅
    │
    └─ Nếu chi phí > tạm ứng:
          ├─ Trạng thái: Chờ phê duyệt ngoại lệ
          │     │
          │     ↓
          │ [9] CEO phê duyệt ngoại lệ
          │     ├─ Duyệt/Từ chối phần vượt
          │     └─ Trạng thái: Đã hoàn tất
          │           │
          │           ↓
          └─→ Kế toán giải ngân ✅
```

**Tóm tắt**: Nhân viên → Quản lý → Giám đốc Chi nhánh → HR → Kế toán → Nhân viên báo cáo → HR xác nhận → Kế toán quyết toán & giải ngân

---

## 🛫 FLOW CÔNG TÁC NGOÀI NƯỚC (INTERNATIONAL)

```
[1] Nhân viên tạo đơn
    ├─ Chọn "Ngoài nước"
    ├─ Nhập: Mục đích, Địa điểm, Thời gian, Số tiền tạm ứng
    ├─ Phụ cấp tự động:
    │     ├─ Châu Âu (EU): 60 USD/ngày
    │     └─ Châu Á (Asian): 40 USD/ngày
    └─ Trạng thái: Chờ duyệt cấp 1
          │
          ↓
[2] Quản lý Trực tiếp duyệt
    ├─ Duyệt/Từ chối với ghi chú
    └─ Nếu duyệt:
          │
          ↓
    Trạng thái: Chờ duyệt cấp 2
          │
          ↓
[3] Giám đốc Chi nhánh duyệt
    ├─ Duyệt/Từ chối với ghi chú
    └─ Nếu duyệt:
          │
          ↓
    Trạng thái: Chờ CEO duyệt ✅
          │
          ↓
[4] Tổng Giám đốc (CEO) duyệt - BẮT BUỘC
    ├─ Duyệt/Từ chối với ghi chú
    └─ Nếu duyệt:
          │
          ↓
    Trạng thái: Chờ xử lý tạm ứng ✅
          │
          ↓
[5] HR xử lý tạm ứng
    ├─ Xác nhận/Điều chỉnh số tiền
    ├─ Chọn hình thức thanh toán
    └─ Trạng thái tạm ứng: Chờ kế toán xác nhận
          │
          ↓
[6] Kế toán xác nhận chuyển khoản
    ├─ Thực hiện chuyển khoản
    └─ Trạng thái tạm ứng: Đã chuyển khoản
          │
          ↓
    Trạng thái: Chờ quyết toán
          │
          ↓
[7] Nhân viên submit báo cáo hoàn ứng
    ├─ Nhập chi phí thực tế
    ├─ Upload hóa đơn/chứng từ
    └─ Trạng thái quyết toán: Đã gửi
          │
          ↓
[8] HR xác nhận báo cáo
    ├─ Kiểm tra tính hợp lệ
    └─ Trạng thái quyết toán: HR đã xác nhận
          │
          ↓
    Trạng thái: Chờ kế toán xử lý
          │
          ↓
[9] Kế toán kiểm tra, quyết toán & giải ngân
    ├─ Đối chiếu chi phí vs tạm ứng
    ├─ Nếu chi phí <= tạm ứng + đầy đủ chứng từ:
    │     ├─ Giải ngân ngay
    │     └─ Trạng thái: Đã hoàn tất ✅
    │
    └─ Nếu chi phí > tạm ứng:
          ├─ Trạng thái: Chờ phê duyệt ngoại lệ
          │     │
          │     ↓
          │ [10] CEO phê duyệt ngoại lệ
          │     ├─ Duyệt/Từ chối phần vượt
          │     └─ Trạng thái: Đã hoàn tất
          │           │
          │           ↓
          └─→ Kế toán giải ngân ✅
```

**Tóm tắt**: Nhân viên → Quản lý → Giám đốc Chi nhánh → **CEO** → HR → Kế toán → Nhân viên báo cáo → HR xác nhận → Kế toán quyết toán & giải ngân

---

## 📊 So Sánh 2 Flow

| Tiêu chí | Trong nước (DOMESTIC) | Ngoài nước (INTERNATIONAL) |
|----------|----------------------|---------------------------|
| **Số bước phê duyệt** | 2 bước | 3 bước |
| **Bước phê duyệt** | Cấp 1 + Cấp 2 | Cấp 1 + Cấp 2 + **CEO** |
| **Phê duyệt CEO** | ❌ Không có | ✅ Bắt buộc (Bước 4) |
| **Trạng thái sau phê duyệt** | Chờ xử lý tạm ứng (từ Cấp 2) | Chờ xử lý tạm ứng (từ CEO) |
| **Phụ cấp sinh hoạt** | 230,000 VND/ngày<br>(nếu qua đêm) | EU: 60 USD/ngày<br>Asian: 40 USD/ngày |
| **Các bước còn lại** | ✅ Giống nhau (Bước 5-9) | ✅ Giống nhau (Bước 5-10) |

---

## ⚠️ Trường Hợp Đặc Biệt

**Nếu Quản lý Trực tiếp = Giám đốc Chi nhánh:**

- **Trong nước**: Bỏ qua bước Cấp 2 → Chuyển thẳng `PENDING_FINANCE` sau Cấp 1
- **Ngoài nước**: Bỏ qua bước Cấp 2 → Chuyển thẳng `PENDING_CEO` sau Cấp 1

---

## 🔄 Luồng Trạng Thái

### Trong nước (DOMESTIC):
```
Chờ duyệt cấp 1 → Chờ duyệt cấp 2 → Chờ xử lý tạm ứng → 
Chờ quyết toán → Chờ kế toán xử lý → Đã hoàn tất
```

### Ngoài nước (INTERNATIONAL):
```
Chờ duyệt cấp 1 → Chờ duyệt cấp 2 → Chờ CEO duyệt → 
Chờ xử lý tạm ứng → Chờ quyết toán → Chờ kế toán xử lý → Đã hoàn tất
```

**Lưu ý**: Nếu chi phí > tạm ứng, sẽ có thêm "Chờ phê duyệt ngoại lệ" trước khi "Đã hoàn tất".

---

## 📝 Các Module Liên Quan

| Bước | Module | Route |
|------|--------|-------|
| 1. Tạo đơn | `TravelExpense` | `/travel-expense` |
| 2-3-4. Phê duyệt | `TravelExpenseApproval` | `/travel-expense-approval` |
| 4-5. HR xử lý tạm ứng | `TravelExpenseAdvanceProcessing` | `/travel-expense-advance-processing` |
| 5-6. Kế toán chuyển khoản | `TravelExpenseAccountant` (Tab "Tạm ứng") | `/travel-expense-accountant` |
| 6-7. Báo cáo hoàn ứng | `TravelExpenseSettlement` | `/travel-expense-settlement` |
| 7-8. HR xác nhận | `TravelExpenseManagement` | `/travel-expense-management` |
| 8-9. Quyết toán & giải ngân | `TravelExpenseAccountant` (Tab "Kiểm tra") | `/travel-expense-accountant` |

---

## 📌 Bảng Tra Cứu Trạng Thái

| Trạng thái (Tiếng Việt) | Trạng thái (Code) | Mô tả |
|-------------------------|-------------------|-------|
| Chờ duyệt cấp 1 | `PENDING_LEVEL_1` | Đơn mới tạo, chờ Quản lý Trực tiếp duyệt |
| Chờ duyệt cấp 2 | `PENDING_LEVEL_2` | Đã được Cấp 1 duyệt, chờ Giám đốc Chi nhánh duyệt |
| Chờ CEO duyệt | `PENDING_CEO` | Đã được Cấp 2 duyệt (ngoài nước), chờ CEO duyệt |
| Chờ xử lý tạm ứng | `PENDING_FINANCE` | Đã qua phê duyệt, chờ HR xử lý tạm ứng |
| Chờ quyết toán | `PENDING_SETTLEMENT` | Đã nhận tạm ứng, chờ nhân viên submit báo cáo |
| Chờ kế toán xử lý | `PENDING_ACCOUNTANT` | Đã submit báo cáo, chờ kế toán quyết toán |
| Chờ phê duyệt ngoại lệ | `PENDING_EXCEPTION_APPROVAL` | Chi phí vượt ngân sách, chờ CEO phê duyệt |
| Đã hoàn tất | `SETTLED` | Đã hoàn tất toàn bộ quy trình |
| Đã từ chối | `REJECTED` | Đơn bị từ chối ở bất kỳ bước nào |

### Trạng thái Tạm ứng (advance_status):
- **Chờ kế toán xác nhận** (`PENDING_ACCOUNTANT`): HR đã xử lý, chờ kế toán chuyển khoản
- **Đã chuyển khoản** (`TRANSFERRED`): Kế toán đã chuyển khoản tạm ứng

### Trạng thái Quyết toán (settlement_status):
- **Đã gửi** (`SUBMITTED`): Nhân viên đã submit báo cáo hoàn ứng
- **HR đã xác nhận** (`HR_CONFIRMED`): HR đã xác nhận báo cáo hợp lệ
