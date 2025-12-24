# Hướng dẫn Migration Database cho Candidates

## Vấn đề
Khi cập nhật thông tin ứng viên trên server, có thể gặp lỗi do thiếu các cột hoặc bảng trong database:
- Các cột file đính kèm (`anh_dai_dien_path`, `cv_dinh_kem_path`) chưa tồn tại
- Các bảng liên quan (`candidate_work_experiences`, `candidate_training_processes`, `candidate_foreign_languages`) chưa tồn tại

## Giải pháp

### Bước 1: Chạy migration cho các cột file đính kèm
```bash
psql -U your_database_user -d your_database_name -f database/migrate_candidates_file_fields.sql
```

Hoặc nếu đã SSH vào server:
```bash
cd /path/to/Web-App-HR-Demo
psql -U postgres -d hr_management_system -f database/migrate_candidates_file_fields.sql
```

### Bước 2: Chạy migration cho các bảng liên quan
```bash
psql -U your_database_user -d your_database_name -f database/ensure_candidate_related_tables.sql
```

### Bước 3: (Tùy chọn) Chạy migration đầy đủ cho tất cả các cột
Nếu muốn đảm bảo tất cả các cột tồn tại:
```bash
psql -U your_database_user -d your_database_name -f database/ensure_all_candidates_columns.sql
```

## Kiểm tra sau khi migration

### Kiểm tra các cột file đính kèm đã tồn tại:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'candidates' 
AND column_name IN ('anh_dai_dien_path', 'cv_dinh_kem_path');
```

### Kiểm tra các bảng liên quan đã tồn tại:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'candidate_work_experiences',
    'candidate_training_processes', 
    'candidate_foreign_languages'
);
```

## Lưu ý
- Tất cả các script migration đều an toàn để chạy nhiều lần
- Script sẽ chỉ thêm các cột/bảng chưa tồn tại, không ảnh hưởng đến dữ liệu hiện có
- Nên backup database trước khi chạy migration (để an toàn)

## Sau khi migration
1. Restart backend server để đảm bảo code mới được load
2. Test lại chức năng cập nhật ứng viên
3. Kiểm tra xem file đính kèm có hiển thị trong modal "Thông tin Ứng viên" không

