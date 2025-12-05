-- Migration: Làm sạch bảng employees để chỉ giữ các cột khớp với file Excel
-- Các cột cần giữ lại:
-- 1. Mã Nhân Viên (ma_nhan_vien)
-- 2. Mã Chấm Công (ma_cham_cong)
-- 3. Họ Và Tên (ho_ten)
-- 4. Chi Nhánh (chi_nhanh)
-- 5. Phòng Ban (phong_ban)
-- 6. Bộ Phận (bo_phan)
-- 7. Chức Danh (chuc_danh)
-- 8. Ngày Nhận Việc (ngay_gia_nhap)
-- 9. Loại Hợp Đồng (loai_hop_dong)
-- 10. Địa điểm (dia_diem)
-- 11. Tính Thuế (tinh_thue)
-- 12. Cấp Bậc (cap_bac)
-- 13. Quản Lý Trực Tiếp (quan_ly_truc_tiep)
-- 14. Quản Lý Gián Tiếp (quan_ly_gian_tiep)
-- 15. Email (email)
-- 
-- Các cột hệ thống cần giữ:
-- - id (PRIMARY KEY)
-- - password (cho authentication)
-- - trang_thai (status)
-- - created_at
-- - updated_at

-- Kiểm tra và xóa các cột không cần thiết (nếu có)
-- Lưu ý: Chỉ xóa các cột không được liệt kê ở trên

DO $$
DECLARE
    col_name TEXT;
    columns_to_keep TEXT[] := ARRAY[
        'id',
        'ma_nhan_vien',
        'ma_cham_cong',
        'ho_ten',
        'chi_nhanh',
        'phong_ban',
        'bo_phan',
        'chuc_danh',
        'ngay_gia_nhap',
        'loai_hop_dong',
        'dia_diem',
        'tinh_thue',
        'cap_bac',
        'quan_ly_truc_tiep',
        'quan_ly_gian_tiep',
        'email',
        'password',
        'trang_thai',
        'created_at',
        'updated_at'
    ];
    all_columns TEXT[];
BEGIN
    -- Lấy danh sách tất cả các cột hiện tại
    SELECT array_agg(column_name::TEXT)
    INTO all_columns
    FROM information_schema.columns
    WHERE table_name = 'employees'
      AND table_schema = 'public';

    -- Kiểm tra và xóa các cột không cần thiết
    FOREACH col_name IN ARRAY all_columns
    LOOP
        IF col_name != ALL(columns_to_keep) THEN
            BEGIN
                EXECUTE format('ALTER TABLE employees DROP COLUMN IF EXISTS %I CASCADE', col_name);
                RAISE NOTICE 'Đã xóa cột: %', col_name;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'Không thể xóa cột %: %', col_name, SQLERRM;
            END;
        END IF;
    END LOOP;

    RAISE NOTICE 'Hoàn tất kiểm tra và làm sạch cột!';
END $$;

-- Đảm bảo tất cả các cột cần thiết đều tồn tại
DO $$ BEGIN
    -- ma_nhan_vien
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='ma_nhan_vien') THEN
        ALTER TABLE employees ADD COLUMN ma_nhan_vien VARCHAR(255) UNIQUE;
        RAISE NOTICE 'Đã thêm cột ma_nhan_vien';
    END IF;

    -- ma_cham_cong
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='ma_cham_cong') THEN
        ALTER TABLE employees ADD COLUMN ma_cham_cong VARCHAR(255);
        RAISE NOTICE 'Đã thêm cột ma_cham_cong';
    END IF;

    -- ho_ten
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='ho_ten') THEN
        ALTER TABLE employees ADD COLUMN ho_ten VARCHAR(255) NOT NULL;
        RAISE NOTICE 'Đã thêm cột ho_ten';
    END IF;

    -- chi_nhanh
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='chi_nhanh') THEN
        ALTER TABLE employees ADD COLUMN chi_nhanh VARCHAR(255);
        RAISE NOTICE 'Đã thêm cột chi_nhanh';
    END IF;

    -- phong_ban
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='phong_ban') THEN
        ALTER TABLE employees ADD COLUMN phong_ban VARCHAR(255) NOT NULL;
        RAISE NOTICE 'Đã thêm cột phong_ban';
    END IF;

    -- bo_phan
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='bo_phan') THEN
        ALTER TABLE employees ADD COLUMN bo_phan VARCHAR(255);
        RAISE NOTICE 'Đã thêm cột bo_phan';
    END IF;

    -- chuc_danh
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='chuc_danh') THEN
        ALTER TABLE employees ADD COLUMN chuc_danh VARCHAR(255);
        RAISE NOTICE 'Đã thêm cột chuc_danh';
    END IF;

    -- ngay_gia_nhap
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='ngay_gia_nhap') THEN
        ALTER TABLE employees ADD COLUMN ngay_gia_nhap DATE;
        RAISE NOTICE 'Đã thêm cột ngay_gia_nhap';
    END IF;

    -- loai_hop_dong
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='loai_hop_dong') THEN
        ALTER TABLE employees ADD COLUMN loai_hop_dong VARCHAR(255);
        RAISE NOTICE 'Đã thêm cột loai_hop_dong';
    END IF;

    -- dia_diem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='dia_diem') THEN
        ALTER TABLE employees ADD COLUMN dia_diem VARCHAR(255);
        RAISE NOTICE 'Đã thêm cột dia_diem';
    END IF;

    -- tinh_thue
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='tinh_thue') THEN
        ALTER TABLE employees ADD COLUMN tinh_thue VARCHAR(50);
        RAISE NOTICE 'Đã thêm cột tinh_thue';
    END IF;

    -- cap_bac
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='cap_bac') THEN
        ALTER TABLE employees ADD COLUMN cap_bac VARCHAR(255);
        RAISE NOTICE 'Đã thêm cột cap_bac';
    END IF;

    -- quan_ly_truc_tiep
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='quan_ly_truc_tiep') THEN
        ALTER TABLE employees ADD COLUMN quan_ly_truc_tiep VARCHAR(255);
        RAISE NOTICE 'Đã thêm cột quan_ly_truc_tiep';
    END IF;

    -- quan_ly_gian_tiep
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='quan_ly_gian_tiep') THEN
        ALTER TABLE employees ADD COLUMN quan_ly_gian_tiep VARCHAR(255);
        RAISE NOTICE 'Đã thêm cột quan_ly_gian_tiep';
    END IF;

    -- email
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='email') THEN
        ALTER TABLE employees ADD COLUMN email VARCHAR(255);
        RAISE NOTICE 'Đã thêm cột email';
    END IF;

    RAISE NOTICE 'Đã đảm bảo tất cả các cột cần thiết đều tồn tại!';
END $$;

