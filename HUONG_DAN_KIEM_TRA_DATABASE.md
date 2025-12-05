# Hướng dẫn kiểm tra Database trong pgAdmin

## Bước 1: Mở pgAdmin và kết nối database

1. Mở pgAdmin
2. Kết nối đến database `HR_Management_System` (hoặc tên database của bạn)
3. Mở rộng database → Schemas → public → Tables → employees

## Bước 2: Kiểm tra cấu trúc bảng employees

### Cách 1: Xem Columns
1. Click chuột phải vào bảng `employees`
2. Chọn **Properties**
3. Vào tab **Columns**
4. Kiểm tra xem có các cột sau không:
   - `bo_phan` (VARCHAR)
   - `phong_ban` (VARCHAR)
   - `ma_nhan_vien` (VARCHAR)
   - `ma_cham_cong` (VARCHAR)
   - `ho_ten` (VARCHAR)
   - `chuc_danh` (VARCHAR)
   - `chi_nhanh` (VARCHAR)
   - `ngay_gia_nhap` (DATE)
   - `loai_hop_dong` (VARCHAR)
   - `dia_diem` (VARCHAR)
   - `tinh_thue` (VARCHAR)
   - `cap_bac` (VARCHAR)
   - `email` (VARCHAR)
   - `quan_ly_truc_tiep` (VARCHAR)
   - `quan_ly_gian_tiep` (VARCHAR)

### Cách 2: Chạy SQL Query
1. Click chuột phải vào database → **Query Tool**
2. Chạy query sau để xem tất cả các cột:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'employees'
ORDER BY ordinal_position;
```

## Bước 3: Kiểm tra dữ liệu trong cột bo_phan

### Query 1: Đếm tổng số nhân viên
```sql
SELECT COUNT(*) as total_employees FROM employees;
```

### Query 2: Đếm số nhân viên có bo_phan
```sql
SELECT COUNT(*) as employees_with_bo_phan 
FROM employees 
WHERE bo_phan IS NOT NULL;
```

### Query 3: Đếm số nhân viên có bo_phan không rỗng
```sql
SELECT COUNT(*) as employees_with_bo_phan_not_empty 
FROM employees 
WHERE bo_phan IS NOT NULL AND bo_phan != '';
```

### Query 4: Xem tất cả giá trị bo_phan (kể cả NULL và empty)
```sql
SELECT bo_phan, COUNT(*) as count
FROM employees
GROUP BY bo_phan
ORDER BY count DESC
LIMIT 20;
```

### Query 5: Xem các giá trị bo_phan DISTINCT (không NULL, không empty)
```sql
SELECT DISTINCT bo_phan
FROM employees
WHERE bo_phan IS NOT NULL AND bo_phan != '' AND TRIM(bo_phan) != ''
ORDER BY bo_phan ASC;
```

### Query 6: Xem mẫu dữ liệu nhân viên (10 dòng đầu)
```sql
SELECT 
    id,
    ma_nhan_vien,
    ho_ten,
    phong_ban,
    bo_phan,
    chuc_danh,
    trang_thai
FROM employees
ORDER BY id
LIMIT 10;
```

## Bước 4: Kiểm tra dữ liệu phòng ban (để so sánh)

### Query: Xem các giá trị phong_ban DISTINCT
```sql
SELECT DISTINCT phong_ban
FROM employees
WHERE phong_ban IS NOT NULL AND phong_ban != ''
ORDER BY phong_ban ASC;
```

## Thông tin cần gửi lại

Vui lòng chạy các query trên và gửi lại kết quả:

1. **Kết quả Query 1**: Tổng số nhân viên
2. **Kết quả Query 2**: Số nhân viên có bo_phan (kể cả NULL)
3. **Kết quả Query 3**: Số nhân viên có bo_phan không rỗng
4. **Kết quả Query 4**: Top 20 giá trị bo_phan (kể cả NULL/empty)
5. **Kết quả Query 5**: Danh sách bo_phan DISTINCT (không NULL, không empty)
6. **Kết quả Query 6**: Mẫu 10 dòng dữ liệu nhân viên
7. **Kết quả Query phòng ban**: Danh sách phong_ban DISTINCT

## Lưu ý

- Nếu Query 4 cho thấy có dữ liệu nhưng Query 5 trả về rỗng → Có thể dữ liệu là empty string hoặc chỉ có khoảng trắng
- Nếu Query 2 = 0 → Cột bo_phan chưa có dữ liệu nào
- Nếu Query 3 = 0 nhưng Query 2 > 0 → Tất cả giá trị bo_phan đều là empty string

