# 📁 Database Migrations

Thư mục này chứa các migration scripts để cập nhật database.

## 📝 Quy tắc đặt tên

- Đặt tên theo số thứ tự: `001_`, `002_`, `003_`...
- Tên file mô tả rõ ràng: `001_add_email_to_users.sql`
- Ví dụ:
  - `001_add_email_to_users.sql`
  - `002_create_projects_table.sql`
  - `003_add_status_to_employees.sql`

## 🔧 Cách sử dụng

Xem chi tiết trong `UPDATE.md` hoặc `DATABASE_MIGRATIONS.md`

## ✅ Best Practices

- ✅ Luôn backup database trước khi migration
- ✅ Test trên local trước
- ✅ Sử dụng `IF NOT EXISTS` để tránh lỗi
- ✅ Ghi rõ mô tả trong comment

