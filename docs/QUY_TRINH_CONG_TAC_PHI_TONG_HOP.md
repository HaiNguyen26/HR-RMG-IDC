# Quy Trình Công Tác Phí & Chi Phí Tiếp Khách - Tổng Hợp

Tài liệu này tổng hợp **Công tác phí** và **Chi phí tiếp khách** vào một file để tiện tra cứu.

---

## 📋 Flow Ngắn Gọn (Công tác phí)

### 🏠 Công tác trong nước (DOMESTIC)

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

### 🛫 Công tác ngoài nước (INTERNATIONAL)

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

---

## 📊 Tài Liệu Đầy Đủ

### Tổng quan

Quy trình công tác phí được chia thành 2 flow (DOMESTIC/INTERNATIONAL). Điểm khác biệt chính:
- Công tác trong nước **không cần CEO duyệt**
- Công tác ngoài nước **bắt buộc CEO duyệt**

### Chi tiết flow (đầy đủ)

Nội dung chi tiết về điều kiện, status, xử lý tạm ứng, hoàn ứng, quyết toán và ngoại lệ được giữ nguyên từ tài liệu đầy đủ trước đây.

---

## 🔄 FLOW - QUY TRÌNH HOẠT ĐỘNG (CHI TIẾT)

### 🛫 FLOW CÔNG TÁC NGOÀI NƯỚC (INTERNATIONAL)

**GIAI ĐOẠN 1: KHỞI TẠO VÀ PHÊ DUYỆT**
1. Nhân viên tạo yêu cầu công tác (chọn "Ngoài nước")
2. Quản lý trực tiếp phê duyệt (Cấp 1)
3. Giám đốc Chi nhánh phê duyệt (Cấp 2)
4. Tổng Giám đốc phê duyệt (Bắt buộc cho công tác nước ngoài)
5. HR xử lý tạm ứng
6. Kế toán xác nhận chuyển khoản tạm ứng

**GIAI ĐOẠN 2: HOÀN ỨNG VÀ QUYẾT TOÁN**
7. Nhân viên submit báo cáo hoàn ứng
8. HR xác nhận báo cáo
9. Kế toán kiểm tra, quyết toán và giải ngân
10. CEO/Admin phê duyệt ngoại lệ (nếu vượt ngân sách)

---

### 🏠 FLOW CÔNG TÁC TRONG NƯỚC (DOMESTIC)

**GIAI ĐOẠN 1: KHỞI TẠO VÀ PHÊ DUYỆT**
1. Nhân viên tạo yêu cầu công tác (chọn "Trong nước")
2. Quản lý trực tiếp phê duyệt (Cấp 1)
3. Giám đốc Chi nhánh phê duyệt (Cấp 2)
4. Bỏ qua bước CEO → chuyển thẳng đến xử lý tạm ứng
5. HR xử lý tạm ứng
6. Kế toán xác nhận chuyển khoản tạm ứng

**GIAI ĐOẠN 2: HOÀN ỨNG VÀ QUYẾT TOÁN**
7. Nhân viên submit báo cáo hoàn ứng
8. HR xác nhận báo cáo
9. Kế toán kiểm tra, quyết toán và giải ngân
10. CEO/Admin phê duyệt ngoại lệ (nếu vượt ngân sách)

---

## 📌 Lưu ý đặc biệt

- Nếu quản lý trực tiếp cũng là Giám đốc Chi nhánh:
  - Trong nước: bỏ qua bước Cấp 2 → `PENDING_FINANCE`
  - Ngoài nước: bỏ qua bước Cấp 2 → `PENDING_CEO`

---

## 📋 Trạng thái chính

| Trạng thái | Mô tả |
|-----------|-------|
| `PENDING_LEVEL_1` | Chờ Quản lý Trực tiếp duyệt |
| `PENDING_LEVEL_2` | Chờ Giám đốc Chi nhánh duyệt |
| `PENDING_CEO` | Chờ Tổng Giám đốc duyệt |
| `PENDING_FINANCE` | Chờ HR xử lý tạm ứng |
| `PENDING_SETTLEMENT` | Chờ nhân viên submit báo cáo |
| `PENDING_ACCOUNTANT` | Chờ kế toán xử lý quyết toán |
| `PENDING_EXCEPTION_APPROVAL` | Chờ CEO/Admin duyệt ngoại lệ |
| `SETTLED` | Hoàn tất |
| `REJECTED` | Từ chối |

---

## 🍽️ Quy Trình Chi Phí Tiếp Khách

### Flow tổng quan

```
[1] Nhân viên tạo đơn tiếp khách
    ├─ Nhập: Chi nhánh, ngày tiếp khách, khoản chi, hóa đơn/chứng từ
    └─ Trạng thái: PENDING_BRANCH_DIRECTOR (mặc định)
          │
          ↓
[2] Quản lý/Giám đốc chi nhánh duyệt
    ├─ Duyệt/Từ chối/YC bổ sung
    └─ Nếu duyệt: APPROVED_BRANCH_DIRECTOR
          │
          ↓
[3] Kế toán tổng hợp & xử lý
    ├─ Tổng hợp báo cáo
    └─ Trạng thái: ACCOUNTANT_PROCESSED
          │
          ↓
[4] CEO duyệt
    ├─ Duyệt/Từ chối
    └─ Nếu duyệt: APPROVED_CEO
          │
          ↓
[5] Kế toán thanh toán
    └─ Trạng thái: PAID
```

### Trường hợp chọn CEO ngay từ đầu
- Nếu đơn được chọn duyệt bởi CEO ngay từ bước tạo:
  - Trạng thái ban đầu: `PENDING_CEO`
  - Bỏ qua bước Giám đốc chi nhánh

### Trạng thái chính (Tiếp khách)

| Trạng thái | Mô tả |
|-----------|-------|
| `PENDING_BRANCH_DIRECTOR` | Chờ Giám đốc chi nhánh duyệt |
| `REQUEST_CORRECTION` | Yêu cầu bổ sung |
| `APPROVED_BRANCH_DIRECTOR` | Đã duyệt cấp 1 |
| `REJECTED_BRANCH_DIRECTOR` | Từ chối ở cấp 1 |
| `ACCOUNTANT_PROCESSED` | Kế toán đã tổng hợp |
| `PENDING_CEO` | Chờ CEO duyệt |
| `APPROVED_CEO` | CEO đã duyệt |
| `REJECTED_CEO` | CEO từ chối |
| `PAID` | Đã thanh toán |

---

**Ngày cập nhật**: 2025-01-XX  
**Trạng thái**: Hoàn thành 100%

