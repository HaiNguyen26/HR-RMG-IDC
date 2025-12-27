# Fix lỗi: Không tìm thấy quản lý trực tiếp

## Vấn đề
Khi nhân viên "Huỳnh Đức Trọng Tài" tạo đơn xin nghỉ phép, hệ thống báo lỗi:
> "Không tìm thấy quản lý trực tiếp "Huỳnh Công Tường" (chi_nhanh: Hồ Chí Minh) trong hệ thống. Có thể có nhiều người cùng tên nhưng không khớp chi nhánh."

## Nguyên nhân
Hệ thống tìm quản lý trực tiếp dựa trên:
1. **Tên quản lý** (từ trường `quan_ly_truc_tiep` của nhân viên)
2. **Chi nhánh** (từ trường `chi_nhanh` của nhân viên)

Lỗi xảy ra khi:
- Không tìm thấy nhân viên nào có tên khớp với "Huỳnh Công Tường" trong database
- Hoặc tìm thấy nhưng chi nhánh không khớp với "Hồ Chí Minh"
- Hoặc tên/quản lý được viết khác (ví dụ: "Huỳnh Công Tưởng" thay vì "Huỳnh Công Tường")

## Cách kiểm tra

### Bước 1: Chạy script SQL để kiểm tra
```bash
# SSH vào server
ssh root@27.71.16.15

# Chạy script kiểm tra
PGPASSWORD=Hainguyen261097 psql -h localhost -U hr_user -d HR_Management_System -f /var/www/hr-management/database/check_manager_issue.sql
```

### Bước 2: Xem kết quả
Script sẽ hiển thị:
1. Thông tin nhân viên "Huỳnh Đức Trọng Tài" (quan_ly_truc_tiep và chi_nhanh)
2. Tất cả nhân viên có tên gần giống "Huỳnh Công Tường"
3. Tất cả nhân viên có chi_nhanh chứa "Hồ Chí Minh"
4. Nhân viên nào có quan_ly_truc_tiep = "Huỳnh Công Tường"
5. Nhân viên nào có tên "Huỳnh Công Tường" VÀ chi_nhanh = "Hồ Chí Minh"

## Cách sửa

### Trường hợp 1: Tên quản lý bị viết sai
Nếu tìm thấy nhân viên có tên gần giống nhưng khác một chút (ví dụ: "Huỳnh Công Tưởng" thay vì "Huỳnh Công Tường"):

```sql
-- Cập nhật tên quản lý trực tiếp cho nhân viên
UPDATE employees
SET quan_ly_truc_tiep = 'Huỳnh Công Tường'  -- Tên đúng trong database
WHERE ho_ten ILIKE '%Huỳnh Đức Trọng Tài%'
  AND quan_ly_truc_tiep ILIKE '%Huỳnh Công%';
```

### Trường hợp 2: Chi nhánh không khớp
Nếu tìm thấy nhân viên "Huỳnh Công Tường" nhưng chi_nhanh khác:

**Option A: Cập nhật chi_nhanh của nhân viên**
```sql
-- Cập nhật chi_nhanh của nhân viên để khớp với quản lý
UPDATE employees
SET chi_nhanh = 'Hồ Chí Minh'  -- Chi nhánh đúng
WHERE ho_ten ILIKE '%Huỳnh Đức Trọng Tài%';
```

**Option B: Cập nhật chi_nhanh của quản lý**
```sql
-- Cập nhật chi_nhanh của quản lý để khớp với nhân viên
UPDATE employees
SET chi_nhanh = 'Hồ Chí Minh'  -- Chi nhánh đúng
WHERE ho_ten ILIKE '%Huỳnh Công Tường%';
```

### Trường hợp 3: Không có nhân viên nào tên "Huỳnh Công Tường"
Nếu không tìm thấy nhân viên nào có tên "Huỳnh Công Tường" trong database:

1. **Kiểm tra xem quản lý có tồn tại với tên khác không:**
   - Xem kết quả query 2 trong script
   - Tìm tên gần giống nhất

2. **Cập nhật quan_ly_truc_tiep của nhân viên:**
```sql
-- Cập nhật với tên đúng của quản lý
UPDATE employees
SET quan_ly_truc_tiep = 'Tên Quản Lý Đúng'  -- Tên quản lý thực tế trong database
WHERE ho_ten ILIKE '%Huỳnh Đức Trọng Tài%';
```

3. **Hoặc thêm nhân viên quản lý vào database nếu chưa có:**
   - Vào module "Quản lý nhân viên"
   - Thêm nhân viên "Huỳnh Công Tường" với chi_nhanh = "Hồ Chí Minh"

### Trường hợp 4: Có nhiều người cùng tên nhưng không ai có chi_nhanh khớp
Nếu có nhiều người tên "Huỳnh Công Tường" nhưng không ai có chi_nhanh = "Hồ Chí Minh":

1. **Xác định quản lý đúng:**
   - Xem kết quả query 6 để biết có bao nhiêu người cùng tên và ở chi nhánh nào
   - Xác định quản lý nào là quản lý trực tiếp của "Huỳnh Đức Trọng Tài"

2. **Cập nhật chi_nhanh:**
```sql
-- Cập nhật chi_nhanh của quản lý đúng
UPDATE employees
SET chi_nhanh = 'Hồ Chí Minh'
WHERE id = <ID_CUA_QUAN_LY_DUNG>;
```

## Sau khi sửa

1. **Restart backend để clear cache:**
```bash
pm2 restart hr-management-api
```

2. **Test lại:**
   - Đăng nhập với tài khoản "Huỳnh Đức Trọng Tài"
   - Thử tạo đơn xin nghỉ phép
   - Kiểm tra xem còn lỗi không

## Lưu ý

- **Luôn backup database trước khi update:**
```bash
PGPASSWORD=Hainguyen261097 pg_dump -h localhost -U hr_user -d HR_Management_System > backup_before_fix_manager_$(date +%Y%m%d_%H%M%S).sql
```

- **Kiểm tra kỹ trước khi update:** Chạy SELECT query trước để xem dữ liệu hiện tại

- **Đảm bảo tính nhất quán:** Sau khi sửa, kiểm tra xem có nhân viên nào khác cũng bị ảnh hưởng không

