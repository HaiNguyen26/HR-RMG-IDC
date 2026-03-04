# Quy trình nghỉ việc – Lịch & Hướng dẫn hệ thống

## 🎯 Quan điểm hệ thống

- **Nghỉ việc** = Người lao động (NLĐ) thông báo đơn phương chấm dứt hợp đồng.
- **Không phải** chờ duyệt mới được nghỉ — quyền chấm dứt thuộc về NLĐ trong khuôn khổ pháp luật.
- **Các bước “duyệt”** = **Impact Confirmation** & kiểm soát rủi ro (xác nhận ảnh hưởng, kế hoạch bàn giao, không phải phê duyệt cho phép nghỉ).
- **Hệ thống tự động chuyển cấp** nếu quá hạn — không để quy trình bị treo, không để lãnh đạo bất ngờ sát ngày nghỉ.

---

## I. GIAI ĐOẠN THÔNG BÁO & RÀNG BUỘC PHÁP LÝ

### Bước 1 – Nhân viên tạo đơn nghỉ việc

**Nhân viên nhập:**
- Ngày nộp đơn
- Ngày nghỉ dự kiến
- Lý do nghỉ

**Hệ thống tự động kiểm tra thời hạn báo trước:**

| Loại hợp đồng | Thời hạn báo trước tối thiểu |
|---------------|------------------------------|
| Thử việc | ≥ 3 ngày |
| HĐ xác định thời hạn | ≥ 30 ngày |
| HĐ không xác định thời hạn | ≥ 45 ngày |

- **Nếu không đủ thời hạn** → không cho submit, hiển thị cảnh báo.
- **Sau khi hợp lệ** → Trạng thái: **Submitted**.

---

## II. GIAI ĐOẠN IMPACT CONFIRMATION (XÁC NHẬN ẢNH HƯỞNG)

⚠️ **Lưu ý:** Đây **không phải** phê duyệt cho nghỉ.  
⚠️ Đây là **xác nhận tác động & kế hoạch xử lý**.

### Bước 2 – HR xác nhận tiếp nhận (1 ngày)

- HR xác nhận đã nhận thông báo nghỉ việc.
- Kiểm tra tính hợp lệ thời hạn.
- Ghi nhận ngày nghỉ chính thức trong hệ thống.
- **Quá 1 ngày** → hệ thống tự động chuyển cấp.

### Bước 3 – Quản lý trực tiếp (1 ngày)

**Impact Confirmation cấp 1:**
- Liệt kê dự án đang phụ trách
- Đánh giá rủi ro công việc
- Đề xuất người bàn giao / thay thế
- Ghi chú mức độ ảnh hưởng

**Quá 1 ngày** → hệ thống tự động chuyển cấp.

### Bước 4 – Quản lý gián tiếp (1 ngày)

**Impact Confirmation cấp phòng ban:**
- Đánh giá ảnh hưởng toàn bộ team
- Điều phối nguồn lực
- Ghi nhận kế hoạch xử lý

**Quá 1 ngày** → tự động chuyển cấp.

### Bước 5 – Giám đốc Chi nhánh (3 ngày)

**Impact Confirmation cấp chi nhánh:**
- Rà soát ảnh hưởng tổng thể
- Yêu cầu tuyển thay / điều chuyển nhân sự
- Xác nhận kế hoạch bàn giao

**Quá 3 ngày** → tự động chuyển sang **Notice Period**.

---

## III. NOTICE PERIOD (THỜI GIAN BÁO TRƯỚC)

- **Trạng thái:** Notice Period Running.
- Hiển thị **countdown** đến ngày nghỉ.
- Ban quản lý **phải chủ động** giám sát bàn giao — không chờ đến sát ngày nghỉ mới xử lý.

**Dashboard hiển thị:**
- Nhân viên sẽ nghỉ trong **30 ngày**
- Nhân viên sẽ nghỉ trong **14 ngày**
- Nhân viên sẽ nghỉ trong **7 ngày**

---

## IV. CLEARANCE TRƯỚC NGÀY NGHỈ (T - 3 NGÀY)

Kích hoạt **trước ngày nghỉ 3 ngày**.

### Bước 6 – IT xác nhận bàn giao thiết bị

- Thu hồi laptop / thiết bị
- Thu hồi quyền hệ thống
- Xác nhận hoàn tất

### Bước 7 – Kế toán xác nhận công nợ

- Kiểm tra công nợ
- Kiểm tra tạm ứng
- Xác nhận hoàn tất

**Nếu chưa hoàn tất** → hệ thống cảnh báo.

---

## V. NGÀY NGHỈ CHÍNH THỨC

- Chuyển trạng thái nhân viên → **Inactive**
- Khóa tài khoản hệ thống

---

## VI. THANH LÝ HỢP ĐỒNG

### Bước 8 – HR thanh lý hợp đồng

- Hoàn tất trong **14 ngày**
- Tối đa **30 ngày** trong trường hợp đặc biệt
- Sau khi hoàn tất → trạng thái: **Closed**

---

## VII. TỰ ĐỘNG CHUYỂN CẤP

- Nếu **quá thời hạn** ở bất kỳ bước nào:
  - Hệ thống **tự động chuyển** bước tiếp theo
  - Đồng thời **gửi thông báo** cho cấp cao hơn (nếu tích hợp)

**Mục tiêu:**
- Không để quy trình bị “treo”
- Không để lãnh đạo bất ngờ sát ngày nghỉ

---

## VIII. TRÁCH NHIỆM PHÁP LÝ CỦA NLĐ

NLĐ chịu trách nhiệm khi:
- Cố ý gây thiệt hại (phải chứng minh được lỗi)
- Không bàn giao công việc
- Không bàn giao tài sản trước khi nghỉ

**Hệ thống** nên yêu cầu NLĐ **tick cam kết** khi submit đơn.

---

## 🎯 TÓM TẮT FLOW

```
Tạo đơn
  → HR xác nhận
  → QL trực tiếp (Impact cấp 1)
  → QL gián tiếp (Impact cấp 2)
  → Giám đốc chi nhánh (Impact tổng thể)
  → Notice Period
  → IT & Kế toán clearance
  → Ngày nghỉ
  → Thanh lý hợp đồng
  → Closed
```

---

## Bảng trạng thái kỹ thuật (tham chiếu)

| Trạng thái hệ thống | Mô tả ngắn |
|---------------------|-------------|
| SUBMITTED | NV vừa nộp đơn |
| PENDING_DIRECT_MANAGER | Chờ QL trực tiếp xác nhận ảnh hưởng |
| PENDING_INDIRECT_MANAGER | Chờ QL gián tiếp xác nhận |
| PENDING_BRANCH_DIRECTOR | Chờ GĐ chi nhánh xác nhận |
| NOTICE_PERIOD_RUNNING | Đang thời gian báo trước |
| PRE_EXIT_CLEARANCE | Chờ IT & Kế toán clearance (T-3) |
| CONTRACT_LIQUIDATION | HR đang thanh lý hợp đồng (14–30 ngày) |
| CLOSED | Đã kết thúc |

*Chi tiết kỹ thuật (DB, API) xem thêm: [RESIGN_LIFECYCLE_DESIGN.md](./RESIGN_LIFECYCLE_DESIGN.md).*
