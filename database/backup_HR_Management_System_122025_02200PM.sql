--
-- PostgreSQL database dump
--

\restrict 1ZzwXGUnLDricCPRbPVgsJeZLbafAt0MadiRLvq01jcWJp0WozS7JQBLljJCVU7

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.travel_expense_requests DROP CONSTRAINT IF EXISTS travel_expense_requests_employee_id_fkey;
ALTER TABLE IF EXISTS ONLY public.requests DROP CONSTRAINT IF EXISTS requests_requested_by_fkey;
ALTER TABLE IF EXISTS ONLY public.requests DROP CONSTRAINT IF EXISTS requests_employee_id_fkey;
ALTER TABLE IF EXISTS ONLY public.requests DROP CONSTRAINT IF EXISTS requests_assigned_to_fkey;
ALTER TABLE IF EXISTS ONLY public.request_items DROP CONSTRAINT IF EXISTS request_items_request_id_fkey;
ALTER TABLE IF EXISTS ONLY public.request_items DROP CONSTRAINT IF EXISTS request_items_provided_by_fkey;
ALTER TABLE IF EXISTS ONLY public.recruitment_requests DROP CONSTRAINT IF EXISTS recruitment_requests_manager_id_fkey;
ALTER TABLE IF EXISTS ONLY public.overtime_requests DROP CONSTRAINT IF EXISTS overtime_requests_team_lead_id_fkey;
ALTER TABLE IF EXISTS ONLY public.overtime_requests DROP CONSTRAINT IF EXISTS overtime_requests_employee_id_fkey;
ALTER TABLE IF EXISTS ONLY public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_team_lead_id_fkey;
ALTER TABLE IF EXISTS ONLY public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_employee_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interview_requests DROP CONSTRAINT IF EXISTS interview_requests_manager_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interview_requests DROP CONSTRAINT IF EXISTS interview_requests_indirect_manager_id_fkey;
ALTER TABLE IF EXISTS ONLY public.interview_requests DROP CONSTRAINT IF EXISTS interview_requests_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.interview_requests DROP CONSTRAINT IF EXISTS interview_requests_candidate_id_fkey;
ALTER TABLE IF EXISTS ONLY public.equipment_assignments DROP CONSTRAINT IF EXISTS equipment_assignments_employee_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attendance_adjustments DROP CONSTRAINT IF EXISTS attendance_adjustments_team_lead_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attendance_adjustments DROP CONSTRAINT IF EXISTS attendance_adjustments_employee_id_fkey;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_requests_updated_at ON public.requests;
DROP TRIGGER IF EXISTS update_request_items_updated_at ON public.request_items;
DROP TRIGGER IF EXISTS update_equipment_updated_at ON public.equipment_assignments;
DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;
DROP TRIGGER IF EXISTS trigger_generate_ma_nhan_vien ON public.employees;
DROP TRIGGER IF EXISTS trg_update_request_status_from_items ON public.request_items;
DROP TRIGGER IF EXISTS trg_update_request_notification ON public.requests;
DROP TRIGGER IF EXISTS trg_overtime_requests_updated ON public.overtime_requests;
DROP TRIGGER IF EXISTS trg_leave_requests_updated ON public.leave_requests;
DROP TRIGGER IF EXISTS trg_create_request_notification ON public.requests;
DROP TRIGGER IF EXISTS trg_create_item_update_notification ON public.request_items;
DROP TRIGGER IF EXISTS trg_attendance_adjustments_updated ON public.attendance_adjustments;
CREATE OR REPLACE VIEW public.v_requests_with_items AS
SELECT
    NULL::integer AS request_id,
    NULL::integer AS employee_id,
    NULL::character varying(50) AS request_type,
    NULL::character varying(20) AS target_department,
    NULL::character varying(255) AS title,
    NULL::text AS description,
    NULL::character varying(20) AS request_status,
    NULL::character varying(20) AS priority,
    NULL::integer AS requested_by,
    NULL::integer AS assigned_to,
    NULL::timestamp without time zone AS completed_at,
    NULL::text AS request_notes,
    NULL::timestamp without time zone AS request_created_at,
    NULL::timestamp without time zone AS request_updated_at,
    NULL::character varying(255) AS employee_name,
    NULL::character varying(255) AS employee_email,
    NULL::character varying(20) AS ma_nhan_vien,
    NULL::character varying(255) AS requested_by_name,
    NULL::character varying(255) AS assigned_to_name,
    NULL::bigint AS total_items,
    NULL::bigint AS completed_items,
    NULL::bigint AS partial_items,
    NULL::bigint AS pending_items,
    NULL::bigint AS total_quantity,
    NULL::bigint AS total_provided;
CREATE OR REPLACE VIEW public.v_employees_with_equipment_count AS
SELECT
    NULL::integer AS id,
    NULL::character varying(255) AS ho_ten,
    NULL::character varying(255) AS chuc_danh,
    NULL::character varying(20) AS phong_ban,
    NULL::character varying(255) AS bo_phan,
    NULL::date AS ngay_gia_nhap,
    NULL::character varying(255) AS email,
    NULL::character varying(20) AS trang_thai,
    NULL::bigint AS tong_vat_dung,
    NULL::timestamp without time zone AS created_at,
    NULL::timestamp without time zone AS updated_at;
DROP INDEX IF EXISTS public.idx_users_username;
DROP INDEX IF EXISTS public.idx_users_trang_thai;
DROP INDEX IF EXISTS public.idx_users_role;
DROP INDEX IF EXISTS public.idx_travel_expense_status;
DROP INDEX IF EXISTS public.idx_travel_expense_employee;
DROP INDEX IF EXISTS public.idx_requests_target_department;
DROP INDEX IF EXISTS public.idx_requests_status;
DROP INDEX IF EXISTS public.idx_requests_requested_by;
DROP INDEX IF EXISTS public.idx_requests_request_type;
DROP INDEX IF EXISTS public.idx_requests_employee_id;
DROP INDEX IF EXISTS public.idx_requests_created_at;
DROP INDEX IF EXISTS public.idx_requests_assigned_to;
DROP INDEX IF EXISTS public.idx_request_items_status;
DROP INDEX IF EXISTS public.idx_request_items_request_id;
DROP INDEX IF EXISTS public.idx_recruitment_requests_status;
DROP INDEX IF EXISTS public.idx_recruitment_requests_manager_id;
DROP INDEX IF EXISTS public.idx_recruitment_requests_created_at;
DROP INDEX IF EXISTS public.idx_overtime_requests_team_lead;
DROP INDEX IF EXISTS public.idx_overtime_requests_status;
DROP INDEX IF EXISTS public.idx_overtime_requests_employee;
DROP INDEX IF EXISTS public.idx_overtime_requests_created_at;
DROP INDEX IF EXISTS public.idx_leave_requests_team_lead;
DROP INDEX IF EXISTS public.idx_leave_requests_status;
DROP INDEX IF EXISTS public.idx_leave_requests_employee;
DROP INDEX IF EXISTS public.idx_leave_requests_created_at;
DROP INDEX IF EXISTS public.idx_interview_requests_status;
DROP INDEX IF EXISTS public.idx_interview_requests_manager_id;
DROP INDEX IF EXISTS public.idx_interview_requests_candidate_id;
DROP INDEX IF EXISTS public.idx_equipment_trang_thai;
DROP INDEX IF EXISTS public.idx_equipment_phong_ban;
DROP INDEX IF EXISTS public.idx_equipment_employee_id;
DROP INDEX IF EXISTS public.idx_employees_trang_thai;
DROP INDEX IF EXISTS public.idx_employees_phong_ban;
DROP INDEX IF EXISTS public.idx_employees_ma_nhan_vien;
DROP INDEX IF EXISTS public.idx_employees_ma_cham_cong;
DROP INDEX IF EXISTS public.idx_employees_email;
DROP INDEX IF EXISTS public.idx_candidates_status;
DROP INDEX IF EXISTS public.idx_candidates_created_at;
DROP INDEX IF EXISTS public.idx_attendance_adjustments_team_lead;
DROP INDEX IF EXISTS public.idx_attendance_adjustments_status;
DROP INDEX IF EXISTS public.idx_attendance_adjustments_employee;
DROP INDEX IF EXISTS public.idx_attendance_adjustments_created_at;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.travel_expense_requests DROP CONSTRAINT IF EXISTS travel_expense_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.requests DROP CONSTRAINT IF EXISTS requests_pkey;
ALTER TABLE IF EXISTS ONLY public.request_items DROP CONSTRAINT IF EXISTS request_items_pkey;
ALTER TABLE IF EXISTS ONLY public.recruitment_requests DROP CONSTRAINT IF EXISTS recruitment_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.overtime_requests DROP CONSTRAINT IF EXISTS overtime_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.interview_requests DROP CONSTRAINT IF EXISTS interview_requests_pkey;
ALTER TABLE IF EXISTS ONLY public.equipment_assignments DROP CONSTRAINT IF EXISTS equipment_assignments_pkey;
ALTER TABLE IF EXISTS ONLY public.employees DROP CONSTRAINT IF EXISTS employees_pkey;
ALTER TABLE IF EXISTS ONLY public.employees DROP CONSTRAINT IF EXISTS employees_ma_nhan_vien_key;
ALTER TABLE IF EXISTS ONLY public.employees DROP CONSTRAINT IF EXISTS employees_email_key;
ALTER TABLE IF EXISTS ONLY public.candidates DROP CONSTRAINT IF EXISTS candidates_pkey;
ALTER TABLE IF EXISTS ONLY public.attendance_adjustments DROP CONSTRAINT IF EXISTS attendance_adjustments_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.travel_expense_requests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.requests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.request_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.recruitment_requests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.overtime_requests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.leave_requests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.interview_requests ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.equipment_assignments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.employees ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.candidates ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.attendance_adjustments ALTER COLUMN id DROP DEFAULT;
DROP VIEW IF EXISTS public.v_requests_with_items;
DROP VIEW IF EXISTS public.v_requests_with_employee;
DROP VIEW IF EXISTS public.v_requests_statistics;
DROP VIEW IF EXISTS public.v_request_items_detail;
DROP VIEW IF EXISTS public.v_employees_with_equipment_count;
DROP VIEW IF EXISTS public.v_employee_ratio_by_department;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.travel_expense_requests_id_seq;
DROP TABLE IF EXISTS public.travel_expense_requests;
DROP SEQUENCE IF EXISTS public.requests_id_seq;
DROP TABLE IF EXISTS public.requests;
DROP SEQUENCE IF EXISTS public.request_items_id_seq;
DROP TABLE IF EXISTS public.request_items;
DROP SEQUENCE IF EXISTS public.recruitment_requests_id_seq;
DROP TABLE IF EXISTS public.recruitment_requests;
DROP SEQUENCE IF EXISTS public.overtime_requests_id_seq;
DROP TABLE IF EXISTS public.overtime_requests;
DROP SEQUENCE IF EXISTS public.leave_requests_id_seq;
DROP TABLE IF EXISTS public.leave_requests;
DROP SEQUENCE IF EXISTS public.interview_requests_id_seq;
DROP TABLE IF EXISTS public.interview_requests;
DROP SEQUENCE IF EXISTS public.equipment_assignments_id_seq;
DROP TABLE IF EXISTS public.equipment_assignments;
DROP SEQUENCE IF EXISTS public.employees_id_seq;
DROP TABLE IF EXISTS public.employees;
DROP SEQUENCE IF EXISTS public.candidates_id_seq;
DROP TABLE IF EXISTS public.candidates;
DROP SEQUENCE IF EXISTS public.attendance_adjustments_id_seq;
DROP TABLE IF EXISTS public.attendance_adjustments;
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.update_request_status_from_items();
DROP FUNCTION IF EXISTS public.update_request_notification();
DROP FUNCTION IF EXISTS public.update_overtime_requests_updated_at();
DROP FUNCTION IF EXISTS public.update_leave_requests_updated_at();
DROP FUNCTION IF EXISTS public.update_attendance_adjustments_updated_at();
DROP FUNCTION IF EXISTS public.migrate_request_items();
DROP FUNCTION IF EXISTS public.generate_ma_nhan_vien();
DROP FUNCTION IF EXISTS public.create_request_notification();
DROP FUNCTION IF EXISTS public.create_item_update_notification();
--
-- Name: create_item_update_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_item_update_notification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    request_record RECORD;
    item_status_label VARCHAR(50);
BEGIN
    -- Lấy thông tin request
    SELECT * INTO request_record FROM requests WHERE id = NEW.request_id;
    
    -- Xác định label cho status
    CASE NEW.status
        WHEN 'COMPLETED' THEN item_status_label := 'đã hoàn thành';
        WHEN 'PARTIAL' THEN item_status_label := 'đã cung cấp một phần';
        WHEN 'CANCELLED' THEN item_status_label := 'đã hủy';
        ELSE item_status_label := 'đã được cập nhật';
    END CASE;
    
    -- Thông báo cho HR (người tạo request)
    IF request_record.requested_by IS NOT NULL AND OLD.status != NEW.status THEN
        INSERT INTO notifications (user_id, request_id, type, title, message)
        VALUES (
            request_record.requested_by,
            NEW.request_id,
            'REQUEST_UPDATED',
            'Cập nhật item trong yêu cầu',
            'Item "' || NEW.item_name || '" trong yêu cầu #' || NEW.request_id || ' ' || item_status_label || ' (Số lượng: ' || NEW.quantity_provided || '/' || NEW.quantity || ')'
        );
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: create_request_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_request_notification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Tạo thông báo cho tất cả users của phòng ban target
    -- đồng thời gửi cho các ADMIN đang hoạt động để đảm bảo
    -- bộ phận quản trị vẫn nhận được thông tin.
    FOR user_record IN 
        SELECT DISTINCT id FROM users
        WHERE trang_thai = 'ACTIVE'
          AND (
              role = NEW.target_department
              OR role = 'ADMIN'
          )
    LOOP
        INSERT INTO notifications (user_id, request_id, type, title, message)
        VALUES (
            user_record.id,
            NEW.id,
            'NEW_REQUEST',
            'Yêu cầu mới từ HR',
            'Có yêu cầu mới: ' || NEW.title || ' cho nhân viên #' || NEW.employee_id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$;


--
-- Name: generate_ma_nhan_vien(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_ma_nhan_vien() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    next_id INTEGER;
    new_code VARCHAR(20);
BEGIN
    -- Nếu mã nhân viên chưa được set, tạo mã mới
    IF NEW.ma_nhan_vien IS NULL THEN
        -- Lấy ID tiếp theo từ sequence
        next_id := NEW.id;
        -- Tạo mã nhân viên: NV + số có 4 chữ số (VD: NV0001, NV0002)
        new_code := 'NV' || LPAD(next_id::TEXT, 4, '0');
        NEW.ma_nhan_vien := new_code;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: migrate_request_items(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.migrate_request_items() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    request_record RECORD;
    item_record JSONB;
    item_name TEXT;
    item_quantity INTEGER;
BEGIN
    -- Lặp qua tất cả requests có items nhưng chưa có request_items
    FOR request_record IN 
        SELECT r.id, r.items
        FROM requests r
        WHERE r.items IS NOT NULL 
          AND r.items::text != 'null'
          AND NOT EXISTS (
              SELECT 1 FROM request_items ri WHERE ri.request_id = r.id
          )
    LOOP
        -- Parse items JSONB
        IF jsonb_typeof(request_record.items) = 'array' THEN
            -- Lặp qua từng item trong array
            FOR item_record IN SELECT * FROM jsonb_array_elements(request_record.items)
            LOOP
                -- Lấy item_name
                IF jsonb_typeof(item_record) = 'string' THEN
                    item_name := item_record::text;
                    item_quantity := 1;
                ELSIF jsonb_typeof(item_record) = 'object' THEN
                    -- Lấy item_name từ các trường có thể có
                    item_name := COALESCE(
                        item_record->>'name',
                        item_record->>'tenVatDung',
                        item_record->>'item_name',
                        item_record::text
                    );
                    item_quantity := COALESCE(
                        (item_record->>'quantity')::integer,
                        (item_record->>'soLuong')::integer,
                        1
                    );
                ELSE
                    item_name := item_record::text;
                    item_quantity := 1;
                END IF;
                
                -- Loại bỏ dấu ngoặc kép nếu có
                item_name := TRIM(BOTH '"' FROM item_name);
                
                -- Chỉ insert nếu item_name không rỗng
                IF item_name IS NOT NULL AND item_name != '' AND item_name != 'null' THEN
                    INSERT INTO request_items (request_id, item_name, quantity, status)
                    VALUES (request_record.id, item_name, item_quantity, 'PENDING')
                    ON CONFLICT DO NOTHING;
                END IF;
            END LOOP;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migration completed successfully!';
END;
$$;


--
-- Name: update_attendance_adjustments_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_attendance_adjustments_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$;


--
-- Name: update_leave_requests_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_leave_requests_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$;


--
-- Name: update_overtime_requests_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_overtime_requests_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$;


--
-- Name: update_request_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_request_notification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Nếu status thay đổi, tạo thông báo cho HR
    IF NEW.status != OLD.status THEN
        -- Thông báo cho người tạo request (HR)
        IF NEW.requested_by IS NOT NULL THEN
            INSERT INTO notifications (user_id, request_id, type, title, message)
            VALUES (
                NEW.requested_by,
                NEW.id,
                'REQUEST_UPDATED',
                'Yêu cầu đã được cập nhật',
                'Yêu cầu #' || NEW.id || ' đã chuyển sang trạng thái: ' || NEW.status
            );
        END IF;
        
        -- Nếu completed, thông báo cho HR
        IF NEW.status = 'COMPLETED' THEN
            IF NEW.requested_by IS NOT NULL THEN
                INSERT INTO notifications (user_id, request_id, type, title, message)
                VALUES (
                    NEW.requested_by,
                    NEW.id,
                    'REQUEST_COMPLETED',
                    'Yêu cầu đã hoàn thành',
                    'Yêu cầu #' || NEW.id || ': ' || NEW.title || ' đã hoàn thành'
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: update_request_status_from_items(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_request_status_from_items() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    request_record RECORD;
    total_items INT;
    completed_items INT;
    partial_items INT;
    pending_items INT;
    new_status VARCHAR(20);
BEGIN
    -- Lấy thông tin request
    SELECT * INTO request_record FROM requests WHERE id = NEW.request_id;
    
    -- Đếm số lượng items theo trạng thái
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'COMPLETED' AND quantity_provided >= quantity) as completed,
        COUNT(*) FILTER (WHERE status = 'PARTIAL' OR (quantity_provided > 0 AND quantity_provided < quantity)) as partial,
        COUNT(*) FILTER (WHERE status = 'PENDING' OR quantity_provided = 0) as pending
    INTO total_items, completed_items, partial_items, pending_items
    FROM request_items
    WHERE request_id = NEW.request_id;
    
    -- Xác định trạng thái mới của request
    -- Nếu tất cả items đã COMPLETED (quantity_provided >= quantity) -> COMPLETED
    -- Nếu có items đang cung cấp một phần nhưng chưa đủ -> IN_PROGRESS
    -- Nếu có items chưa được cung cấp hoặc chưa đủ -> PENDING (reset về trạng thái ban đầu)
    IF completed_items = total_items AND total_items > 0 THEN
        new_status := 'COMPLETED';
    ELSIF partial_items > 0 AND completed_items < total_items THEN
        -- Có items đang cung cấp một phần nhưng chưa đủ -> IN_PROGRESS
        new_status := 'IN_PROGRESS';
    ELSIF pending_items > 0 OR (completed_items < total_items AND partial_items = 0) THEN
        -- Có items chưa được cung cấp hoặc chưa đủ -> PENDING (reset về trạng thái ban đầu)
        new_status := 'PENDING';
    ELSE
        new_status := request_record.status; -- Giữ nguyên nếu không xác định được
    END IF;
    
    -- Cập nhật status của request nếu có thay đổi
    IF new_status != request_record.status THEN
        UPDATE requests 
        SET status = new_status,
            updated_at = CURRENT_TIMESTAMP,
            completed_at = CASE 
                WHEN new_status = 'COMPLETED' THEN CURRENT_TIMESTAMP
                ELSE NULL
            END
        WHERE id = NEW.request_id;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attendance_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_adjustments (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    team_lead_id integer NOT NULL,
    adjustment_date date NOT NULL,
    check_type character varying(20) NOT NULL,
    check_in_time time without time zone,
    check_out_time time without time zone,
    reason text NOT NULL,
    notes text,
    status character varying(30) DEFAULT 'PENDING_TEAM_LEAD'::character varying NOT NULL,
    team_lead_action character varying(20),
    team_lead_action_at timestamp without time zone,
    team_lead_comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT attendance_adjustments_check_type_check CHECK (((check_type)::text = ANY ((ARRAY['CHECK_IN'::character varying, 'CHECK_OUT'::character varying, 'BOTH'::character varying])::text[]))),
    CONSTRAINT attendance_adjustments_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'CANCELLED'::character varying])::text[]))),
    CONSTRAINT attendance_adjustments_team_lead_action_check CHECK (((team_lead_action)::text = ANY ((ARRAY['APPROVE'::character varying, 'REJECT'::character varying])::text[])))
);


--
-- Name: attendance_adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attendance_adjustments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attendance_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attendance_adjustments_id_seq OWNED BY public.attendance_adjustments.id;


--
-- Name: candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidates (
    id integer NOT NULL,
    ho_ten character varying(255),
    ngay_sinh date,
    vi_tri_ung_tuyen character varying(100),
    phong_ban character varying(50),
    so_dien_thoai character varying(20),
    cccd character varying(20),
    ngay_gui_cv date,
    cv_file_path character varying(500),
    cv_file_name character varying(255),
    status character varying(50) DEFAULT 'PENDING_INTERVIEW'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_cccd date,
    noi_cap_cccd character varying(255),
    dia_chi_tam_tru text,
    gioi_tinh character varying(20),
    noi_sinh character varying(255),
    tinh_trang_hon_nhan character varying(50),
    dan_toc character varying(50),
    quoc_tich character varying(100),
    ton_giao character varying(100),
    so_dien_thoai_khac character varying(20),
    email character varying(255),
    nguyen_quan character varying(255),
    trinh_do_van_hoa character varying(100),
    trinh_do_chuyen_mon character varying(255),
    chuyen_nganh character varying(255),
    kinh_nghiem_lam_viec jsonb,
    qua_trinh_dao_tao jsonb,
    trinh_do_ngoai_ngu jsonb,
    job_offer_sent_date timestamp without time zone,
    CONSTRAINT candidates_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING_INTERVIEW'::character varying, 'PENDING_MANAGER'::character varying, 'PASSED'::character varying, 'FAILED'::character varying, 'PROBATION'::character varying])::text[])))
);


--
-- Name: candidates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.candidates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: candidates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.candidates_id_seq OWNED BY public.candidates.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    ho_ten character varying(255) NOT NULL,
    chuc_danh character varying(255),
    phong_ban character varying(20) NOT NULL,
    bo_phan character varying(255),
    ngay_gia_nhap date,
    email character varying(255),
    password character varying(255) NOT NULL,
    trang_thai character varying(20) DEFAULT 'ACTIVE'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ma_nhan_vien character varying(20),
    chi_nhanh character varying(255),
    quan_ly_truc_tiep character varying(255),
    quan_ly_gian_tiep character varying(255),
    ma_cham_cong character varying(255),
    loai_hop_dong character varying(255),
    dia_diem character varying(255),
    tinh_thue character varying(50),
    cap_bac character varying(255),
    CONSTRAINT employees_trang_thai_check CHECK (((trang_thai)::text = ANY ((ARRAY['ACTIVE'::character varying, 'INACTIVE'::character varying, 'RESIGNED'::character varying, 'PENDING'::character varying])::text[])))
);


--
-- Name: TABLE employees; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.employees IS 'Bảng lưu thông tin nhân viên';


--
-- Name: COLUMN employees.password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.password IS 'Mật khẩu đã hash bcrypt (mặc định: RMG123@)';


--
-- Name: COLUMN employees.trang_thai; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.trang_thai IS 'Trạng thái: ACTIVE (hoạt động), INACTIVE (không hoạt động), RESIGNED (đã nghỉ việc), PENDING (chờ cập nhật vật dụng)';


--
-- Name: COLUMN employees.ma_nhan_vien; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.ma_nhan_vien IS 'Mã nhân viên duy nhất (VD: NV001, NV002, ...)';


--
-- Name: COLUMN employees.chi_nhanh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.chi_nhanh IS 'Chi nhánh làm việc của nhân viên';


--
-- Name: COLUMN employees.quan_ly_truc_tiep; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.quan_ly_truc_tiep IS 'TÃªn quáº£n lÃ½ trá»±c tiáº¿p phá»¥ trÃ¡ch phÃª duyá»‡t';


--
-- Name: COLUMN employees.quan_ly_gian_tiep; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.quan_ly_gian_tiep IS 'TÃªn quáº£n lÃ½ giÃ¡n tiáº¿p/giÃ¡m Ä‘á»‘c chi nhÃ¡nh nháº­n thÃ´ng tin';


--
-- Name: COLUMN employees.ma_cham_cong; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.ma_cham_cong IS 'Mã chấm công của nhân viên';


--
-- Name: COLUMN employees.loai_hop_dong; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.loai_hop_dong IS 'Loại hợp đồng (VD: Chính thức, Thử việc, Thời vụ)';


--
-- Name: COLUMN employees.dia_diem; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.dia_diem IS 'Địa điểm làm việc';


--
-- Name: COLUMN employees.tinh_thue; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.tinh_thue IS 'Tính thuế (VD: Có, Không)';


--
-- Name: COLUMN employees.cap_bac; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.employees.cap_bac IS 'Cấp bậc của nhân viên';


--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: equipment_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipment_assignments (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    phong_ban character varying(20) NOT NULL,
    ten_vat_dung character varying(255) NOT NULL,
    so_luong integer DEFAULT 1,
    trang_thai character varying(20) DEFAULT 'PENDING'::character varying,
    ngay_phan_cong date DEFAULT CURRENT_DATE,
    ngay_tra date,
    ghi_chu text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT equipment_assignments_phong_ban_check CHECK (((phong_ban)::text = ANY ((ARRAY['IT'::character varying, 'HR'::character varying, 'ACCOUNTING'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT equipment_assignments_trang_thai_check CHECK (((trang_thai)::text = ANY ((ARRAY['PENDING'::character varying, 'ASSIGNED'::character varying, 'RETURNED'::character varying])::text[])))
);


--
-- Name: TABLE equipment_assignments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.equipment_assignments IS 'Bảng lưu thông tin phân công vật dụng cho nhân viên';


--
-- Name: equipment_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.equipment_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: equipment_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.equipment_assignments_id_seq OWNED BY public.equipment_assignments.id;


--
-- Name: interview_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interview_requests (
    id integer NOT NULL,
    candidate_id integer NOT NULL,
    manager_id integer NOT NULL,
    manager_name character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'PENDING'::character varying,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    indirect_manager_id integer,
    indirect_manager_name character varying(255),
    interview_date date,
    interview_time time without time zone,
    evaluation_criteria_1 boolean DEFAULT false,
    evaluation_criteria_2 boolean DEFAULT false,
    evaluation_criteria_3 boolean DEFAULT false,
    evaluation_criteria_4 boolean DEFAULT false,
    evaluation_criteria_5 boolean DEFAULT false,
    evaluation_notes text,
    direct_manager_evaluated boolean DEFAULT false,
    direct_manager_evaluation_data jsonb,
    indirect_manager_evaluated boolean DEFAULT false,
    indirect_manager_evaluation_data jsonb,
    CONSTRAINT interview_requests_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'PENDING_EVALUATION'::character varying])::text[])))
);


--
-- Name: interview_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.interview_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: interview_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.interview_requests_id_seq OWNED BY public.interview_requests.id;


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_requests (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    team_lead_id integer NOT NULL,
    branch_manager_id integer,
    request_type character varying(20) NOT NULL,
    start_date date NOT NULL,
    end_date date,
    reason text NOT NULL,
    notes text,
    status character varying(20) DEFAULT 'PENDING_TEAM_LEAD'::character varying NOT NULL,
    team_lead_action character varying(20),
    team_lead_action_at timestamp without time zone,
    team_lead_comment text,
    branch_action character varying(20),
    branch_action_at timestamp without time zone,
    branch_comment text,
    hr_admin_user_id integer,
    escalated_at timestamp without time zone,
    due_at timestamp without time zone DEFAULT (CURRENT_TIMESTAMP + '24:00:00'::interval),
    overdue_notified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    leave_type character varying(50),
    CONSTRAINT leave_requests_request_type_check CHECK (((request_type)::text = ANY ((ARRAY['LEAVE'::character varying, 'RESIGN'::character varying])::text[]))),
    CONSTRAINT leave_requests_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'CANCELLED'::character varying])::text[])))
);


--
-- Name: leave_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leave_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leave_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leave_requests_id_seq OWNED BY public.leave_requests.id;


--
-- Name: overtime_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.overtime_requests (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    team_lead_id integer NOT NULL,
    request_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    duration text,
    reason text NOT NULL,
    notes text,
    status character varying(30) DEFAULT 'PENDING_TEAM_LEAD'::character varying NOT NULL,
    team_lead_action character varying(20),
    team_lead_action_at timestamp without time zone,
    team_lead_comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT overtime_requests_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'CANCELLED'::character varying])::text[]))),
    CONSTRAINT overtime_requests_team_lead_action_check CHECK (((team_lead_action)::text = ANY ((ARRAY['APPROVE'::character varying, 'REJECT'::character varying])::text[])))
);


--
-- Name: overtime_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.overtime_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: overtime_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.overtime_requests_id_seq OWNED BY public.overtime_requests.id;


--
-- Name: recruitment_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recruitment_requests (
    id integer NOT NULL,
    manager_id integer NOT NULL,
    manager_type character varying(20) NOT NULL,
    chuc_danh_can_tuyen character varying(255) NOT NULL,
    so_luong_yeu_cau integer NOT NULL,
    phong_ban character varying(255) NOT NULL,
    nguoi_quan_ly_truc_tiep character varying(255),
    mo_ta_cong_viec character varying(20),
    loai_lao_dong character varying(20),
    ly_do_tuyen jsonb,
    ly_do_khac_ghi_chu text,
    tieu_chuan_tuyen_chon jsonb,
    status character varying(50) DEFAULT 'PENDING'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT recruitment_requests_loai_lao_dong_check CHECK (((loai_lao_dong)::text = ANY ((ARRAY['thoi_vu'::character varying, 'toan_thoi_gian'::character varying])::text[]))),
    CONSTRAINT recruitment_requests_manager_type_check CHECK (((manager_type)::text = ANY ((ARRAY['DIRECT'::character varying, 'INDIRECT'::character varying])::text[]))),
    CONSTRAINT recruitment_requests_mo_ta_cong_viec_check CHECK (((mo_ta_cong_viec)::text = ANY ((ARRAY['co'::character varying, 'chua_co'::character varying])::text[]))),
    CONSTRAINT recruitment_requests_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying])::text[])))
);


--
-- Name: recruitment_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recruitment_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recruitment_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recruitment_requests_id_seq OWNED BY public.recruitment_requests.id;


--
-- Name: request_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_items (
    id integer NOT NULL,
    request_id integer NOT NULL,
    item_name character varying(255) NOT NULL,
    quantity integer DEFAULT 1,
    quantity_provided integer DEFAULT 0,
    status character varying(20) DEFAULT 'PENDING'::character varying,
    notes text,
    provided_by integer,
    provided_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT request_items_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'PARTIAL'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))
);


--
-- Name: TABLE request_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.request_items IS 'Bảng lưu trữ chi tiết từng item trong yêu cầu';


--
-- Name: COLUMN request_items.quantity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.request_items.quantity IS 'Số lượng yêu cầu';


--
-- Name: COLUMN request_items.quantity_provided; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.request_items.quantity_provided IS 'Số lượng đã cung cấp';


--
-- Name: COLUMN request_items.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.request_items.status IS 'Trạng thái: PENDING, PARTIAL, COMPLETED, CANCELLED';


--
-- Name: request_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.request_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: request_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.request_items_id_seq OWNED BY public.request_items.id;


--
-- Name: requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requests (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    request_type character varying(50) NOT NULL,
    target_department character varying(20) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    items jsonb,
    status character varying(20) DEFAULT 'PENDING'::character varying,
    priority character varying(20) DEFAULT 'NORMAL'::character varying,
    requested_by integer,
    assigned_to integer,
    completed_at timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT requests_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW'::character varying, 'NORMAL'::character varying, 'HIGH'::character varying, 'URGENT'::character varying])::text[]))),
    CONSTRAINT requests_request_type_check CHECK (((request_type)::text = ANY ((ARRAY['IT_EQUIPMENT'::character varying, 'OFFICE_SUPPLIES'::character varying, 'ACCOUNTING'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT requests_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'REJECTED'::character varying])::text[]))),
    CONSTRAINT requests_target_department_check CHECK (((target_department)::text = ANY ((ARRAY['IT'::character varying, 'HR'::character varying, 'ACCOUNTING'::character varying, 'OTHER'::character varying])::text[])))
);


--
-- Name: TABLE requests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.requests IS 'Bảng lưu trữ yêu cầu từ HR đến các phòng ban (IT, Hành chính, Kế toán)';


--
-- Name: COLUMN requests.request_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requests.request_type IS 'Loại yêu cầu: IT_EQUIPMENT, OFFICE_SUPPLIES, ACCOUNTING, OTHER';


--
-- Name: COLUMN requests.target_department; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requests.target_department IS 'Phòng ban nhận yêu cầu: IT, HR, ACCOUNTING, OTHER';


--
-- Name: COLUMN requests.items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requests.items IS 'JSON array chứa danh sách vật dụng/thiết bị yêu cầu';


--
-- Name: COLUMN requests.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.requests.status IS 'Trạng thái: PENDING, APPROVED, IN_PROGRESS, COMPLETED, REJECTED';


--
-- Name: requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.requests_id_seq OWNED BY public.requests.id;


--
-- Name: travel_expense_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.travel_expense_requests (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    title text,
    purpose text,
    location text NOT NULL,
    location_type character varying(20) NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    is_overnight boolean DEFAULT false NOT NULL,
    requires_ceo boolean DEFAULT false NOT NULL,
    status character varying(40) DEFAULT 'PENDING_LEVEL_1'::character varying NOT NULL,
    current_step character varying(40) DEFAULT 'LEVEL_1'::character varying NOT NULL,
    estimated_cost numeric(12,2),
    requested_by integer,
    manager_id integer,
    manager_decision character varying(20),
    manager_notes text,
    manager_decision_at timestamp without time zone,
    ceo_id integer,
    ceo_decision character varying(20),
    ceo_notes text,
    ceo_decision_at timestamp without time zone,
    finance_id integer,
    finance_decision character varying(20),
    finance_notes text,
    finance_decision_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    approved_budget_amount numeric(12,2),
    approved_budget_currency character varying(10),
    approved_budget_exchange_rate numeric(10,4),
    budget_approved_at timestamp without time zone,
    budget_approved_by integer
);


--
-- Name: travel_expense_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.travel_expense_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: travel_expense_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.travel_expense_requests_id_seq OWNED BY public.travel_expense_requests.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(20) NOT NULL,
    ho_ten character varying(255),
    email character varying(255),
    trang_thai character varying(20) DEFAULT 'ACTIVE'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['ADMIN'::character varying, 'IT'::character varying, 'HR'::character varying, 'ACCOUNTING'::character varying])::text[]))),
    CONSTRAINT users_trang_thai_check CHECK (((trang_thai)::text = ANY ((ARRAY['ACTIVE'::character varying, 'INACTIVE'::character varying])::text[])))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'Bảng lưu thông tin người dùng hệ thống (Admin, IT, HR, Kế toán)';


--
-- Name: COLUMN users.password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password IS 'Mật khẩu được hash bcrypt (mặc định: RMG123@)';


--
-- Name: COLUMN users.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.role IS 'Vai trò: ADMIN (toàn quyền), IT, HR (thêm/sửa/xóa nhân viên), ACCOUNTING';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: v_employee_ratio_by_department; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_employee_ratio_by_department AS
 SELECT employees.phong_ban,
    (count(*))::integer AS so_luong,
    (round((((count(*))::numeric * 100.0) / (NULLIF(( SELECT count(*) AS count
           FROM public.employees employees_1
          WHERE ((employees_1.trang_thai)::text = 'ACTIVE'::text)), 0))::numeric), 2))::numeric(5,2) AS ty_le_phan_tram
   FROM public.employees
  WHERE ((employees.trang_thai)::text = 'ACTIVE'::text)
  GROUP BY employees.phong_ban;


--
-- Name: v_employees_with_equipment_count; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_employees_with_equipment_count AS
SELECT
    NULL::integer AS id,
    NULL::character varying(255) AS ho_ten,
    NULL::character varying(255) AS chuc_danh,
    NULL::character varying(20) AS phong_ban,
    NULL::character varying(255) AS bo_phan,
    NULL::date AS ngay_gia_nhap,
    NULL::character varying(255) AS email,
    NULL::character varying(20) AS trang_thai,
    NULL::bigint AS tong_vat_dung,
    NULL::timestamp without time zone AS created_at,
    NULL::timestamp without time zone AS updated_at;


--
-- Name: v_request_items_detail; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_request_items_detail AS
 SELECT ri.id,
    ri.request_id,
    ri.item_name,
    ri.quantity,
    ri.quantity_provided,
    ri.status,
    ri.notes,
    ri.provided_by,
    ri.provided_at,
    ri.created_at,
    ri.updated_at,
    r.title AS request_title,
    r.target_department,
    r.employee_id,
    e.ho_ten AS employee_name,
    u1.ho_ten AS provided_by_name,
        CASE
            WHEN (ri.quantity_provided = 0) THEN 'Chưa cung cấp'::text
            WHEN (ri.quantity_provided = ri.quantity) THEN 'Đã cung cấp đủ'::text
            WHEN (ri.quantity_provided < ri.quantity) THEN 'Đã cung cấp một phần'::text
            ELSE 'Đã cung cấp vượt mức'::text
        END AS provision_status
   FROM (((public.request_items ri
     LEFT JOIN public.requests r ON ((ri.request_id = r.id)))
     LEFT JOIN public.employees e ON ((r.employee_id = e.id)))
     LEFT JOIN public.users u1 ON ((ri.provided_by = u1.id)));


--
-- Name: v_requests_statistics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_requests_statistics AS
 SELECT requests.target_department,
    requests.status,
    count(*) AS count,
    count(*) FILTER (WHERE (requests.created_at >= (CURRENT_DATE - '7 days'::interval))) AS count_last_7_days,
    count(*) FILTER (WHERE (requests.created_at >= (CURRENT_DATE - '30 days'::interval))) AS count_last_30_days
   FROM public.requests
  GROUP BY requests.target_department, requests.status;


--
-- Name: v_requests_with_employee; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_requests_with_employee AS
 SELECT r.id,
    r.employee_id,
    r.request_type,
    r.target_department,
    r.title,
    r.description,
    r.items,
    r.status,
    r.priority,
    r.requested_by,
    r.assigned_to,
    r.completed_at,
    r.notes,
    r.created_at,
    r.updated_at,
    e.ho_ten AS employee_name,
    e.email AS employee_email,
    e.ma_nhan_vien,
    u1.ho_ten AS requested_by_name,
    u2.ho_ten AS assigned_to_name
   FROM (((public.requests r
     LEFT JOIN public.employees e ON ((r.employee_id = e.id)))
     LEFT JOIN public.users u1 ON ((r.requested_by = u1.id)))
     LEFT JOIN public.users u2 ON ((r.assigned_to = u2.id)));


--
-- Name: v_requests_with_items; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_requests_with_items AS
SELECT
    NULL::integer AS request_id,
    NULL::integer AS employee_id,
    NULL::character varying(50) AS request_type,
    NULL::character varying(20) AS target_department,
    NULL::character varying(255) AS title,
    NULL::text AS description,
    NULL::character varying(20) AS request_status,
    NULL::character varying(20) AS priority,
    NULL::integer AS requested_by,
    NULL::integer AS assigned_to,
    NULL::timestamp without time zone AS completed_at,
    NULL::text AS request_notes,
    NULL::timestamp without time zone AS request_created_at,
    NULL::timestamp without time zone AS request_updated_at,
    NULL::character varying(255) AS employee_name,
    NULL::character varying(255) AS employee_email,
    NULL::character varying(20) AS ma_nhan_vien,
    NULL::character varying(255) AS requested_by_name,
    NULL::character varying(255) AS assigned_to_name,
    NULL::bigint AS total_items,
    NULL::bigint AS completed_items,
    NULL::bigint AS partial_items,
    NULL::bigint AS pending_items,
    NULL::bigint AS total_quantity,
    NULL::bigint AS total_provided;


--
-- Name: attendance_adjustments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_adjustments ALTER COLUMN id SET DEFAULT nextval('public.attendance_adjustments_id_seq'::regclass);


--
-- Name: candidates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates ALTER COLUMN id SET DEFAULT nextval('public.candidates_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: equipment_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_assignments ALTER COLUMN id SET DEFAULT nextval('public.equipment_assignments_id_seq'::regclass);


--
-- Name: interview_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_requests ALTER COLUMN id SET DEFAULT nextval('public.interview_requests_id_seq'::regclass);


--
-- Name: leave_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests ALTER COLUMN id SET DEFAULT nextval('public.leave_requests_id_seq'::regclass);


--
-- Name: overtime_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_requests ALTER COLUMN id SET DEFAULT nextval('public.overtime_requests_id_seq'::regclass);


--
-- Name: recruitment_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recruitment_requests ALTER COLUMN id SET DEFAULT nextval('public.recruitment_requests_id_seq'::regclass);


--
-- Name: request_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_items ALTER COLUMN id SET DEFAULT nextval('public.request_items_id_seq'::regclass);


--
-- Name: requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests ALTER COLUMN id SET DEFAULT nextval('public.requests_id_seq'::regclass);


--
-- Name: travel_expense_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_expense_requests ALTER COLUMN id SET DEFAULT nextval('public.travel_expense_requests_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: attendance_adjustments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendance_adjustments (id, employee_id, team_lead_id, adjustment_date, check_type, check_in_time, check_out_time, reason, notes, status, team_lead_action, team_lead_action_at, team_lead_comment, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: candidates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.candidates (id, ho_ten, ngay_sinh, vi_tri_ung_tuyen, phong_ban, so_dien_thoai, cccd, ngay_gui_cv, cv_file_path, cv_file_name, status, notes, created_at, updated_at, ngay_cap_cccd, noi_cap_cccd, dia_chi_tam_tru, gioi_tinh, noi_sinh, tinh_trang_hon_nhan, dan_toc, quoc_tich, ton_giao, so_dien_thoai_khac, email, nguyen_quan, trinh_do_van_hoa, trinh_do_chuyen_mon, chuyen_nganh, kinh_nghiem_lam_viec, qua_trinh_dao_tao, trinh_do_ngoai_ngu, job_offer_sent_date) FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employees (id, ho_ten, chuc_danh, phong_ban, bo_phan, ngay_gia_nhap, email, password, trang_thai, created_at, updated_at, ma_nhan_vien, chi_nhanh, quan_ly_truc_tiep, quan_ly_gian_tiep, ma_cham_cong, loai_hop_dong, dia_diem, tinh_thue, cap_bac) FROM stdin;
697	Lê Thanh Tùng	Tổng giám đốc	Ban giám đốc	Ban Giám Đốc	2007-07-02	tung-le@rmg.com.vn	$2b$10$o/trO9Y/9Dw8tNrw9AqCvO88GSCtxqzRTEyZYxgGLXV55IjVclKPO	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00001	Head Office	\N	\N	\N	HĐLĐ	VP HCM	LT	TGĐ
698	Nguyễn Ngọc Luyễn	Giám đốc Chi nhánh	Ban Giám Đốc	Ban Giám Đốc	2007-10-15	luyennn@rmg.com.vn	$2b$10$RfnjXOkFB2ujf21cEidd5OYebr64yCxTPGHTSOkcwYvpJ/VmVQ8tu	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00002	Hồ Chí Minh	Lê Thanh Tùng	Lê Thanh Tùng	\N	HĐLĐ	HCM	LT	Giám Đốc
699	Lê Phú Nhân	Phó phòng Mua hàng	Mua hàng	Mua hàng	2011-06-01	nhanlp@rmg.com.vn	$2b$10$waSEnMEsf/i6UWb6QavFieYYOLvGf2UddCcS8KjMfy9g3l/67ktnK	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00003	Head Office	Nguyễn Hoài Thanh	Nguyễn Hoài Thanh	00077	HĐLĐ	HCM	LT	Phó Phòng
700	Lê Phú Cường	Trưởng phòng Cơ khí	Cơ Khí	Cơ khí	2011-06-01	cuonglp@rmg.com.vn	$2b$10$dgGbqrqdi6ajr1HkGo3b.uEi1ON2FzEjp1lucxURCI.6rjjZ3YmxK	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00004	Hồ Chí Minh	Nguyễn Ngọc Luyễn	Lê Thanh Tùng	00005	HĐLĐ	HCM	LT	Trưởng Phòng
701	Nguyễn Văn Khải	Giám đốc Chi nhánh	Vận hành	Ban Giám Đốc	2012-02-05	khai@rmg.com.vn	$2b$10$AppyPc/COPnh6O4nlAXkA.LVMouIVk.k3FV35gIpD22Dc7kioJXG2	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00005	Hà Nội	Lê Thanh Tùng	Lê Thanh Tùng	\N	HĐLĐ	BNI	LT	Giám Đốc
702	Trịnh Hoài Tuấn	Kỹ sư Dịch vụ Kỹ thuật	Dịch vụ Kỹ thuật	DVKT	2012-09-01	tuan-trinh@rmg.com.vn	$2b$10$ijWHo3jvxTk6w6WL5fMMAOX/pOFOQDvXSz4VU1r/6dT2eJ2a1ktOm	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00006	Head Office	Hoàng Đình Sạch	Lê Thanh Tùng	\N	HĐLĐ	HCM	LT	Chuyên Viên
703	Trần Đàm Phương Thảo	Trợ lý Ban giám đốc	Ban giám đốc	Ban Giám Đốc	2012-09-01	\N	$2b$10$DlZpkdQcUPf9aRdm6YiSlu/VDmilKsk5tEV8UhrmV3J78wYdoVY8e	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00007	Head Office	Lê Thanh Tùng	Lê Thanh Tùng	\N	HĐLĐ	VP HCM	LT	Nhân Viên
704	Hà Thị Minh Thi	Trưởng phòng Xuất nhập khẩu	Xuất nhập khẩu	Xuất nhập khẩu	2012-11-01	thihtm@rmg.com.vn	$2b$10$y1rZgXK1zXnY0AyYGDgb.OLo51pHuXTHKXGltfEEWCKz.UnZ1C4Qq	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00008	Head Office	Nguyễn Thị Ngọc Thúy	Lê Thanh Tùng	\N	HĐLĐ	VP HCM	LT	Trưởng Phòng
705	Nguyễn Văn Nghiêm	Quản lý Khối Sản xuất và Kỹ thuật	Vận hành	Sản xuất & Kỹ thuật	2013-05-01	nghiem@rmg.com.vn	$2b$10$e1fuhiHRo2hYdnN2GzFdS.9TLZs/gEoE.uuyT16a54Dv/QRUAvyEq	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00009	Hà Nội	Nguyễn Văn Khải	Lê Thanh Tùng	20130501	HĐLĐ	BNI	LT	Trưởng Phòng
706	Bùi Đăng Sủng	Trưởng nhóm Cơ khí và Khuôn in	Sản xuất	Cơ khí & Khuôn in	2014-04-01	sung@rmg.com.vn	$2b$10$lWa25g1rJhosEwusA0d/5.Erw5TWZDsr9Ut.VCFRuQGL79eHJq1FW	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00010	Hà Nội	Nguyễn Văn Nghiêm	Nguyễn Văn Khải	20140401	HĐLĐ	BNI	LT	Trưởng Nhóm
707	Cái Huy Ân	Trưởng phòng Quản lý Sản xuất	Quản lý Sản xuất	Quản lý Sản xuất	2014-07-01	anch@rmg.com.vn	$2b$10$a86gj6isGigBKJUxQpW/Kum5.nO85xD8zWlzEcEgup6UD69xrgOqu	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00011	Hồ Chí Minh	Nguyễn Ngọc Luyễn	Lê Thanh Tùng	\N	HĐLĐ	HCM	LT	Trưởng Phòng
708	Nguyễn Thị Ngọc Thúy	Kế toán Trưởng	Kế toán	Kế toán	2015-06-01	thuy-nguyen@rmg.com.vn	$2b$10$no9X57KDK331XvbBSVsxiu4W1sTsuyfK3MyDVx9apjV78nTuMU7EO	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00012	Head Office	Lê Thanh Tùng	Lê Thanh Tùng	\N	HĐLĐ	VP HCM	LT	Trưởng Phòng Cấp Cao
709	Hồ Thanh Lâm	Nhân viên Văn thư	Hành chính Nhân sự	HCNS	2015-11-02	thanhlam@rmg.com.vn	$2b$10$KN.UIwLTBowykkO33yXoBOZLyTjiHrLEi5v1tO/JbXRgje7llxPbS	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00013	Head Office	Lê Thanh Tùng	Lê Thanh Tùng	\N	HĐLĐ	VP HCM	LT	Nhân Viên
710	Trần Thị Cúc Hoa	Nhân viên Kho	Kho vận	Kho vận	2015-11-02	hoa-tran@rmg.com.vn	$2b$10$NnjCSX9czS3UeeLF6sO9NuCcU0LEnBwtlQVQQ9SAeIQKNyOylkMya	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00014	Hồ Chí Minh	Trương Thị Thanh Lịch	Huỳnh Phúc Văn	00008	HĐLĐ	HCM	LT	Nhân Viên
711	Trương Thị Thanh Lịch	Thủ kho	Kho vận	Kho vận	2016-02-02	lichttt@rmg.com.vn	$2b$10$McZfMYkSZSeBr2zozrFfB.zz8G3WL9Soz4tyf3g7Oeg0QhdEVO6j6	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00015	Hồ Chí Minh	Huỳnh Phúc Văn	Lê Thanh Tùng	00003	HĐLĐ	HCM	LT	Trưởng Nhóm
712	Phan Hữu Nghĩa	Nhân viên Quản lý sản xuất	Quản lý Sản xuất	Quản lý Sản xuất	2016-02-02	nghiaph@rmg.com.vn	$2b$10$d9JA8ATXNjCmF37/IPFhteBEwezjVMlTweTfL/Ygce82h9KsCFPfC	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00016	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00063	HĐLĐ	HCM	LT	Nhân Viên
713	Lê Thanh Hùng	Nhân viên Quản lý sản xuất	Quản lý Sản xuất	Quản lý Sản xuất	2016-05-02	lethanhhung-hcm@rmg.com.vn	$2b$10$ps.3Xl08Zl7yTM2qovkpM.q117lvK5umwZsiigd20D3qvBhnTQoau	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00017	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00048	HĐLĐ	HCM	LT	Nhân Viên
714	Trần Văn Tâm	Trưởng phòng Thiết kế Cơ khí	Thiết kế Cơ khí	Thiết kế	2016-05-02	tamtv@rmg.com.vn	$2b$10$fanAlJIObSkI1RCG4m.lD.dkfpJDA8OtViHEDgjNzT.aZy0M4sJA.	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00018	Hồ Chí Minh	Nguyễn Ngọc Luyễn	Lê Thanh Tùng	00069	HĐLĐ	HCM	LT	Trưởng Phòng
715	Vũ Văn Tùng	Phó phòng Kinh doanh	Kinh doanh	Kinh Doanh	2017-04-01	vantung@rmg.com.vn	$2b$10$F0VVv0/YvLTLz7MMRDr.G.RwNEFA9Gv6tPmf8Hyj9qCGUuHMTDMdq	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00019	Hà Nội	Nguyễn Văn Khải	Lê Thanh Tùng	\N	HĐLĐ	BNI	LT	Chuyên Viên
716	Võ Đình Chung	Kỹ sư Điện	Tự động	Điện	2017-05-01	vodinhchung-hcm@rmg.com.vn	$2b$10$QecKIhowfI27UeGFQldKMuSKT9DCAAsut.jGvkhWJlERcH7nTbJrW	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00020	Hồ Chí Minh	Nguyễn Ngọc Tấn	Bùi Trần Đức Duy	00018	HĐLĐ	HCM	LT	Chuyên Viên
717	Võ Thị Hồng Nhi	Nhân viên Điều phối	Hành chính Nhân sự	Vận hành	2017-07-01	hongnhi@rmg.com.vn	$2b$10$MAZk6fcDJmZn2ix054AP2ezkhxjCqlCIHBV/FrB/Pa.MqssQbeaKS	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00021	Hồ Chí Minh	Nguyễn Ngọc Luyễn	Nguyễn Hữu Thắng	00001	HĐLĐ	HCM	LT	Nhân Viên
718	Nguyễn Ngọc Tấn	Trưởng nhóm Điện	Tự động	Điện	2017-07-01	ngoctan@rmg.com.vn	$2b$10$jGQ9C.06dC2bgwitRA1uQ.xhzMhSdKW.2x2RmxnRGxf3xGJUWrEYW	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00022	Hồ Chí Minh	Bùi Trần Đức Duy	Nguyễn Ngọc Luyễn	00025	HĐLĐ	HCM	LT	Trưởng Nhóm
719	Phạm Văn Hưng	Trưởng nhóm Thiết kế	Kỹ thuật	Thiết kế	2017-08-01	hung@rmg.com.vn	$2b$10$g5KQOmBIIqQJRsZhchVC/uj3T9Njqhpb0yzCECy9E7fEWxDwrL/Ha	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00023	Hà Nội	Nguyễn Văn Nghiêm	Nguyễn Văn Khải	20170725	HĐLĐ	BNI	LT	Chuyên Viên
720	Nguyễn Ngọc Minh Tuấn	Trưởng phòng Kinh doanh	Kinh doanh	Kinh Doanh	2017-10-01	minhtuan@rmg.com.vn	$2b$10$h5sVpp91VjT7XTYsP6mB0OVl32sLKKLoMjzbsnZQuPHO6SgvUQ2Me	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00024	Hồ Chí Minh	Nguyễn Ngọc Luyễn	Lê Thanh Tùng	\N	HĐLĐ	HCM	LT	Trưởng Phòng
721	Phạm Thành Long	Công nhân Cơ khí	Cơ Khí	Cơ khí	2017-11-02	phamthanhlong-hcm@rmg.com.vn	$2b$10$cC1wVqRi5yk2plHxDUieM.waj1IHRJTxy5k.NZQp3/BmU03.J.LUO	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00025	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00049	HĐLĐ	HCM	LT	Công Nhân
722	Châu Quang Hải	Giám đốc Chi nhánh	Vận hành	Ban Giám Đốc	2018-04-01	hai-chau@rmg.com.vn	$2b$10$zmVuEMmEVkuPYY11V3KU4.inYgesGkOIEF9apmt3pWWsQ3V3qEm.y	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00026	Quảng Ngãi	Lê Thanh Tùng	Lê Thanh Tùng	\N	HĐLĐ	QNG	LT	Giám Đốc
723	Nguyễn Thị Thanh	Nhân viên Vệ sinh	Hành chính Nhân sự	HCNS	2018-04-01	nguyenthithanh-hcm@rmg.com.vn	$2b$10$9t0Yl0GuBg6Cp4xdDGqyOu0VbZLT7ti29Z2KZrf6eJy7pWj57MkuO	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00027	Hồ Chí Minh	Võ Thị Hồng Nhi	Nguyễn Ngọc Luyễn	00040	HĐLĐ	HCM	LT	Nhân Viên
724	Nguyễn Văn Thanh	Nhân viên Lái xe	Hành chính Nhân sự	HCNS	2018-04-01	nguyenvanthanh-hcm@rmg.com.vn	$2b$10$1xfA2P4m0lk6J8XAKlLYtuG4hBEz4v8Oz9bQFXZlAsOmxbfRQ9JV6	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00028	Hồ Chí Minh	Võ Thị Hồng Nhi	Nguyễn Ngọc Luyễn	\N	HĐLĐ	HCM	LT	Nhân Viên
725	Đỗ Minh Hội	Công nhân Cơ khí	Cơ Khí	Cơ khí	2018-12-01	dominhhoi-hcm@rmg.com.vn	$2b$10$AmQZ3GrQtFFSUjYWrhVdoeMtm3y.Vx3f0Wv/LInrBUIh./7pyKsui	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00029	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00059	HĐLĐ	HCM	LT	Công Nhân
726	Nguyễn Lê Ngọc Tâm	Nhân viên Quản lý sản xuất	Quản lý Sản xuất	Quản lý Sản xuất	2019-03-01	ngoctam@rmg.com.vn	$2b$10$ImXk0iAggSvfj1ePbLJiF.mioD6qruoxEmgPfqGHB3R5wGsh8Qxeu	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00030	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00004	HĐLĐ	HCM	LT	Nhân Viên
727	Nguyễn Thanh Quan	Nhân viên Giao hàng	Kho vận	Kho vận	2019-06-01	quan-thanh@rmg.com.vn	$2b$10$wtrMPAAul1PEsmJ1EYx9GOhuKCp/qc/0MQZhE8DdSYmQ/dumvJAfi	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00031	Hồ Chí Minh	Trương Thị Thanh Lịch	Huỳnh Phúc Văn	00053	HĐLĐ	HCM	LT	Nhân Viên
728	Phạm Tấn Thương	Kỹ sư Thiết kế Cơ khí	Thiết kế Cơ khí	Thiết kế	2019-06-01	thuongpt@rmg.com.vn	$2b$10$GPeKwek73fVICXbwm4eiEuIEeP/cjoatsCf42nS7yP8LMyz0pfEEC	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00032	Hồ Chí Minh	Trần Văn Tâm	Nguyễn Ngọc Luyễn	00054	HĐLĐ	HCM	LT	Chuyên Viên
729	Huỳnh Phúc Văn	Trưởng phòng Quản lý chất lượng	Quản lý chất lượng	QA	2019-11-02	Vanhp@rmg.com.vn	$2b$10$Difqc8UWmzjF9dyMCnPzaeGRAwidE3dl6z4L29WFvC1ldBBT7g1Wm	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00033	Head Office	Lê Thanh Tùng	Lê Thanh Tùng	\N	HĐLĐ	HCM	LT	Trưởng Phòng
730	Hà Tuấn Phong	Công nhân Cơ khí	Cơ Khí	Cơ khí	2019-11-02	hatuanphong-hcm@rmg.com.vn	$2b$10$pXFKSIkCXNJYeHfVn10/DOqro3M5P8nIG77a6Uway7qsRTOzFd5yG	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00034	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00043	HĐLĐ	HCM	LT	Công Nhân
731	Huỳnh Công Tưởng	Trưởng phòng Dịch vụ điện tử	Dịch Vụ Điện Tử	DVĐT	2019-12-01	tuonghc@rmg.com.vn	$2b$10$XMfyemqQVgaY5AU2bCJq9.Dh7E7Hh4lIfi01j/pN351Yqm/cHQUee	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00035	Head Office	Huỳnh Phúc Văn	Lê Thanh Tùng	00046	HĐLĐ	HCM	LT	Trưởng Phòng
732	Nguyễn Thị Tuyết Kiều	Nhân viên Kho	Kho vận	Kho vận	2020-01-01	kieu-nguyen@rmg.com.vn	$2b$10$UuvpywgBcoHFNRQvSRoogu1tIKelVRKsNqUHLQxTSb14gJd.6ijRC	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00036	Hồ Chí Minh	Trương Thị Thanh Lịch	Huỳnh Phúc Văn	00071	HĐLĐ	HCM	LT	Nhân Viên
733	Hoàng Đình Sạch	Trưởng phòng Dịch vụ kỹ thuật	Dịch vụ Kỹ thuật	DVKT	2020-06-01	sach@rmg.com.vn	$2b$10$wytAvvqTdFK1Ai71WXw8x.ynSPg6Flx0GH5WBNbDqhXvyNGXszUqu	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00037	Head Office	Lê Thanh Tùng	Lê Thanh Tùng	\N	HĐLĐ	HCM	LT	Trưởng Phòng
734	Hồ Minh Lý	Trưởng nhóm Kết cấu	Sản xuất	Kết cấu	2020-06-01	ly-ho@rmg.com.vn	$2b$10$zbEu3JJV4RaL18MFjQcWxecj5v/bKxQfd0JFNzHY6iv95JdrT2Ndi	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00038	Quảng Ngãi	Nguyễn Tài Viễn	Châu Quang Hải	BRT0024	HĐLĐ	QNG	LT	Trưởng Nhóm
735	Lê Trọng Suốt	Kỹ sư Điện	Tự động	Điện	2020-06-01	suot-le@rmg.com.vn	$2b$10$Wsje2VdxaGH7mauwRZh8fO8gpEPAav303WK2s31TNXgLtu8SZEoBW	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00039	Hồ Chí Minh	Nguyễn Ngọc Tấn	Bùi Trần Đức Duy	00012	HĐLĐ	HCM	LT	Chuyên Viên
736	Huỳnh Thanh Phùng	Kỹ sư Thiết kế Cơ khí	Thiết kế Cơ khí	Thiết kế	2020-09-01	phunght@rmg.com.vn	$2b$10$y3K.h7AEeCi0GyDbtHn3N.4dTdqXW2Ocdb29dCx.k38xb7Ylb7W3K	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00040	Hồ Chí Minh	Trần Văn Tâm	Nguyễn Ngọc Luyễn	00070	HĐLĐ	HCM	LT	Chuyên Viên
737	Lê Hoài Trung	Kỹ sư Bán hàng	Kinh doanh	Kinh Doanh	2020-10-01	trunglh@rmg.com.vn	$2b$10$MMbspIZjd74y8k0J1FMlxOqqf1RVvDE.O4XEGqlkVKCEGxI/TrD0.	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00041	Hồ Chí Minh	Nguyễn Ngọc Minh Tuấn	Nguyễn Ngọc Luyễn	\N	HĐLĐ	HCM	LT	Chuyên Viên
738	Vũ Đình Quang	Phó nhóm Khuôn in	Sản xuất	Khuôn in	2020-10-12	quang-vu@rmg.com.vn	$2b$10$EodKmx8TC5qUTf2St0ppF.E5i2qb140hBLimN0UuMWJva/KgUxR4y	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00042	Hà Nội	Bùi Đăng Sủng	Nguyễn Văn Nghiêm	20201012	HĐLĐ	BNI	LT	Phó Nhóm
739	Lê Hoàng Linh	Kỹ sư Lập trình CNC	CNC	CNC	2020-11-01	lehoanglinh-hcm@rmg.com.vn	$2b$10$0hTIC6lihcFYO/GtCbX78uY6xX7iOxUHycYfM/Q1GUgSe2jcpWN2m	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00043	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00034	HĐLĐ	HCM	LT	Chuyên Viên
740	Đinh Quang Chúc	Trưởng nhóm Thiết kế Máy	Tự động	Thiết kế	2020-11-01	chuc-dinh@rmg.com.vn	$2b$10$zVqr0KORD22LMIgfruNOCu.1N5d6cr1zTnummVUxsJDSwVecNF6yq	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00044	Hồ Chí Minh	Bùi Trần Đức Duy	Nguyễn Ngọc Luyễn	00024	HĐLĐ	HCM	LT	Trưởng Nhóm
741	Nguyễn Hồng Nhớ	Phó nhóm CNC	Sản xuất	CNC	2020-12-01	nguyenhongnho-qn@rmg.com.vn	$2b$10$gO6xK5u4X5kPCL6Vi.8x6uZQk/CgBcfmoL0Zb3nIYFAPZT6q2hq4S	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00045	Quảng Ngãi	Trương Ngọc Hồng	Nguyễn Tài Viễn	BRT0004	HĐLĐ	QNG	LT	Phó Nhóm
742	Trương Bảo Chung	Kỹ thuật viên Kết cấu	Sản xuất	Kết cấu	2020-12-01	truongbaochung-qn@rmg.com.vn	$2b$10$U4rMJUvjzX1EOeXMiX1e8erpzTqIRJDy6sCJ5VKMVZxDPfxqWroYm	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00046	Quảng Ngãi	Nguyễn Tài Viễn	Châu Quang Hải	BRT0005	HĐLĐ	QNG	LT	Nhân Viên
743	Võ Tấn Hùng	Phó nhóm Kết cấu	Sản xuất	Kết cấu	2020-12-01	votanhung-qn@rmg.com.vn	$2b$10$Ai2kFp0JqoPNsM3noD4fceyX0c.13/7j814tYDN6o9q6FvcLN7TOC	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00047	Quảng Ngãi	Nguyễn Tài Viễn	Nguyễn Tài Viễn	BRT0006	HĐLĐ	QNG	LT	Công Nhân
744	Lê Văn Duyên	Kỹ sư CNC	CNC	CNC	2021-02-01	duyen-le@rmg.com.vn	$2b$10$.0bjuopjwxmwRLXzmKbJre22IXb.2iukIP9PmpyS/UmnpzUa1yVGa	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00048	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00029	HĐLĐ	HCM	LT	Chuyên Viên
745	Trần Quang Vinh	Nhân viên Marketing	Marketing	Marketing	2021-03-01	vinh-tran@rmg.com.vn	$2b$10$I7Cu3gT6OEbhOhwqMXADqeE1VUkYS2QgZI2n5olHS1PVWH144p5VG	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00049	Hồ Chí Minh	Nguyễn Ngọc Luyễn	Lê Thanh Tùng	\N	HĐLĐ	HCM	LT	Nhân Viên
746	Chu Văn Anh	Nhân viên Quản lý chất lượng	Quản lý chất lượng	QA	2021-03-01	anh-chu@rmg.com.vn	$2b$10$oaeQ9B0rVW6qJgR4QAtN7eY32IMA.QL939zU9BTdsSjyD6Qmzer6q	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00050	Head Office	Huỳnh Phúc Văn	Lê Thanh Tùng	00074	HĐLĐ	HCM	LT	Nhân Viên
747	Nguyễn Hữu Hồng Đức	Kỹ sư Vận hành CNC	CNC	CNC	2021-04-01	nguyenhuuhongduc-hcm@rmg.com.vn	$2b$10$wqWg9/Om0C0YbDVq0etpOOIAOtJNcNGpnrLCwhP1TNpRFCDslrlau	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00051	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00035	HĐLĐ	HCM	LT	Chuyên Viên
748	Nguyễn Trung Hải	Nhân viên IT	Hành Chính Nhân Sự	IT	2021-04-01	Hai-nguyen@rmg.com.vn	$2b$10$SBUvcbx8Oxx7J7eZfdvq6O9GvR11KzMf/Z3y0ueFrSGuzJHobnpdu	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00052	Head Office	Lê Thanh Tùng	Lê Thanh Tùng	\N	HĐLĐ	HCM	LT	Nhân Viên
749	Mai Văn Mai	Nhân viên Lái xe	Hành chính Nhân sự	HCNS	2021-04-01	maivanmai-hcm@rmg.com.vn	$2b$10$LSEKsvj/sEZqUh6aRS13j.nqEivCL64CD89BzjX00oeJ/nNAsCYX.	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00053	Hồ Chí Minh	Võ Thị Hồng Nhi	Nguyễn Ngọc Luyễn	00078	HĐLĐ	HCM	LT	Nhân Viên
750	Trần Nhật Thanh	Nhân viên Kế toán Thanh toán	Kế toán	Kế toán	2021-06-01	thanh-tran@rmg.com.vn	$2b$10$3V3COgs1JbWTwP5AM8NUGOXkSPvQndf.cQbeLR.DKs5btIvfT/kpu	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00054	Head Office	Nguyễn Thị Ngọc Thúy	Lê Thanh Tùng	\N	HĐLĐ	VP HCM	LT	Nhân Viên
751	Phạm Sỹ Hoàng	Nhân viên Khuôn in	Sản xuất	Khuôn in	2021-06-01	phamsyhoang-hn@rmg.com.vn	$2b$10$5eDCt6EMtBfVYejnBAhWmuptkCaKOl4fEZD.g7l1lmAS5S6EqgSXu	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00055	Hà Nội	Bùi Đăng Sủng	Nguyễn Văn Nghiêm	20253009	HĐLĐ	BNI	LT	Nhân Viên
752	Nguyễn Thái Sơn	Kỹ thuật viên Dịch vụ điện tử	Dịch Vụ Điện Tử	DVĐT	2021-06-01	son-nguyen@rmg.com.vn	$2b$10$BC/Kw276Uu.GbII/QzyiruB0U/iavrjvS5MbT7XBXR6MlHXEmHZ6G	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00056	Head Office	Huỳnh Công Tưởng	Huỳnh Phúc Văn	00047	HĐLĐ	HCM	LT	Nhân Viên
753	Nguyễn Tấn Tài	Công nhân Cơ khí	Cơ Khí	Cơ khí	2021-08-01	nguyentantai-hcm@rmg.com.vn	$2b$10$.wdgDYXghoVLNx/1Mu7KOeoHmXTmqWst3jVwnyRilxr1aUWlZCj9K	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00057	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00009	HĐLĐ	HCM	LT	Công Nhân
754	Võ Thanh Ngân	Kỹ thuật viên Kết cấu	Sản xuất	Kết cấu	2021-09-01	vothanhngan-qn@rmg.com.vn	$2b$10$KWiiv5fB.8l8PJRei2bwjeHIrheicrq/lL3SzrcaY651HWH6vei.m	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00058	Quảng Ngãi	Nguyễn Tài Viễn	Châu Quang Hải	BRT0008	HĐLĐ	QNG	LT	Nhân Viên
755	Nguyễn Thế Sương	Công nhân Lắp ráp	Cơ Khí	Lắp ráp	2021-10-01	suong-the@rmg.com.vn	$2b$10$nWeBdB.aAGocz9ijQezjxe8y5d32CZkrKogJsMw18NcHcO2aqywjK	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00059	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00080	HĐLĐ	HCM	LT	Công Nhân
756	Trần Minh Đức	Kỹ sư Điện	Tự động	Điện	2021-10-11	duc-tran@rmg.com.vn	$2b$10$DWMax/.hhb4zB.GgxPVvIOlNsVStfLqaMa2xCt.NXS2zEZK8GztMS	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00060	Hồ Chí Minh	Nguyễn Ngọc Tấn	Bùi Trần Đức Duy	00022	HĐLĐ	HCM	LT	Chuyên Viên
757	Nguyễn Hữu Thắng	Nhân viên Nhân sự	Hành chính Nhân sự	HCNS	2021-10-19	thang-nguyen@rmg.com.vn	$2b$10$kGJ5lFN5K2aE8heaLgwo/uMdskJuYGZRjUxylnv3LWrPXtl8d0j/i	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00061	Head Office	Lê Thanh Tùng	Lê Thanh Tùng	\N	HĐLĐ	VP HCM	LT	Nhân Viên
758	Nguyễn Thu Thảo	Nhân viên Bếp	Hành chính Nhân sự	HCNS	2021-10-21	nguyenthuthao-hcm@rmg.com.vn	$2b$10$x2uuxFsPt6/BQQz3EtxHmONQJm9T3VFKIHmtzIIDkCEegIn4ZWuRu	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00062	Hồ Chí Minh	Võ Thị Hồng Nhi	Nguyễn Ngọc Luyễn	00051	HĐLĐ	HCM	LT	Nhân Viên
759	Nguyễn Đông Thạnh	Kỹ sư Thiết kế	Kỹ thuật	Thiết kế	2021-11-09	dong-thanh@rmg.com.vn	$2b$10$XK.qawCRlAaK.MnUX6/T6uIYRvaoTYbfL04n30SNFh3ei4cdSOHLq	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00063	Quảng Ngãi	Nguyễn Tài Viễn	Châu Quang Hải	BRT0016	HĐLĐ	QNG	LT	Chuyên Viên
760	Huỳnh Đức Trọng Tài	Kỹ sư Điện	Tự động	Điện	2022-02-26	tai-huynh@rmg.com.vn	$2b$10$gSrjklVtgnQBGhfULX5Y3O.6BExyDZwofE1o2GltGoqbbb7TOO8Pi	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00064	Hồ Chí Minh	Huỳnh Công Tưởng	Huỳnh Phúc Văn	00072	HĐLĐ	HCM	LT	Chuyên Viên
761	Lê Thanh Phương	Nhân viên Bếp	Hành chính Nhân sự	HCNS	2022-03-01	lethanhphuong-hcm@rmg.com.vn	$2b$10$Z155OVmTwxP7BRGiaPczAuKvOeDaC6jHlgI7mHJ716tZ.hVxTbBj.	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00065	Hồ Chí Minh	Võ Thị Hồng Nhi	Nguyễn Ngọc Luyễn	00079	HĐLĐ	HCM	LT	Nhân Viên
762	Trần Thị Hằng	Nhân viên Bếp	Hành chính Nhân sự	HCNS	2022-03-01	tranthihang-hcm@rmg.com.vn	$2b$10$ok1JgDBmOCmT7mIV9jpLB.PsYWbakfTbbu.Jm.U7swLJXKkwXEZ3i	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00066	Hồ Chí Minh	Võ Thị Hồng Nhi	Nguyễn Ngọc Luyễn	00050	HĐLĐ	HCM	LT	Nhân Viên
763	Châu Thanh Xuân	Công nhân Cơ khí	Cơ Khí	Cơ khí	2022-03-01	chauthanhxuan-hcm@rmg.com.vn	$2b$10$PgjAkfZfxhV8VFXif/LpeOpILFgIRIbCNFr1FB1nLU2E4vLyYjXIu	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00067	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00039	HĐLĐ	HCM	LT	Công Nhân
764	Đỗ Trần Mai Thảo	Kỹ sư Bán hàng	Kinh doanh	Kinh Doanh	2022-03-14	thao-do@rmg.com.vn	$2b$10$07z.acBLDSy0qu8Yxx.nSuhPRFiDg3ypU0jRAuVcCu0qKEnho5kS.	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00068	Hồ Chí Minh	Nguyễn Ngọc Minh Tuấn	Nguyễn Ngọc Luyễn	\N	HĐLĐ	HCM	LT	Chuyên Viên
765	Đỗ Đình Trung	Nhân viên Lái Xe	Vận hành	HCNS	2022-03-26	dodinhtrung-hn@rmg.com.vn	$2b$10$V2Urx5aUe6cSz8qDgmvx3.Cx0BT.eJ1QTDDCghu4IYyVlgxPr.oY.	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00069	Hà Nội	Nguyễn Văn Nghiêm	Nguyễn Văn Khải	20220326	HĐLĐ	BNI	LT	Nhân Viên
766	Đỗ Phan Phi Long	Kỹ sư Bán hàng	Kinh doanh	Kinh Doanh	2022-06-01	long-do@rmg.com.vn	$2b$10$bJqdk4M5VDuwk.zObUAU9.xwTx4pQudrZ65tg3VSjIE9IF4yXK8xa	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00070	Hồ Chí Minh	Nguyễn Ngọc Minh Tuấn	Nguyễn Ngọc Luyễn	\N	HĐLĐ	HCM	LT	Chuyên Viên
767	Bùi Hoàng Anh	Kỹ thuật viên Vận hành CNC	CNC	CNC	2022-06-01	buihoanganh-hcm@rmg.com.vn	$2b$10$51rrkwlduwJ5/b4DIwpuReltFX/XhfJ5R4Zq4RhpBN3kBEMl4n5Z6	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00071	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00036	HĐLĐ	HCM	LT	Nhân Viên
768	Dương Tấn Đạt	Công nhân Lắp ráp	Cơ Khí	Lắp ráp	2022-06-01	dat-dang@rmg.com.vn	$2b$10$JCd7eswtak/CgZzqSXyinOi86vlQX2BknNCPrlFlZKutNjqQmYF0W	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00072	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00060	HĐLĐ	HCM	LT	Công Nhân
769	Nguyễn Thị Cẩm Hằng	Nhân viên Mua hàng	Vận hành	Mua hàng	2022-06-20	hang-nguyen@rmg.com.vn	$2b$10$CMrkQxggpRgvPzp1p69eD.rgTpXKhL0Nne.knhiETw6mQa4uLZ0Ce	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00073	Quảng Ngãi	Châu Quang Hải	Nguyễn Hoài Thanh	BRT0015	HĐLĐ	QNG	LT	Nhân Viên
770	Lăng Hoàng Anh	Trưởng nhóm Tự động	Kỹ thuật	Tự động	2022-07-01	anh-lang@rmg.com.vn	$2b$10$jPXzZPHGt84RxCFugTSghOlUf6wMbcLzLpa2ah0b81ftqHgGSkYaW	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00074	Hà Nội	Nguyễn Văn Nghiêm	Nguyễn Văn Khải	1072022	HĐLĐ	BNI	LT	Trưởng Nhóm
771	Phan Văn Điệp	Kỹ sư Lập trình CNC	CNC	CNC	2022-07-25	phanvandiep-hcm@rmg.com.vn	$2b$10$Q1JjPovdUw8n7Zxd1By.E.CFTerQgRH8.tsAZ0jA2ntyjT5zyHjaO	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00075	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00031	HĐLĐ	HCM	LT	Chuyên Viên
772	Dương Tấn Tài	Công nhân Airbubble	Air bubble	Air bubble	2022-07-26	duongtantai-hcm@rmg.com.vn	$2b$10$X80cMijjRehxcbkis6A69.FxJRDFQsStG3u7Xuh6VukrxzAMbP2W2	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00076	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00088	HĐLĐ	HCM	LT	Công Nhân
773	Trần Quang Đức	Công nhân Airbubble	Air bubble	Air bubble	2022-07-26	tranquangduc-hcm@rmg.com.vn	$2b$10$3dQmUyu6HHngfNNzJuJ01eK5fr3hgswweiLHtLOBE1hyZVFBFp3Bu	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00077	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00090	HĐLĐ	HCM	LT	Công Nhân
774	Trần Thế Nam	Kỹ sư Thiết kế Máy	Tự động	Thiết kế	2022-08-04	nam-tran@rmg.com.vn	$2b$10$7fBx5VWK02e7m9wc9w4x.uBNugv7PbHCRoJHkTjiCJl.aHRxmaQRC	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00078	Hồ Chí Minh	Đinh Quang Chúc	Bùi Trần Đức Duy	00020	HĐLĐ	HCM	LT	Chuyên Viên
775	Nguyễn Tài Viễn	Quản lý Khối Sản xuất và Kỹ thuật	Vận hành	Sản xuất & Kỹ thuật	2022-08-08	vien-nguyen@rmg.com.vn	$2b$10$RUB1CFk3cvXNJUWmgMeBzO2HZ/jKkWq5iSioQNvaycRSCLgXzABYq	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00079	Quảng Ngãi	Châu Quang Hải	Lê Thanh Tùng	\N	HĐLĐ	QNG	LT	Trưởng Phòng
776	Lê Thị Kim Nương	Nhân viên Vệ sinh	Hành chính Nhân sự	HCNS	2022-09-01	lethikimnuong-hcm@rmg.com.vn	$2b$10$T9Qxg0QF4wPsm3VTUz68SuztKKW4kNMfqUYu3ffUnEjJSBWpajR/O	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00080	Hồ Chí Minh	Võ Thị Hồng Nhi	Nguyễn Ngọc Luyễn	00006	HĐLĐ	HCM	LT	Nhân Viên
777	Đặng Tiến Hữu	Kỹ sư Bán hàng	Kinh doanh	Kinh Doanh	2022-09-10	huu-dang@rmg.com.vn	$2b$10$u2WkWAvAloR9IpiME4LOQucSWstuqRLYshwVCT.Nv2hXtAm1Nf6rm	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00081	Hồ Chí Minh	Nguyễn Ngọc Minh Tuấn	Nguyễn Ngọc Luyễn	\N	HĐLĐ	HCM	LT	Chuyên Viên
778	Nguyễn Hữu Thành	Kỹ sư Vận hành CNC	CNC	CNC	2022-09-16	thanh-nguyen@rmg.com.vn	$2b$10$3YHz7Z.mJQV2xDWmZyoFS.vex3VJkeO35u1lEPjScm.vEsTYzv4Me	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00082	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00032	HĐLĐ	HCM	LT	Chuyên Viên
779	Triệu Ngọc Thành	Kỹ sư Dịch vụ kỹ thuật	Dịch vụ Kỹ thuật	DVKT	2022-11-25	thanh-ngoc@rmg.com.vn	$2b$10$dNbc0xmRYwGnNxgS4MisaO19Mu9fYfifApNRdS9E0SYeJS9kNs6Ce	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00083	Head Office	Hoàng Đình Sạch	Lê Thanh Tùng	\N	HĐLĐ	HCM	LT	Chuyên Viên
780	Phạm Ngọc Thọ	Kỹ sư Thiết kế Máy	Tự động	Thiết kế	2022-12-12	tho-pham@rmg.com.vn	$2b$10$3qdpXZ9EdH7jzNDZqcGeBenfcwnrJSg2H.6WA/HAt/vuvh6JlArVi	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00084	Hồ Chí Minh	Đinh Quang Chúc	Bùi Trần Đức Duy	00081	HĐLĐ	HCM	LT	Chuyên Viên
781	Nguyễn Hoàng Đô	Kỹ thuật viên Vận hành CNC	CNC	CNC	2022-12-26	nguyenhoangdo-hcm@rmg.com.vn	$2b$10$0Gz.iTLXEONUikhtoEK9Ce2USLNUT.OHGUBrUrC5UJ164JT0OrrVO	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00085	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00037	HĐLĐ	HCM	LT	Nhân Viên
782	Bùi Trần Đức Duy	Trưởng phòng Tự động	Tự động	Vận hành	2023-01-02	duy-bui@rmg.com.vn	$2b$10$lBWJpAW38si5JdM.Z4kbJOzYq2ZWed.XghI411xZV8NXT64rU7H9W	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00086	Hồ Chí Minh	Nguyễn Ngọc Luyễn	Lê Thanh Tùng	00007	HĐLĐ	HCM	LT	Trưởng Phòng
783	Võ Ngọc Khải	Công nhân Cơ khí	Cơ Khí	Cơ khí	2023-01-26	vongockhai-hcm@rmg.com.vn	$2b$10$daCIGsUkR1w/j9jQUbiEWenungUHqVRHHf45qGnjZvxxsU2G4FQdO	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00087	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00010	HĐLĐ	HCM	LT	Công Nhân
784	Đoàn Hoàng Phương	Trưởng nhóm Lắp ráp	Tự động	Lắp ráp	2023-01-26	phuong-doan@rmg.com.vn	$2b$10$k.mlhcJ.L9cRRgDTCVz94e2JfKdAjgho79e8uwtIgfbizIj9Ra5Ym	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00088	Hồ Chí Minh	Bùi Trần Đức Duy	Nguyễn Ngọc Luyễn	00017	HĐLĐ	HCM	LT	Trưởng Nhóm
785	Phạm Ngọc Thuận	Kỹ thuật viên CNC	Sản xuất	CNC	2023-02-01	phamngocthuan-qn@rmg.com.vn	$2b$10$rr.tmsatry5TqU6..vv1qOd6.XgYWZu64mgBRlpM8oPuDDtzegiDe	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00089	Quảng Ngãi	Trương Ngọc Hồng	Nguyễn Tài Viễn	BRT0007	HĐLĐ	QNG	LT	Nhân Viên
786	Nguyễn Ngọc Dũng	Kỹ thuật viên Kết cấu	Sản xuất	Kết cấu	2023-02-01	nguyenngocdung-qn@rmg.com.vn	$2b$10$LM8Kmw.OsM7F1zyapx5QQuIcq2IOxFB7eWetK1/A6kOgT5OIr8nIm	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00090	Quảng Ngãi	Nguyễn Tài Viễn	Châu Quang Hải	BRT0009	HĐLĐ	QNG	LT	Nhân Viên
787	Nguyễn Trung Hiếu	Kỹ sư Thiết kế Cơ khí	Thiết kế Cơ khí	Thiết kế	2023-02-13	hieu-nguyen@rmg.com.vn	$2b$10$GywGtfmlJpJTmfitSyUCN.evbjkn0FvOZO5ae7Vx1Lwsszy5fkaC2	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00091	Hồ Chí Minh	Trần Văn Tâm	Nguyễn Ngọc Luyễn	00064	HĐLĐ	HCM	LT	Chuyên Viên
788	Nguyễn Hoàng Duyên	Kỹ sư Dịch vụ kỹ thuật	Dịch vụ Kỹ thuật	DVKT	2023-02-27	duyen-nguyen@rmg.com.vn	$2b$10$Wy7HMVLxLhFboRYDyVjmQeVIRKtttZCnHluAyXeyaI4iXH9xAiNRS	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00092	Head Office	Hoàng Đình Sạch	Lê Thanh Tùng	\N	HĐLĐ	HCM	LT	Chuyên Viên
789	Đặng Tấn Đạt	Kỹ sư Thiết kế Cơ khí	Thiết kế Cơ khí	Thiết kế	2023-02-27	dangtandat-hcm@rmg.com.vn	$2b$10$7O3HLqZJ4A7F/xdoLJy7p.sw8ccTFCMhXwtfgCii5gCfLvjuElEgm	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00093	Hồ Chí Minh	Trần Văn Tâm	Nguyễn Ngọc Luyễn	00068	HĐLĐ	HCM	LT	Chuyên Viên
790	Trần Nhật Tâm	Kỹ sư Bán hàng	Kinh doanh	Kinh Doanh	2023-03-01	tam-tran@rmg.com.vn	$2b$10$MQo0CDStTS0c2nY4LEn6GOPv01N0dL1FYqJOzMwIH7qwOUuM/YDHW	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00094	Hà Nội	Nguyễn Văn Khải	Nguyễn Văn Khải	\N	HĐLĐ	BNI	LT	Chuyên Viên
791	Nguyễn Văn Hưng	Kỹ thuật viên Vận hành CNC	CNC	CNC	2023-03-06	nguyenvanhung-hcm@rmg.com.vn	$2b$10$50BbtFxfzFLUeewXcQFm0O3T3.UNRgfygXq5gz6sHKtfZK6oFrnC.	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00095	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00030	HĐLĐ	HCM	LT	Nhân Viên
792	Đoàn Hữu Hòa	Kỹ thuật viên Vận hành CNC	CNC	CNC	2023-03-13	doanhuuhoa-hcm@rmg.com.vn	$2b$10$qhBA2lheayzw3nvj5nyJnubIZlpqJ0b3B.roYNvFuBQ5iCAtlI9Ci	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00096	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00067	HĐLĐ	HCM	LT	Nhân Viên
793	Huỳnh Ngọc Luận	Kỹ thuật viên Vận hành CNC	CNC	CNC	2023-04-17	huynhngocluan-hcm@rmg.com.vn	$2b$10$8/v6iHcozqMw5p0f5nH4KOVXodAOyNNmuArQkKnF0Fcx5yddUM4jW	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00097	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00057	HĐLĐ	HCM	LT	Nhân Viên
794	Đoàn Minh Lý	Công nhân Cơ khí	Cơ Khí	Cơ khí	2023-05-01	doanminhly-hcm@rmg.com.vn	$2b$10$zE2TvnqyzZZBk8Sa/6m6E.2JlzAZcdA4QQUw0csGX2tXoumeqPMhq	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00098	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00041	HĐLĐ	HCM	LT	Công Nhân
795	Võ Ngọc Hảo	Kỹ thuật viên Kết cấu	Sản xuất	Kết cấu	2023-05-09	hao-vo@rmg.com.vn	$2b$10$/XV5NZ3F5bF6UPcDpaA3rOWIx3mWp6Pf.x2z1u06gmBrofJhTDwM6	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00099	Quảng Ngãi	Nguyễn Tài Viễn	Châu Quang Hải	BRT0012	HĐLĐ	QNG	LT	Nhân Viên
796	Nguyễn Ngọc Vương	Công nhân Kết cấu	Sản xuất	Kết cấu	2023-06-01	nguyenngocvuong-qn@rmg.com.vn	$2b$10$zuOUyjsvcgWtN/aJuD0wdOZU3tqBr3MR3CrrrqTMP7aCCw0YRJ.C2	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00100	Quảng Ngãi	Nguyễn Tài Viễn	Nguyễn Tài Viễn	BRT0011	HĐLĐ	QNG	LT	Công Nhân
797	Nguyễn Thành Toàn	Kỹ thuật viên Kết cấu	Sản xuất	Kết cấu	2023-08-01	toan-nguyenqn@rmg.com.vn	$2b$10$8moK8Zp5wcN.yhP1Qo1lMeaAXrgUbfX0igDZgeLPnlzvyAZh.zgV6	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00101	Quảng Ngãi	Nguyễn Tài Viễn	Châu Quang Hải	BRT0014	HĐLĐ	QNG	LT	Nhân Viên
798	Trịnh Hoàng Phát	Kỹ thuật viên Lắp ráp	Tự động	Lắp ráp	2023-08-01	trinhhoangphat-hcm@rmg.com.vn	$2b$10$1yBJ0cc7PyieK8g44KSpm.GD152DhraN7OGEuGA0NTrcNYg15Kgni	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00102	Hồ Chí Minh	Đoàn Hoàng Phương	Bùi Trần Đức Duy	00014	HĐLĐ	HCM	LT	Nhân Viên
799	Nguyễn Thông	Công nhân Kết cấu	Sản xuất	Kết cấu	2023-09-01	nguyenthong-qn@rmg.com.vn	$2b$10$nxx8PLRmY6IIfBu8HxbveeUsvMb3MSWD9ACu63YifKIVVzqQGPyWC	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00103	Quảng Ngãi	Nguyễn Tài Viễn	Nguyễn Tài Viễn	BRT0017	HĐLĐ	QNG	LT	Công Nhân
800	Phạm Văn Chung	Kỹ thuật viên Cơ khí	Sản xuất	Cơ khí	2023-09-05	phamvanchung-hn@rmg.com.vn	$2b$10$gSjsa4CRFZ.j4ZiO36gfjef8BbEGkULQUyc5Y6SP7kk.zLNUcqURW	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00104	Hà Nội	Bùi Đăng Sủng	Nguyễn Văn Nghiêm	20230905	HĐLĐ	BNI	LT	Nhân Viên
801	Vi Đức Hoàng	Kỹ thuật viên Cơ khí	Sản xuất	Cơ khí	2023-09-13	viduchoang-hn@rmg.com.vn	$2b$10$WOBKZ0huLzlDjPCT8A3lHeVf5/Urub7mIRFkMFJ6DN7ZkCUl9/gpS	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00105	Hà Nội	Bùi Đăng Sủng	Nguyễn Văn Nghiêm	00001	HĐLĐ	BNI	LT	Nhân Viên
802	Bùi Minh Nhật	Kỹ sư Bán hàng	Kinh doanh	Kinh Doanh	2023-09-20	nhat-bui@rmg.com.vn	$2b$10$9UtyxSQNXZ.4K/U50PYGSeASpKTq6pfUg9hN3a1CgyMjwgZ0CDClW	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00106	Quảng Ngãi	Châu Quang Hải	Lê Thanh Tùng	\N	HĐLĐ	QNG	LT	Chuyên Viên
803	Nguyễn Lương Đăng	Phó nhóm Cơ khí	Sản xuất	Cơ khí	2023-09-26	nguyenluongdang-hn@rmg.com.vn	$2b$10$TRnO.KSbhBjbpCmyQrZyB.pH8sCyWLRQSk5e9lwEEpXqbM1AuZ4vm	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00107	Hà Nội	Bùi Đăng Sủng	Nguyễn Văn Nghiêm	20232509	HĐLĐ	BNI	LT	Phó Nhóm
804	Nguyễn Thị Khương	Nhân viên Bếp	Vận hành	HCNS	2023-10-30	nguyenthikhuong-hn@rmg.com.vn	$2b$10$HIzRX.0LkXBSBr6AxFUWDu7oyDwEkpSgJENZV6lRK9x/ImS7hvIhy	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00108	Hà Nội	Nguyễn Văn Nghiêm	Nguyễn Văn Khải	20231030	HĐLĐ	BNI	LT	Nhân Viên
805	Võ Hoàng Tuấn	Kỹ sư Thiết kế Máy	Tự động	Thiết kế	2023-10-30	tuan-vo@rmg.com.vn	$2b$10$M9lKVahq2QC0gJcdhJ0jmuhUS2z/7KPtRaHICO5NEdcZcvhZ2Sr1C	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00109	Hồ Chí Minh	Đinh Quang Chúc	Bùi Trần Đức Duy	00075	HĐLĐ	HCM	LT	Chuyên Viên
806	Nguyễn Thái Bình	Kỹ sư thiết kế	Kỹ thuật	Thiết kế	2023-11-13	binh-nguyen@rmg.com.vn	$2b$10$5qO5CyfEHM4U0HIld.ZGxO1corwTxW//pRkyj6GOe9B1goazt1jqq	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00110	Quảng Ngãi	Nguyễn Tài Viễn	Châu Quang Hải	BRT0001	HĐLĐ	QNG	LT	Chuyên Viên
807	Trần Thị Lý	Nhân viên Vệ sinh	Vận hành	HCNS	2023-12-01	\N	$2b$10$WzRCE5rEdy6zJZAESDKuOeMFobCIb8NDsHx8qSKwC15xOwylV.JdO	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00111	Quảng Ngãi	Nguyễn Tài Viễn	Châu Quang Hải	BRT0019	Thời Vụ	QNG	10%	Nhân Viên
808	Hồ Đức Nhân	Kỹ sư Lắp ráp	Kỹ thuật	Lắp ráp	2023-12-26	ducnhan-qn@rmg.com.vn	$2b$10$Q8Qj4CFXzgaJIWE9RisF4uWa7Vtd87jt5pvk6dxWO5wj3Hsh8W70i	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00113	Quảng Ngãi	Nguyễn Tài Viễn	Châu Quang Hải	BRT0018	HĐLĐ	QNG	LT	Chuyên Viên
809	Nguyễn Thị Chang	Nhân viên Kế toán Nhập liệu	Kế toán	Kế toán	2024-01-01	\N	$2b$10$xKxpKTnbwzgNTbbn0dc86Op.U07cCbmIvnJr1IhQrNEhslUdfP.yS	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00114	Head Office	Nguyễn Thị Ngọc Thúy	Lê Thanh Tùng	\N	Thời Vụ	HCM	10%	Nhân Viên
810	Nguyễn Vinh	Kỹ thuật viên Vận hành CNC	CNC	CNC	2024-02-19	nguyenvinh-hcm@rmg.com.vn	$2b$10$PENc47wOE15hzHn7IhLMaeruuHUpQbbcG66fjEVP.OCjlzXBX/O8a	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00115	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00028	HĐLĐ	HCM	LT	Nhân Viên
811	Trương Ngọc Hồng	Trưởng nhóm CNC	Sản xuất	CNC	2024-02-26	truongngochong-qn@rmg.com.vn	$2b$10$i8O0Z5PL6vAlUtTd5R/7N.AsENAy41Ma0P3lMsi2gphWfw68qoRfW	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00116	Quảng Ngãi	Nguyễn Tài Viễn	Châu Quang Hải	BRT0020	HĐLĐ	QNG	LT	Trưởng Nhóm
812	Hoàng Đình Đồn	Kỹ thuật viên Cơ khí	Sản xuất	Cơ khí	2024-03-02	hoangdinhdon-hn@rmg.com.vn	$2b$10$BvTOnKDCA9XBxdYFtvAUCOU9xpguFLlm3hUVRZIpIebrtMmcP4OKO	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00117	Hà Nội	Bùi Đăng Sủng	Nguyễn Văn Nghiêm	20240302	HĐLĐ	BNI	LT	Nhân Viên
813	Nguyễn Cao Mạnh	Nhân viên Lắp ráp Tự động	Kỹ thuật	Tự động	2024-03-07	nguyencaomanh-hn@rmg.com.vn	$2b$10$MyG89PN3FK69CLVSy5cLCOjM/chbDDKu76XgavuuqS61Jo6DQeUQC	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00118	Hà Nội	Nguyễn Văn Nghiêm	Nguyễn Văn Khải	20242602	HĐLĐ	BNI	LT	Nhân Viên
814	Trần Minh Trung	Kỹ thuật viên Vận hành CNC	CNC	CNC	2024-04-01	tranminhtrung-hcm@rmg.com.vn	$2b$10$0zBrWtRBKYsnECmXCb9Cfet4g26J166rzLyxtm0c7buMD226R4Fqi	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00119	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00033	HĐLĐ	HCM	LT	Nhân Viên
815	Huỳnh Văn Danh	Công nhân Lắp ráp	Cơ Khí	Lắp ráp	2024-04-01	huynhvandanh-hcm@rmg.com.vn	$2b$10$2YoWoBdoI40AsidezrbFAuqqtPpC1EYMh0VsmcHLZ6sTFGg4fbfKO	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00120	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00062	HĐLĐ	HCM	LT	Công Nhân
816	Lê Văn Đời	Công nhân Cơ khí	Cơ Khí	Cơ khí	2024-04-01	levandoi-hcm@rmg.com.vn	$2b$10$fu0asYzSx6EBjFAFPezJPeW2TjLpkYRHUSArAL0ELKeijStKRiq4q	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00121	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00044	HĐLĐ	HCM	LT	Công Nhân
817	Trịnh Xuân Cường	Công nhân Cơ khí	Cơ Khí	Cơ khí	2024-04-01	trinhxuancuong-hcm@rmg.com.vn	$2b$10$5VhO7W1s0.AXwYogXtuzZ.AYgS4edYvZTd9s7hpFEjaYna5a.dFe6	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00122	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00042	HĐLĐ	HCM	LT	Công Nhân
818	Lâm Chí Liêm	Công nhân Lắp ráp	Cơ Khí	Lắp ráp	2024-04-01	lamchiliem-hcm@rmg.com.vn	$2b$10$KI0eTtrpaT6SWmPOX6/py.uIOakI9.LWrUniJaekuaM1C/KFV86lO	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00123	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00061	HĐLĐ	HCM	LT	Công Nhân
819	Mai Đức Phương	Công nhân Điện	Tự động	Điện	2024-04-01	maiducphuong-hcm@rmg.com.vn	$2b$10$W9nZyn3voyOzt/VNCKGoN.6vdSOamAf5mOjHeBq4cuWwDYm1IOro6	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00124	Hồ Chí Minh	Nguyễn Ngọc Tấn	Bùi Trần Đức Duy	00106	HĐLĐ	HCM	LT	Công Nhân
820	Danh Luyện	Công nhân Lắp ráp	Cơ Khí	Lắp ráp	2024-04-01	danhluyen-hcm@rmg.com.vn	$2b$10$/i1Afeum67jIbhSkf9EDGuDY3LJY4UEgexAbQ8FM4bsONHG1Mbst.	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00125	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00103	HĐLĐ	HCM	LT	Công Nhân
821	Huỳnh Văn Thủy	Công nhân Lắp ráp	CNC	Lắp ráp	2024-05-01	huynhvanthuy-hcm@rmg.com.vn	$2b$10$uS/68920U4jHUrKtUHtNP.H/eTUk6uz9O/UpNisvss95G2zEdvLUq	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00126	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00038	HĐLĐ	HCM	LT	Công Nhân
822	Văn Hoàng Long	Công nhân Lắp ráp	CNC	Lắp ráp	2024-05-01	vanhoanglong-hcm@rmg.com.vn	$2b$10$hcoGiuc0mad95uygBQQKheyZ6Feb3F5TDrvxJM.3ol0bWP5SpCtqi	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00127	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00055	HĐLĐ	HCM	LT	Công Nhân
823	Nguyễn Minh Khang	Kỹ thuật viên Lắp ráp	Tự động	Lắp ráp	2024-05-01	nguyenminhkhang-hcm@rmg.com.vn	$2b$10$FBV5ln9kJ8rpRTYewqX/1eDmzNXGmqxRVJUPy/Ova/1P.QhL6i1om	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00128	Hồ Chí Minh	Đoàn Hoàng Phương	Bùi Trần Đức Duy	00087	HĐLĐ	HCM	LT	Nhân Viên
824	Lê Bảo Long	Kỹ sư Thiết kế Máy	Tự động	Thiết kế	2024-05-13	long-le@rmg.com.vn	$2b$10$prdxPnINyQ/zb6j41lkAlO4xzUlT5FuM3/QlpfCnzhgi20YP6G4UK	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00129	Hồ Chí Minh	Đinh Quang Chúc	Bùi Trần Đức Duy	00021	HĐLĐ	HCM	LT	Chuyên Viên
825	Trần Song Em	Kỹ sư Thiết kế Cơ khí	Thiết kế Cơ khí	Thiết kế	2024-05-13	song-em@rmg.com.vn	$2b$10$s6SPMkC73xEW9Y2NZo9PoOa4ZxZHc7v27Nu6.liktpSMrZ0nfQjui	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00130	Hồ Chí Minh	Trần Văn Tâm	Nguyễn Ngọc Luyễn	00065	HĐLĐ	HCM	LT	Chuyên Viên
826	Nguyễn Đình Thiện	Nhân viên Mua hàng	Mua hàng	Mua hàng	2024-06-03	thien-nguyen@rmg.com.vn	$2b$10$iYBUsSc3XoFZvAsX2bc2vO2CVgsAZK9kUFcCC9xsnwUYDAXL61rVu	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00131	Head Office	Lê Phú Nhân	Nguyễn Hoài Thanh	00085	HĐLĐ	HCM	LT	Nhân Viên
827	Nguyễn Hoài Nam	Kỹ sư Thiết kế Cơ khí	Thiết kế Cơ khí	Thiết kế	2024-06-17	hoai-nam@rmg.com.vn	$2b$10$8L49py1iTWBHkaM5/SLs0Op8fow9PI5ooUSCL7ZOgsDF5daUXcKxa	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00132	Hồ Chí Minh	Trần Văn Tâm	Nguyễn Ngọc Luyễn	00083	HĐLĐ	HCM	LT	Chuyên Viên
828	Trần Quang Khá	Kỹ sư Thiết kế Cơ khí	Thiết kế Cơ khí	Thiết kế	2024-06-17	quang-kha@rmg.com.vn	$2b$10$E.5un3tJheuDDc0lwHjtaeKcbjdpTeAK/h2l/C4KmAwFUsYfFHKGG	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00133	Hồ Chí Minh	Trần Văn Tâm	Nguyễn Ngọc Luyễn	00084	HĐLĐ	HCM	LT	Chuyên Viên
829	Nguyễn Thành Đạt	Kỹ sư Thiết kế Cơ khí	Thiết kế Cơ khí	Thiết kế	2024-07-01	thanh-dat@rmg.com.vn	$2b$10$/MTeNi5s6J.OHI7k9OdLpOEzCceJuGM6h5XGV93ow0fejzZVmUNj6	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00134	Hồ Chí Minh	Trần Văn Tâm	Nguyễn Ngọc Luyễn	00086	HĐLĐ	HCM	LT	Chuyên Viên
830	Hoàng Mạnh Đức	Kỹ thuật viên Vận hành CNC	CNC	CNC	2024-07-26	hoangmanhduc-hcm@rmg.com.vn	$2b$10$stimRHeEDjnDN6CZIyad1e1QBRk.uy2McNebAPoTj/se8kxNpKALS	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00135	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00058	HĐLĐ	HCM	LT	Nhân Viên
831	Phạm Thanh Nam	Công nhân Cơ khí	Cơ Khí	Cơ khí	2024-07-26	phamthanhnam-hcm@rmg.com.vn	$2b$10$.ZNosR65zmsTUfV0P/.lcOFbCBq0R5K8/u5kMqXw76QINXmJqkJzW	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00136	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00045	HĐLĐ	HCM	LT	Công Nhân
832	Trịnh Xuân Vinh	Kỹ thuật viên Kết cấu	Sản xuất	Kết cấu	2024-07-26	trinhxuanvinh-qn@rmg.com.vn	$2b$10$cDpdPUbz4XXciDHLi8OA6.XIeA5mSpPcUzI06icugRdtqQQ3rhKJ2	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00137	Quảng Ngãi	Nguyễn Tài Viễn	Châu Quang Hải	BRT0013	HĐLĐ	QNG	LT	Nhân Viên
833	Nguyễn Hoàng Đức	Nhân viên Mua hàng	Mua hàng	Mua hàng	2024-07-26	duc-hoang@rmg.com.vn	$2b$10$W7t6GNz7IPHtSyM4STkKgusyTZYmFDCiSZmOvgnCD1jSqQZcbfw7G	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00138	Head Office	Lê Phú Nhân	Nguyễn Hoài Thanh	00076	HĐLĐ	HCM	LT	Nhân Viên
834	Nguyễn Đức Cảnh	Kỹ thuật viên Lắp ráp	Tự động	Lắp ráp	2024-08-01	canh-nguyen@rmg.com.vn	$2b$10$aB9TsLiCTsU3USfCx8wyGOfvmqMW8O/.F9q4W5OX8axastTMk91dC	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00139	Hồ Chí Minh	Đoàn Hoàng Phương	Bùi Trần Đức Duy	00097	HĐLĐ	HCM	LT	Nhân Viên
835	Lê Văn Vương	Kỹ sư Dịch vụ kỹ thuật	Dịch vụ Kỹ thuật	DVKT	2024-08-01	vuong-le@rmg.com.vn	$2b$10$H0wWRKDGxta5Z5gcmHTh5udLmVRLf7N.fLCyGGIuP4tJFev94g8tK	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00140	Head Office	Hoàng Đình Sạch	Lê Thanh Tùng	\N	HĐLĐ	HCM	LT	Chuyên Viên
836	Ngô Quốc Toàn	Kỹ thuật viên Vận hành CNC	CNC	CNC	2024-08-08	ngoquoctoan-hcm@rmg.com.vn	$2b$10$khnbqQRZd116tHAj3rsm1ucndI3Uskj9rBc5DW3s4uE.Zf/s5tO3K	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00141	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00091	HĐLĐ	HCM	LT	Nhân Viên
837	Hà Công Thành	Nhân viên Bảo vệ	Hành chính Nhân sự	HCNS	2024-08-19	hacongthanh-hcm@rmg.com.vn	$2b$10$KG1BlqQ20/J5PzTkWH3rEuvGPErr4P4vB1K1FTyuVxefFQIvOK77.	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00142	Hồ Chí Minh	Võ Thị Hồng Nhi	Nguyễn Ngọc Luyễn	\N	HĐLĐ	HCM	LT	Nhân Viên
838	Nguyễn Đức Tuấn	Trưởng nhóm CNC	Sản xuất	CNC	2024-08-19	nguyenductuan-hn@rmg.com.vn	$2b$10$H27gXaEJ17/TFhbogz6QOuCX7VzjY1RGJP9jtw7EyD/wdn1MWsOgm	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00143	Hà Nội	Nguyễn Văn Nghiêm	Nguyễn Văn Khải	20240819	HĐLĐ	BNI	LT	Trưởng Nhóm
839	Trương Quốc Đạt	Kỹ thuật viên Lắp ráp	Tự động	Lắp ráp	2024-08-26	dat-truong@rmg.com.vn	$2b$10$nnvRsX19pzKsSq5TKbvI9uTPqdfzFrBAq0vLhbmGTgG8jTMwyVk6S	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00144	Hồ Chí Minh	Đoàn Hoàng Phương	Bùi Trần Đức Duy	00013	HĐLĐ	HCM	LT	Nhân Viên
840	Nguyễn Khang Điền	Kỹ thuật viên Lắp ráp	Tự động	Lắp ráp	2024-08-26	dien-nguyen@rmg.com.vn	$2b$10$YvCJHEs/mffouLBna.Kj2uRHze2eWuogAihCGEyAy2vbxSoEmA8qK	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00145	Hồ Chí Minh	Đoàn Hoàng Phương	Bùi Trần Đức Duy	00073	HĐLĐ	HCM	LT	Nhân Viên
841	Lê Văn Danh	Kỹ sư Thiết kế Máy	Tự động	Thiết kế	2024-09-12	danh-le@rmg.com.vn	$2b$10$ZFoKuR0.WD7kELCh6LusGON2HhhyHz5abK88gn0gnJ8ImgSFDtVnK	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00146	Hồ Chí Minh	Đinh Quang Chúc	Bùi Trần Đức Duy	00099	HĐLĐ	HCM	LT	Chuyên Viên
842	Nguyễn Tiến Khoa	Kỹ sư Điện	Kỹ thuật	Điện	2024-09-17	khoa-nguyen@rmg.com.vn	$2b$10$.i5iPd9pcOXRCxLO8yF2mO1.WKrFqyuq8jgyuDCl1zAUTvK2ADOim	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00147	Quảng Ngãi	Nguyễn Tài Viễn	Châu Quang Hải	BRT0002	HĐLĐ	QNG	LT	Chuyên Viên
843	Phạm Văn Tính	Kỹ thuật viên CNC	Sản xuất	CNC	2024-10-28	phamvantinh-qn@rmg.com.vn	$2b$10$TNlyt5/ktIeT.DNOeZJah.EkkU9RFT5Ntfz5lQSn2Y/48gBeOJLum	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00148	Quảng Ngãi	Trương Ngọc Hồng	Nguyễn Tài Viễn	BRT0023	HĐLĐ	QNG	LT	Nhân Viên
844	Nguyễn Hoài Thanh	Trưởng phòng Mua hàng	Mua hàng	Mua hàng	2024-12-01	hoai-thanh@rmg.com.vn	$2b$10$JQe/CxjSrOqOTt8yJ3Kjoe3.5KG96HxM6xBwuj8ZigjoZ8PTdP0JG	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00149	Head Office	Lê Thanh Tùng	Lê Thanh Tùng	\N	HĐLĐ	HCM	LT	Trưởng Phòng
845	Trần Anh Quốc	Kỹ sư Bán hàng	Kinh doanh	Kinh Doanh	2024-12-16	quoc-tran@rmg.com.vn	$2b$10$5fPxy22g2HqzjexLu49BaOBC9uZEVWaTM9KIJ/0rhKBE5xGGl7p1W	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00150	Hồ Chí Minh	Nguyễn Ngọc Minh Tuấn	Nguyễn Ngọc Luyễn	\N	HĐLĐ	HCM	LT	Chuyên Viên
846	Nguyễn Văn Long	Kỹ sư Thiết kế	Kỹ thuật	Thiết kế	2024-12-17	long-nguyenhn@rmg.com.vn	$2b$10$fZZ20v.Yqy1DqBD5tfaS/.lKyT4fRCtlfHLZ7EK6Jhb3nvm9R/FCW	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00151	Hà Nội	Phạm Văn Hưng	Nguyễn Văn Nghiêm	20241712	HĐLĐ	BNI	LT	Chuyên Viên
847	Nguyễn Anh Đạt	Kỹ sư Bán hàng	Kinh doanh	Kinh Doanh	2024-12-23	anh-dat@rmg.com.vn	$2b$10$KCI9nScrkR.mqA4s5oeaAumbDzko92UO37JAHdEOpE91zO6cs68yy	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00152	Hồ Chí Minh	Nguyễn Ngọc Minh Tuấn	Nguyễn Ngọc Luyễn	\N	HĐLĐ	HCM	LT	Chuyên Viên
848	Lê Thị Thanh Nguyên	Nhân viên Mua hàng	Mua hàng	Mua hàng	2025-01-06	nguyen-le@rmg.com.vn	$2b$10$qDgBguKkB9o6ln8Y7Hw9.uOsHLkn/atvotaopCnnGcpS6BBSbtVly	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00153	Head Office	Lê Phú Nhân	Nguyễn Hoài Thanh	00102	HĐLĐ	HCM	LT	Nhân Viên
849	Nguyễn Thị Mỹ Duyên	Nhân viên Kho	Vận hành	Kho vận	2025-02-06	duyen-nguyenqn@rmg.com.vn	$2b$10$tnSv0CAsToa9DG9hBq2UTuC9sP8S6TGtFkaH9/a.Yzihj/HLRHJ1m	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00154	Quảng Ngãi	Châu Quang Hải	Huỳnh Phúc Văn	BRT0025	HĐLĐ	QNG	LT	Nhân Viên
850	Trần Hữu Long	Kỹ thuật viên Vận hành CNC	Sản xuất	CNC	2025-02-07	tranhuulong-hn@rmg.com.vn	$2b$10$ePylnIgxbiDENamxIDJ8.epd/ObiRpbIZy9vVrvG5NRazbpJrWU..	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00155	Hà Nội	Nguyễn Đức Tuấn	Nguyễn Văn Nghiêm	20250702	HĐLĐ	BNI	LT	Nhân Viên
851	Nguyễn Thị Bình	Nhân viên Điều phối Kinh doanh	Kinh doanh	Kinh Doanh	2025-02-10	binh-nguyenhn@rmg.com.vn	$2b$10$CVOsjD3GQv4WHNfnXboaIONVMzQfEZGiD3PjmAtSJewrmPZdtStTW	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00156	Hà Nội	Nguyễn Văn Khải	Nguyễn Văn Khải	20251002	HĐLĐ	BNI	LT	Nhân Viên
852	Nguyễn Thanh Đức	Kỹ sư Thiết kế	Kỹ thuật	Thiết kế	2025-04-01	duc-nguyenqn@rmg.com.vn	$2b$10$ceyKiSzqYY3HVqh.Ev8UUOd9s4zSzrOKDFmHlB0ZW9lXeVKn/xuQO	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00157	Quảng Ngãi	Nguyễn Tài Viễn	Châu Quang Hải	BRT0028	HĐLĐ	QNG	LT	Chuyên Viên
853	Hoàng Ngọc Minh	Công nhân Lắp ráp	Tự động	Lắp ráp	2025-04-01	hoangngocminh-hcm@rmg.com.vn	$2b$10$mNf3jUFjPSeL3Rq6jokp1uDnP7SeDlqT0BP1SuWSb6vLJVi2MZEpK	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00158	Hồ Chí Minh	Đoàn Hoàng Phương	Bùi Trần Đức Duy	00108	HĐLĐ	HCM	LT	Công Nhân
854	Trần Đức Vân	Công nhân Lắp ráp	Tự động	Lắp ráp	2025-04-01	tranducvan-hcm@rmg.com.vn	$2b$10$9XHEXuVhvKE3U6KmXdMEJe9G/A7JK14y/G3R0Y74ccz31STZgiKXG	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00159	Hồ Chí Minh	Đoàn Hoàng Phương	Bùi Trần Đức Duy	00109	HĐLĐ	HCM	LT	Công Nhân
855	Lê Thị Tuyết Ngân	Nhân viên Điều phối Kinh doanh	Kinh doanh	Kinh Doanh	2025-04-01	tuyetngan-hcm@rmg.com.vn	$2b$10$aNFhfCK2uyAWa8Y3w5fNtO6HNg9HsK7O2XAtVr4wFEgS35L/wZW1G	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00160	Hồ Chí Minh	Nguyễn Ngọc Minh Tuấn	Nguyễn Ngọc Luyễn	00110	HĐLĐ	HCM	LT	Nhân Viên
856	Cao Quang Ba	Công nhân Cơ khí	Cơ Khí	Cơ khí	2025-04-01	caoquangba-hcm@rmg.com.vn	$2b$10$zSM6njNaj1t8iQQtZlLSjuWxjVatJq8qk5gY2MB.Ql2vOOuDJ.wKO	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00161	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00015	HĐLĐ	HCM	LT	Công Nhân
857	Huỳnh Phạm Bách Đô	Công nhân Cơ khí	Cơ Khí	Cơ khí	2025-04-01	huynhphambachdo-hcm@rmg.com.vn	$2b$10$9OO0ug00PfWTTXhHXuh3nebfme50rRotU/fwjBFTv987ku4jwDfLa	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00162	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00023	HĐLĐ	HCM	LT	Công Nhân
858	Trịnh Hoàng Hải	Công nhân Cơ khí	Cơ Khí	Cơ khí	2025-04-01	trinhhoanghai-hcm@rmg.com.vn	$2b$10$QtXSCUeHO5mgq5GPQXzipe29zU6F6vkvmM0LSTWnEOjfgMoBGykBm	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00163	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00026	HĐLĐ	HCM	LT	Công Nhân
859	Lê Quang Khá	Công nhân Kết cấu	Sản xuất	Kết cấu	2025-04-01	lequangkha-qn@rmg.com.vn	$2b$10$d0DHInuDmRuddxfZywMfauKEXIS7Ae8DkbYSNJgFLTSGznV9Mn2N2	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00164	Quảng Ngãi	Nguyễn Tài Viễn	Nguyễn Tài Viễn	BRT0022	HĐLĐ	QNG	LT	Công Nhân
860	Trần Ngọc Vinh	Nhân viên Khuôn in	Sản xuất	Khuôn in	2025-04-21	tranngocvinh-hn@rmg.com.vn	$2b$10$wkQ4KEO43IbwMaur2n8TkuFha2O0nw.XvEB08hsAiovYtyV29r92K	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00165	Hà Nội	Bùi Đăng Sủng	Nguyễn Văn Nghiêm	20252104	HĐLĐ	BNI	LT	Nhân Viên
861	Nguyễn Duy Bắc	Kỹ thuật viên Vận hành CNC	Sản xuất	CNC	2025-05-12	nguyenduybac-hn@rmg.com.vn	$2b$10$wGvvlC5ByhnvJMRSin77eOTJF/Ma0bAm38layu1.MdW.GovVYbjNu	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00166	Hà Nội	Nguyễn Đức Tuấn	Nguyễn Văn Nghiêm	20251205	HĐLĐ	BNI	LT	Nhân Viên
862	Nguyễn Thọ Phương	Nhân viên Khuôn in	Sản xuất	Khuôn in	2025-05-12	phuong-nguyen@rmg.com.vn	$2b$10$Jytobwj7q0xCZsX6S3iLqeGoIhegV6Y0YDibPmk/Zul9CyI3Cmf3O	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00167	Hà Nội	Bùi Đăng Sủng	Nguyễn Văn Nghiêm	20250505	HĐLĐ	BNI	LT	Nhân Viên
863	Vũ Văn Thắng	Kỹ thuật viên Vận hành CNC	Sản xuất	CNC	2025-05-26	vuvanthang-hn@rmg.com.vn	$2b$10$uwDEi7VY6957ZMPM6b8eMetX8DyZynkZorcuZWPMfKGgo7BCsLeeC	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00168	Hà Nội	Nguyễn Đức Tuấn	Nguyễn Văn Nghiêm	20252605	HĐLĐ	BNI	LT	Nhân Viên
864	Bùi Thúy An	Phó nhóm Lắp ráp CNC	Sản xuất	CNC	2025-06-03	an-bui@rmg.com.vn	$2b$10$70tXDTQ2GrVKfO.Y66R6aOZtRKsAniKktSRK/PX/Bau9HirgzlRfW	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00169	Hà Nội	Nguyễn Đức Tuấn	Nguyễn Văn Nghiêm	20250306	HĐLĐ	BNI	LT	Phó Nhóm
865	Lê Nhật Trường	Kỹ thuật viên Dịch vụ điện tử	Dịch Vụ Điện Tử	DVĐT	2025-06-10	truong-le@rmg.com.vn	$2b$10$xi/lfJyf37xOky.m93Q2..caenpmdLjxw3sgUVCBZjAyHWC9QEJ.y	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00170	Head Office	Huỳnh Công Tưởng	Huỳnh Phúc Văn	00115	HĐLĐ	HCM	LT	Nhân Viên
866	Nông Thanh Nguyễn	Kỹ thuật viên Vận hành CNC	Sản xuất	CNC	2025-06-23	nongthanhnguyen-hn@rmg.com.vn	$2b$10$hWwYd5ctCyVOd2Q09uOgkeeGT6g7EJubjtBjyFOXfYno/Tv6e1Oym	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00171	Hà Nội	Nguyễn Đức Tuấn	Nguyễn Văn Nghiêm	20252306	HĐLĐ	BNI	LT	Nhân Viên
867	Nguyễn Tấn Tùng	Kỹ thuật viên CNC	Sản xuất	CNC	2025-07-01	nguyentantung-qn@rmg.com.vn	$2b$10$FmAWA5l1Np0rfHIjmmWhme72BaBgy0coiS71b2BG9TPGx5g4.TG7m	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00172	Quảng Ngãi	Trương Ngọc Hồng	Nguyễn Tài Viễn	BRT0031	HĐLĐ	QNG	LT	Nhân Viên
868	Nguyễn Kế Trọng	Kỹ sư Thiết kế	Kỹ thuật	Thiết kế	2025-07-14	trong-nguyen@rmg.com.vn	$2b$10$yn9GWKaq4G3ixebiU3RV9.bcJCEDbd8J6JByljvdYaIblAtKCukVa	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00174	Hà Nội	Phạm Văn Hưng	Nguyễn Văn Nghiêm	20251407	HĐLĐ	BNI	LT	Chuyên Viên
869	Lê Thị Quỳnh	Nhân viên Khuôn in	Sản xuất	Khuôn in	2025-07-21	lethiquynh-hn@rmg.com.vn	$2b$10$kABoctjw8T39XPUC6Ggc2eqStzE7difaKeXVPfQFalPEnsP9ZlPP2	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00175	Hà Nội	Bùi Đăng Sủng	Nguyễn Văn Nghiêm	20250721	HĐLĐ	BNI	LT	Nhân Viên
870	Lê Tuấn Anh	Kỹ sư Tự động	Kỹ thuật	Tự động	2025-07-21	letuananh-hn@rmg.com.vn	$2b$10$fPqu1t1JZUYOrvWc6evqbOZPg625LnZYXV5omMOAYXdRZWd0xUbau	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00176	Hà Nội	Nguyễn Văn Nghiêm	Nguyễn Văn Khải	20252107	HĐLĐ	BNI	LT	Chuyên Viên
871	Vũ Thị Mai Phương	Nhân viên Mua hàng	Vận hành	Mua hàng	2025-07-23	phuong-vu@rmg.com.vn	$2b$10$sEARUjJTiv4c/LqFQVVQyu3uXeIT9eddl064gQxsxdKFDIBj0NCeG	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00177	Hà Nội	Nguyễn Văn Nghiêm	Lê Hoài Thanh	20252307	HĐLĐ	BNI	LT	Nhân Viên
872	Chu Đức Định	Kỹ sư Bán hàng	Kinh doanh	Kinh Doanh	2025-07-25	ducdinh@rmg.com.vn	$2b$10$L2Z46erTTnK9R8ld4KgZauIYzX.Me0iJNxcrDiZqidifTtjmWluR2	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00178	Hà Nội	Nguyễn Văn Khải	Nguyễn Văn Khải	\N	HĐLĐ	BNI	LT	Chuyên Viên
873	Dương Gia Huy	Công nhân Lắp ráp	Tự động	Lắp ráp	2025-07-26	duonggiahuy-hcm@rmg.com.vn	$2b$10$RrbFlnthVhe.akzv2IMsCejJ1f13F0dPVfrEhpm3YQ/zGtky3ZSpq	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00179	Hồ Chí Minh	Đoàn Hoàng Phương	Bùi Trần Đức Duy	00052	HĐLĐ	HCM	LT	Công Nhân
874	Trần Thái Quyền	Nhân viên lắp ráp CNC	CNC	CNC	2025-07-26	tranthaiquyen-hcm@rmg.com.vn	$2b$10$JjI9DJmRkyKFHy6WTDPil.woqN2LMraKdXCP2.mLt.18fNdBfaw02	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00180	Hồ Chí Minh	Đoàn Hoàng Phương	Bùi Trần Đức Duy	00056	HĐLĐ	HCM	LT	Nhân Viên
875	Trịnh Thị Hương	Chuyên viên Kế toán Tổng hợp	Kế toán	Kế toán	2025-07-28	huong-trinh@rmg.com.vn	$2b$10$vBgd1jdsRVEUZY59f/I5rOR.NGk1UhD1zHKFKYZEf9H9H61SknU5.	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00181	Head Office	Nguyễn Thị Ngọc Thúy	Lê Thanh Tùng	\N	HĐLĐ	VP HCM	LT	Chuyên Viên
876	Phạm Nguyễn Phước Đức	Công nhân Điện	Tự động	Điện	2025-07-28	phamnguyenphuocduc-hcm@rmg.com.vn	$2b$10$pYHnf.G/M7DiRn1gB4or4uQQtuW4fhYwTt0LaHAL/Q0EHvVWeSzgW	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00182	Hồ Chí Minh	Nguyễn Ngọc Tấn	Bùi Trần Đức Duy	00082	HĐLĐ	HCM	LT	Công Nhân
877	Bùi Thanh Phong	Công nhân Kết cấu	Sản xuất	Kết cấu	2025-07-28	buithanhphong-qn@rmg.com.vn	$2b$10$8BBVLQ1kp.tpftqGhPjg6e7WnD6Rt9BGsc3kWjKnM71kmHKEAf2uC	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00183	Quảng Ngãi	Nguyễn Tài Viễn	Nguyễn Tài Viễn	BRT0030	HĐLĐ	QNG	LT	Công Nhân
878	Trịnh Thị Xuân Hoa	Kỹ sư Bán hàng	Kinh doanh	Kinh Doanh	2025-08-01	hoa-trinh@rmg.com.vn	$2b$10$IICkC.Evk8raEiypMjjC7OCvcaLANTXg/64A9ICj.wjoGpD3skFqW	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00184	Hà Nội	Nguyễn Văn Khải	Nguyễn Văn Khải	\N	HĐLĐ	BNI	LT	Chuyên Viên
879	Nguyễn Viết Quân	Kỹ sư Dịch vụ kỹ thuật	Dịch vụ Kỹ thuật	DVKT	2025-08-14	nguyenvietquan-ho@rmg.com.vn	$2b$10$DoH/5J50Dx3fuqvm3gcxv.aUaI4MCg/RcZ3zn2hbNYVPYQBB6kt32	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00185	Head Office	Hoàng Đình Sạch	Lê Thanh Tùng	\N	HĐLĐ	HCM	LT	Chuyên Viên
880	Lương Quốc Hạ	Kỹ thuật viên Vận hành CNC	Sản xuất	CNC	2025-08-18	luongquocha-hn@rmg.com.vn	$2b$10$2x/vqSi1d7biRrWkfrJYXufpYZM1AiBBboUuxZDR5nmZRzcMFz3Bi	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00187	Hà Nội	Nguyễn Đức Tuấn	Nguyễn Văn Nghiêm	18082502	HĐLĐ	BNI	LT	Nhân Viên
881	Tô Thanh Mạnh	Kỹ thuật viên Vận hành CNC	Sản xuất	CNC	2025-08-19	tothanhmanh-hn@rmg.com.vn	$2b$10$tTR3F/2/VNCa8gor9ps4VOGir0rf6Psur9GdnUQ80N.bRq.yZf24W	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00189	Hà Nội	Nguyễn Đức Tuấn	Nguyễn Văn Nghiêm	19082501	HĐLĐ	BNI	LT	Nhân Viên
882	Nguyễn Văn Nghiêm	Kỹ sư Điện	Kỹ thuật	Điện	2025-08-19	nghiem-nguyen-qn@rmg.com.vn	$2b$10$VHzbQSRyCj/2r5QF/NNthuRZw/Z4aFSnjyLJxxkMRpme8BluPm3wa	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00190	Quảng Ngãi	Nguyễn Tài Viễn	Châu Quang Hải	BRT0033	HĐLĐ	QNG	LT	Chuyên Viên
883	Vi Văn Thương	Kỹ thuật viên Cơ khí	Sản xuất	Cơ khí	2025-08-20	vivanthuong-hn@rmg.com.vn	$2b$10$VXxkDxRBFwSRAVRAfWV4We./zb3XXRLCMJn2Xo2fsoAL5l/TR8ijG	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00191	Hà Nội	Bùi Đăng Sủng	Nguyễn Văn Nghiêm	200825	HĐLĐ	BNI	LT	Nhân Viên
884	Phan Đức Thắng	Kỹ thuật viên Vận hành CNC	Sản xuất	CNC	2025-08-23	phanducthang-hn@rmg.com.vn	$2b$10$y/NeFV7YUt5RAteJ7ZVf9eOMk1q99F8yuBHDOoezw3E3XAwY7dWIK	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00192	Hà Nội	Nguyễn Đức Tuấn	Nguyễn Văn Nghiêm	25082025	HĐLĐ	BNI	LT	Nhân Viên
885	Nguyễn Chí Thành	Kỹ thuật viên Lắp ráp	Tự động	Lắp ráp	2025-08-25	nguyenchithanh-hcm@rmg.com.vn	$2b$10$yanmMIOhlFRQL4VA7MvQS.zBfQG6/GM/t1W1ZqwoW6LM6R108qXnG	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00193	Hồ Chí Minh	Đoàn Hoàng Phương	Bùi Trần Đức Duy	00092	HĐLĐ	HCM	LT	Nhân Viên
886	Vương Bội Kim	Nhân viên Kế toán Nội bộ	Kế toán	Kế toán	2025-08-25	boikimkt@rmg.com.vn	$2b$10$wXMpVEjWZRZIBU73.9TxJOYlInmGNnuaYbxt6w6o.kxsPmBRvz03W	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00194	Head Office	Nguyễn Thị Ngọc Thúy	Lê Thanh Tùng	\N	HĐLĐ	VP HCM	LT	Chuyên Viên
887	Nguyễn Thị Mỹ Duyên	Nhân viên Kế toán Nhập liệu	Kế toán	Kế toán	2025-08-25	myduyenkt@rmg.com.vn	$2b$10$8hrcQUydelYod4MGg8RRguBI2fvJJCUfDRsaqw7kWDuv31FQs27Nu	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00195	Head Office	Nguyễn Thị Ngọc Thúy	Lê Thanh Tùng	\N	Thử Việc	VP HCM	10%	Nhân Viên
888	Nguyễn Quang Huy	Kỹ thuật viên Cơ khí	Sản xuất	Cơ khí	2025-08-26	nguyenquanghuy-hn@rmg.com.vn	$2b$10$79p3AmDAjBWp5AQTjCsu2.ngS27AY9mfeBU2RC763Qv6w02rTGCja	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00197	Hà Nội	Bùi Đăng Sủng	Nguyễn Văn Nghiêm	26082025	HĐLĐ	BNI	LT	Nhân Viên
889	Lê Thế Thanh	Công nhân Lắp ráp	Tự động	Lắp ráp	2025-08-26	\N	$2b$10$9.pWRKsGoMGNNSwgJZ15jeblX9dkSPD1bCGa4aT99AijV1k.fj89y	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00198	Hồ Chí Minh	Đoàn Hoàng Phương	Bùi Trần Đức Duy	\N	Thử Việc	HCM	10%	Công Nhân
890	Đặng Đức Lợi	Công nhân Điện	Tự động	Điện	2025-08-26	dangducloi-hcm@rmg.com.vn	$2b$10$dGGIN0dxJOAOjTkiMwPzyuiq170XtDNS8gxPAGx65WE9XNx37/1y6	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00199	Hồ Chí Minh	Nguyễn Ngọc Tấn	Bùi Trần Đức Duy	00089	HĐLĐ	HCM	LT	Công Nhân
891	Võ Thị Kim Duyên	Nhân viên Mua hàng	Mua hàng	Mua hàng	2025-08-27	duyenvo-buyer@rmg.com.vn	$2b$10$jVYbXnvf6Dt2Y8yXMZTuOO2xBwD1y1ZgeeT/AK3VSqGWjb1.yMbVC	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00202	Hồ Chí Minh	Lê Phú Nhân	Nguyễn Hoài Thanh	\N	Thực Tập	HCM	10%	Nhân Viên
892	Nguyễn Nhân Hậu	Kỹ thuật viên Lắp ráp	Tự động	Lắp ráp	2025-08-28	\N	$2b$10$NQYXNAzLZkAfg6u72xa1gONdPZR/YbjpJXHyrMpClHIulJ5y2IEeG	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00203	Hồ Chí Minh	Đoàn Hoàng Phương	Bùi Trần Đức Duy	00093	Thử Việc	HCM	10%	Nhân Viên
893	Quách Hoàng Thị Hồng Ấn	Nhân viên Điều phối	Tự động	Vận hành	2025-09-03	hongan@rmg.com.vn	$2b$10$ZZDUFuJH3k.nvC18xiQdyOjsuHbWHvgzdkp/rF15sI6k0WIQhr6q6	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00206	Hồ Chí Minh	Bùi Trần Đức Duy	Nguyễn Ngọc Luyễn	00095	HĐLĐ	HCM	LT	Nhân Viên
894	Nguyễn Tuấn Dương	Kỹ sư Điện Tự động	Kỹ thuật	Tự động	2025-09-05	duong-nguyen@rmg.com.vn	$2b$10$nJgbx.EqPAXONc1Hu1hWX.jZSe0xBPXJwqJkTb9Sf4tomR1v88nV2	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00209	Hà Nội	Nguyễn Văn Nghiêm	Nguyễn Văn Khải	20250905	Thử Việc	BNI	10%	Chuyên Viên
895	Cao Danh Hiệu	Công nhân Kết cấu	Sản xuất	Kết cấu	2025-09-05	caodanhhieu-qn@rmg.com.vn	$2b$10$oc2lrh1oLd191h9Sbv6dY.ZOtxVa6tX7ZvPQIfR9Lxguu7LBo6FkC	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00210	Quảng Ngãi	Nguyễn Tài Viễn	Nguyễn Tài Viễn	BRT0036	HĐLĐ	QNG	LT	Công Nhân
896	Nguyễn Thiện Hào	Kỹ sư Thiết kế	Kỹ thuật	Thiết kế	2025-09-08	nguyenthienhao-hn@rmg.com.vn	$2b$10$zwb1GrwZb8xHXw8RinQ/2.BwqT.hsydvwDUgzjs..StPoebteFmBa	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00211	Hà Nội	Phạm Văn Hưng	Nguyễn Văn Nghiêm	20250908	HĐLĐ	BNI	LT	Chuyên Viên
897	Hoàng Văn Minh	Kỹ thuật viên Cơ khí	Sản xuất	Cơ khí	2025-09-09	hoangvanminh-hn@rmg.com.vn	$2b$10$AdVf3aT0iHQhUzYLuqM0Aet1VJsvpzwS0G9Dyug9WDzOYQmPa1ogi	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00212	Hà Nội	Bùi Đăng Sủng	Nguyễn Văn Nghiêm	20250909	HĐLĐ	BNI	LT	Nhân Viên
898	Nguyễn Huỳnh Quốc Thắng	Công nhân CNC	CNC	CNC	2025-09-09	nguyenhuynhquocthang-hcm@rmg.com.vn	$2b$10$lCByemy6pIaboj/uxFO39.k5hjeOqYV.QYAgS6a2TFNp1WoSy4UAe	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00213	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00098	HĐLĐ	HCM	LT	Công Nhân
899	Lê Quang Phú	Công nhân CNC	CNC	CNC	2025-09-09	\N	$2b$10$3fxaZ1ooZsQ/kgBBuNINDeAaHJFvup2u729U5RCA2BUxzyYb.w/mG	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00214	Hồ Chí Minh	Cái Huy Ân	Nguyễn Ngọc Luyễn	00100	HĐLĐ	HCM	LT	Công Nhân
900	Ngô Hồng Thao	Công nhân Cơ khí	Cơ Khí	Cơ khí	2025-09-10	\N	$2b$10$a9w9lkUa1GvUSVg69Qt4IuUTaC2AuuaDojmh4t85CRZDgr9FNSBda	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00216	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00104	Thời Vụ	HCM	10%	Công Nhân
901	Trần Xuân Tiến	Công nhân Lắp ráp	Cơ Khí	Lắp ráp	2025-09-15	tranxuantien-hcm@rmg.com.vn	$2b$10$6erJsxq7luqACWybyPpk8ehfaUjFXaaYJUVh/atb3UDwRk39r2y2y	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00219	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00107	HĐLĐ	HCM	LT	Công Nhân
902	Nguyễn Đình Vũ	Kỹ sư Quản lý chất lượng	Quản lý chất lượng	QA	2025-09-17	vu-nguyen@rmg.com.vn	$2b$10$lWClCE8FV00oeTlfSb87EubMWy05Et5u2r6NLRGhdBsLZU/esxfHG	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00220	Head Office	Huỳnh Phúc Văn	Lê Thanh Tùng	00112	HĐLĐ	HCM	LT	Chuyên Viên
903	Phan Thế Thịnh	Công nhân Kết cấu	Sản xuất	Kết cấu	2025-09-18	phanthethinh-qn@rmg.com.vn	$2b$10$/VgfqDAzovvr7c3Lw37H4.rP3GraiaVeIlQgbdnJxx8SXqa4e1wFa	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00222	Quảng Ngãi	Nguyễn Tài Viễn	Nguyễn Tài Viễn	BRT0037	Thực Tập	QNG	10%	Công Nhân
904	Nguyễn Hữu Khải	Công nhân Kết cấu	Sản xuất	Kết cấu	2025-09-18	nguyenhuukhai-qn@rmg.com.vn	$2b$10$C8fvqwOuurod37irz8CcKeZt01z.7c6PF6PZI86E/dcV0/QBxx6wq	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00223	Quảng Ngãi	Nguyễn Tài Viễn	Nguyễn Tài Viễn	BRT0038	Thực Tập	QNG	10%	Công Nhân
905	Trần Quang Huy	Công nhân Kết cấu	Sản xuất	Kết cấu	2025-09-19	tranquanghuy-qn@rmg.com.vn	$2b$10$Dq7JltfmZtiTk5it1z5mOuOXGz92utcGafbgEYRSRrdoUwK6.mSbS	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00225	Quảng Ngãi	Nguyễn Tài Viễn	Nguyễn Tài Viễn	BRT0040	Thử Việc	QNG	10%	Công Nhân
906	Hà Văn Hoàng	Kỹ thuật viên Cơ khí	Sản xuất	Cơ khí	2025-09-20	havanhoang-hn@rmg.com.vn	$2b$10$Bhd6V5ceDnfXWDyKihNXAua84cfAYhXa50E4aKohsyVjbGwRKcHjy	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00226	Hà Nội	Bùi Đăng Sủng	Nguyễn Văn Nghiêm	20240440	HĐLĐ	BNI	LT	Nhân Viên
907	Nguyễn Sỹ Chính	Công nhân Cơ khí	Cơ khí	Cơ khí	2025-09-26	nguyensychinh-hcm@rmg.com.vn	$2b$10$BZ5oxdcNuXYzJ94MdkmnR.1aSmonBVKeK8pMxBMYzbwkt0cvdKv8W	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00227	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00114	Thử Việc	HCM	10%	Công Nhân
908	Trần Đình Cung	Công nhân Điện	Kỹ thuật	Điện	2025-09-26	trandinhcung-qn@rmg.com.vn	$2b$10$VzaCJmiLixtUDG5nxUY5cerl4.NRNlcS1HilCxAh7m/Qql8Sh6uW.	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00228	Quảng Ngãi	Nguyễn Tài Viễn	Châu Quang Hải	BRT0041	Thử Việc	QNG	10%	Công Nhân
909	Trương Lê Quỳnh Trang	Nhân viên Kế toán Nhập liệu	Kế toán	Kế toán	2025-09-26	trang-truong@rmg.com.vn	$2b$10$TaHurjgwE1s495Z0viYzMO7oS4TxMDBIZBPEgHC/ygwxmb3idoBpG	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00229	Head Office	Nguyễn Thị Ngọc Thúy	Lê Thanh Tùng	\N	Thời Vụ	VP HCM	10%	Nhân Viên
910	Lô Xuân Quang	Kỹ thuật viên Cơ khí	Sản xuất	Cơ khí	2025-09-30	loxuanquang-hn@rmg.com.vn	$2b$10$SOTh.EC0qNAcvuu3mMKzbu.ApC5NvoD4WaIdVh.pwsgGc525cVmR2	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00230	Hà Nội	Bùi Đăng Sủng	Nguyễn Văn Nghiêm	\N	Thử Việc	BNI	10%	Nhân Viên
911	Diệp Tuấn Khanh	Nhân viên Quản lý chất lượng	Quản lý chất lượng	QA	2025-10-02	dieptuankhanh-ho@rmg.com.vn	$2b$10$X/JDtdLc.GK/LJpCQXgnFOsiNcDwBgEwrQEOIz8Z9slo1s7wcRKaa	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00232	Head Office	Huỳnh Phúc Văn	Lê Thanh Tùng	00116	Thử Việc	HCM	10%	Nhân Viên
912	Nguyễn Trọng Quang	Công nhân Tự động	Kỹ thuật	Tự động	2025-10-03	trongquang-qn@rmg.com.vn	$2b$10$pjd9doXqjBnlwq3WkIi9r.nktmJTBbcAtQj9SqrIZ63plhT1MLc1i	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00233	Quảng Ngãi	Nguyễn Tài Viễn	Châu Quang Hải	BRT0042	Thử Việc	QNG	10%	Công Nhân
913	Triệu Đức Tình	Kỹ thuật viên Cơ khí	Sản xuất	Cơ khí	2025-10-11	trieuductinh-hn@rmg.com.vn	$2b$10$4vRb7EnE1cLsZ67/dZJxkuSAgT3RtA9CwCJh2HNScJ4QrtSaUphNi	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00234	Hà Nội	Bùi Đăng Sủng	Nguyễn Văn Nghiêm	\N	Thử Việc	BNI	10%	Nhân Viên
914	Đặng Khải Phượng	Kỹ thuật viên Cơ khí	Sản xuất	Cơ khí	2025-10-11	dangkhaiphuong-hn@rmg.com.vn	$2b$10$R3vaU77YQ1cIhYWeML9LEu1E6Uz3qb3jlc0BUxgNzwIq3.PCZeHhi	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00235	Hà Nội	Bùi Đăng Sủng	Nguyễn Văn Nghiêm	\N	Thử Việc	BNI	10%	Nhân Viên
915	Đỗ Minh Khang	Công nhân Điện	Tự động	Điện	2025-10-14	dominhkhang-hcm@rmg.com.vn	$2b$10$9wBL.H3q9.oAO.VORRhrbeFnOkZsj2xtRr5v166VDHZ6kNXmTqjWK	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00237	Hồ Chí Minh	Nguyễn Ngọc Tấn	Bùi Trần Đức Duy	00027	Thử Việc	HCM	10%	Công Nhân
916	Đào Văn Long	Kỹ thuật viên Vận hành CNC	Sản xuất	CNC	2025-10-15	daovanlong-hn@rmg.com.vn	$2b$10$hmK997VyzWvSvMz9PeJcpOeawBJ/mYAt4iQ9KVtcWjtdOTNxD5dcO	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00238	Hà Nội	Nguyễn Đức Tuấn	Nguyễn Văn Nghiêm	20251015	Thử Việc	BNI	10%	Nhân Viên
917	Lê Hữu Chung	Công nhân Cơ khí	Cơ khí	Cơ khí	2025-10-15	lehuuchung-hcm@rmg.com.vn	$2b$10$R.O7X0wmHnI9fJTRpS0WveYXBOIqd3RG9DzDQkDFgi8EJDj/8gYTm	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00239	Hồ Chí Minh	Lê Phú Cường	Nguyễn Ngọc Luyễn	00094	Thử Việc	HCM	10%	Công Nhân
918	Trần Minh Thiện	Công nhân Điện	Tự động	Điện	2025-10-21	tranminhthien-hcm@rmg.com.vn	$2b$10$xRJbt.MuyVjYP8YugFtpiuv84iQEyWFnhtGmyneA5Whw.VDfxGb6a	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00240	Hồ Chí Minh	Nguyễn Ngọc Tấn	Bùi Trần Đức Duy	00111	Thử Việc	HCM	10%	Công Nhân
919	Vũ Tuấn Kha	Công nhân Điện	Tự động	Điện	2025-10-22	vutuankha-hcm@rmg.com.vn	$2b$10$Fcqr3iYQSUhEZ8CTDvkeWuOIN7JEMyw9hpS2T4kFPJPTKgGmsro3G	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00241	Hồ Chí Minh	Nguyễn Ngọc Tấn	Bùi Trần Đức Duy	00113	Thử Việc	HCM	10%	Công Nhân
920	Huỳnh Thắng	Công nhân Kết cấu	Sản xuất	Kết cấu	2025-09-27	\N	$2b$10$ClyHVpzBuc8fmh8naYe.7uyw9lDfuPJf3DPfhti2tpFxI6quVaKnO	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00242	Quảng Ngãi	Nguyễn Tài Viễn	Châu Quang Hải	BRT0039	Thử Việc	QNG	10%	Công Nhân
921	Nguyễn Thị Phương Thảo	Nhân viên Vệ sinh	Vận hành	HCNS	2025-11-04	nguyenthiphuongthao-qn@rmg.com.vn	$2b$10$JG0KbGfBimN.WV05fnneqerJj2SZFbnEm4Zn8TvT3fODvM3P.npwC	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00243	Quảng Ngãi	Nguyễn Tài Viễn	Châu Quang Hải	BRT0046	Thử Việc	QNG	10%	Nhân Viên
922	Nguyễn Hiếu Nghĩa	Kỹ sư Dịch vụ kỹ thuật	Vận hành	DVKT	2025-11-21	nguyenhieunghia-ho@rmg.com.vn	$2b$10$dgkJ7.AkOCrqviwTJkblRuN0qPOd.Z7am9Ydvw4Dr42mOwZtGGIU6	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00244	Head Office	Hoàng Đình Sạch	Châu Quang Hải	BRT0047	Thử Việc	QNG	10%	Chuyên Viên
923	Trần Duy Luận	Kỹ sư Quản lý chất lượng	Vận hành	Vận hành	2025-11-25	\N	$2b$10$ZOt91TNArvi9MlHD35n0Yu2Rwtqnhe.DsnJnxQ7aleDUoR3YI4mw2	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00245	Quảng Ngãi	Nguyễn Phúc Văn	Châu Quang Hải	\N	Thử Việc	QNG	10%	Chuyên Viên
924	Nguyễn Đình Mạnh	Kỹ thuật viên Lắp ráp CNC	Sản xuất	CNC	2025-10-27	nguyendinhmanh-hn@rmg.com.vn	$2b$10$A7XnLn0pd0d/aVAWOCrO4.l4gX.rLUnvJnGTvTlT1GtEWA43ybI1G	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00246	Hà Nội	Nguyễn Văn Nghiêm	Nguyễn Văn Khải	\N	Thử Việc	BNI	10%	Nhân Viên
925	Hồ Thị Mỹ Châu	Nhân viên Mua hàng	Vận hành	Mua hàng	2025-10-28	mychau-qn@rmg.com.vn	$2b$10$MTdvLz0BKCIrc91nyUPY6uBeqrrcDeWqhgAlREMujeGjWcXm.XeOu	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00247	Head Office	Châu Quang Hải	Nguyễn Hoài Thanh	BRT0045	Thử Việc	QNG	10%	Nhân Viên
926	Hoàng Văn Hiệu	Kỹ thuật viên Cơ khí	Sản xuất	Cơ khí	2025-11-16	hoangvanhieu-hn@rmg.com.vn	$2b$10$Uqg2uKzi9Z3qVk9lKsev0edzy6tm40f4aNBj3wnyBqN0iTzbnDda6	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00248	Hà Nội	Nguyễn Văn Nghiêm	Nguyễn Văn Khải	\N	Thử Việc	BNI	10%	Nhân Viên
927	Phan Minh Tài	Kỹ thuật viên Dịch vụ điện tử	Dịch Vụ Điện Tử	DVĐT	2025-11-17	tai-phan@rmg.com.vn	$2b$10$1awDFTbwcN99xxu.YmeA3uPLGoQOicjlgofRaz2IXJlKutLKFdJny	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00249	Head Office	Huỳnh Công Tường	Huỳnh Phúc Văn	\N	Thử Việc	HCM	10%	Nhân Viên
928	Trần Bảo Hà	Nhân viên Nhân sự	Hành chính Nhân sự	HCNS	2025-11-12	ha-tran@rmg.com.vn	$2b$10$MfNoeXAPGlX2yRMyUhyk/e5bxX038a8OoCm55p28Z7q3.gKkhrN1S	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00250	Head Office	Lê Thanh Tùng	Lê Thanh Tùng	\N	Thử Việc	VP HCM	10%	Nhân Viên
929	Hoàng Trí Thông	Kỹ sư viên Lắp ráp	Tự động	Lắp ráp	2025-11-10	hoangtrithong-hcm@rmg.com.vn	$2b$10$BLI.Y/a83Jk2n2Mrw3868.Ty63FksnJZFSnr6c1J11he/njkqp2SG	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00251	Hồ Chí Minh	Đoàn Hoàng Phương	Bùi Trần Đức Duy	\N	Thử Việc	HCM	10%	Chuyên Viên
930	Nguyễn Chiến Thắng	Kỹ thuật viên Lắp ráp	Tự động	Lắp ráp	2025-11-18	\N	$2b$10$M1MMK8va06s4Amn.r3BFjO251Zx6TBhAuRiMAG3LyIB1CkPe.n/em	PENDING	2025-12-01 18:17:29.183844	2025-12-01 18:17:29.183844	RMG00252	Hồ Chí Minh	Đoàn Hoàng Phương	Bùi Trần Đức Duy	\N	Thử Việc	HCM	10%	Nhân Viên
\.


--
-- Data for Name: equipment_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.equipment_assignments (id, employee_id, phong_ban, ten_vat_dung, so_luong, trang_thai, ngay_phan_cong, ngay_tra, ghi_chu, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: interview_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.interview_requests (id, candidate_id, manager_id, manager_name, status, notes, created_by, created_at, updated_at, indirect_manager_id, indirect_manager_name, interview_date, interview_time, evaluation_criteria_1, evaluation_criteria_2, evaluation_criteria_3, evaluation_criteria_4, evaluation_criteria_5, evaluation_notes, direct_manager_evaluated, direct_manager_evaluation_data, indirect_manager_evaluated, indirect_manager_evaluation_data) FROM stdin;
\.


--
-- Data for Name: leave_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leave_requests (id, employee_id, team_lead_id, branch_manager_id, request_type, start_date, end_date, reason, notes, status, team_lead_action, team_lead_action_at, team_lead_comment, branch_action, branch_action_at, branch_comment, hr_admin_user_id, escalated_at, due_at, overdue_notified, created_at, updated_at, leave_type) FROM stdin;
\.


--
-- Data for Name: overtime_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.overtime_requests (id, employee_id, team_lead_id, request_date, start_time, end_time, duration, reason, notes, status, team_lead_action, team_lead_action_at, team_lead_comment, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: recruitment_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recruitment_requests (id, manager_id, manager_type, chuc_danh_can_tuyen, so_luong_yeu_cau, phong_ban, nguoi_quan_ly_truc_tiep, mo_ta_cong_viec, loai_lao_dong, ly_do_tuyen, ly_do_khac_ghi_chu, tieu_chuan_tuyen_chon, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: request_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.request_items (id, request_id, item_name, quantity, quantity_provided, status, notes, provided_by, provided_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.requests (id, employee_id, request_type, target_department, title, description, items, status, priority, requested_by, assigned_to, completed_at, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: travel_expense_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.travel_expense_requests (id, employee_id, title, purpose, location, location_type, start_time, end_time, is_overnight, requires_ceo, status, current_step, estimated_cost, requested_by, manager_id, manager_decision, manager_notes, manager_decision_at, ceo_id, ceo_decision, ceo_notes, ceo_decision_at, finance_id, finance_decision, finance_notes, finance_decision_at, created_at, updated_at, approved_budget_amount, approved_budget_currency, approved_budget_exchange_rate, budget_approved_at, budget_approved_by) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, password, role, ho_ten, email, trang_thai, created_at, updated_at) FROM stdin;
1	admin	$2b$10$00Rv3PtAUG3pmwqQ/S/wB.FN6MGCZKYXSha6Kki3yeUwEURwrLCrW	ADMIN	Quản trị viên	admin@rmg.com	ACTIVE	2025-11-04 21:50:32.801275	2025-11-04 21:50:32.801275
2	it	$2b$10$00Rv3PtAUG3pmwqQ/S/wB.FN6MGCZKYXSha6Kki3yeUwEURwrLCrW	IT	Nhân viên IT	it@rmg.com	ACTIVE	2025-11-04 21:50:32.807009	2025-11-04 21:50:32.807009
3	hr	$2b$10$00Rv3PtAUG3pmwqQ/S/wB.FN6MGCZKYXSha6Kki3yeUwEURwrLCrW	HR	Nhân viên HR	hr@rmg.com	ACTIVE	2025-11-04 21:50:32.80872	2025-11-04 21:50:32.80872
4	ketoan	$2b$10$00Rv3PtAUG3pmwqQ/S/wB.FN6MGCZKYXSha6Kki3yeUwEURwrLCrW	ACCOUNTING	Nhân viên Kế toán	ketoan@rmg.com	ACTIVE	2025-11-04 21:50:32.810268	2025-11-04 21:50:32.810268
5	hr_admin	$2b$10$1NqQiKVlcXkQzf5kckJjae9f3RmhMK8vq.vxiAe2joEGeePzFT7FO	HR	Hành chính nhân sự	hr@rmg.com	ACTIVE	2025-11-06 10:52:22.916475	2025-11-06 10:52:22.916475
\.


--
-- Name: attendance_adjustments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attendance_adjustments_id_seq', 1, false);


--
-- Name: candidates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.candidates_id_seq', 1, false);


--
-- Name: employees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employees_id_seq', 931, true);


--
-- Name: equipment_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.equipment_assignments_id_seq', 1, false);


--
-- Name: interview_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.interview_requests_id_seq', 1, false);


--
-- Name: leave_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.leave_requests_id_seq', 1, false);


--
-- Name: overtime_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.overtime_requests_id_seq', 1, false);


--
-- Name: recruitment_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.recruitment_requests_id_seq', 1, false);


--
-- Name: request_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.request_items_id_seq', 1, false);


--
-- Name: requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.requests_id_seq', 1, false);


--
-- Name: travel_expense_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.travel_expense_requests_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 5, true);


--
-- Name: attendance_adjustments attendance_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_adjustments
    ADD CONSTRAINT attendance_adjustments_pkey PRIMARY KEY (id);


--
-- Name: candidates candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_pkey PRIMARY KEY (id);


--
-- Name: employees employees_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_email_key UNIQUE (email);


--
-- Name: employees employees_ma_nhan_vien_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_ma_nhan_vien_key UNIQUE (ma_nhan_vien);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: equipment_assignments equipment_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_assignments
    ADD CONSTRAINT equipment_assignments_pkey PRIMARY KEY (id);


--
-- Name: interview_requests interview_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_requests
    ADD CONSTRAINT interview_requests_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: overtime_requests overtime_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_requests
    ADD CONSTRAINT overtime_requests_pkey PRIMARY KEY (id);


--
-- Name: recruitment_requests recruitment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recruitment_requests
    ADD CONSTRAINT recruitment_requests_pkey PRIMARY KEY (id);


--
-- Name: request_items request_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_items
    ADD CONSTRAINT request_items_pkey PRIMARY KEY (id);


--
-- Name: requests requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (id);


--
-- Name: travel_expense_requests travel_expense_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_expense_requests
    ADD CONSTRAINT travel_expense_requests_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_attendance_adjustments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_adjustments_created_at ON public.attendance_adjustments USING btree (created_at DESC);


--
-- Name: idx_attendance_adjustments_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_adjustments_employee ON public.attendance_adjustments USING btree (employee_id);


--
-- Name: idx_attendance_adjustments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_adjustments_status ON public.attendance_adjustments USING btree (status);


--
-- Name: idx_attendance_adjustments_team_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_adjustments_team_lead ON public.attendance_adjustments USING btree (team_lead_id);


--
-- Name: idx_candidates_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidates_created_at ON public.candidates USING btree (created_at);


--
-- Name: idx_candidates_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidates_status ON public.candidates USING btree (status);


--
-- Name: idx_employees_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_email ON public.employees USING btree (email);


--
-- Name: idx_employees_ma_cham_cong; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_ma_cham_cong ON public.employees USING btree (ma_cham_cong) WHERE (ma_cham_cong IS NOT NULL);


--
-- Name: idx_employees_ma_nhan_vien; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_ma_nhan_vien ON public.employees USING btree (ma_nhan_vien);


--
-- Name: idx_employees_phong_ban; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_phong_ban ON public.employees USING btree (phong_ban);


--
-- Name: idx_employees_trang_thai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_trang_thai ON public.employees USING btree (trang_thai);


--
-- Name: idx_equipment_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipment_employee_id ON public.equipment_assignments USING btree (employee_id);


--
-- Name: idx_equipment_phong_ban; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipment_phong_ban ON public.equipment_assignments USING btree (phong_ban);


--
-- Name: idx_equipment_trang_thai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipment_trang_thai ON public.equipment_assignments USING btree (trang_thai);


--
-- Name: idx_interview_requests_candidate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interview_requests_candidate_id ON public.interview_requests USING btree (candidate_id);


--
-- Name: idx_interview_requests_manager_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interview_requests_manager_id ON public.interview_requests USING btree (manager_id);


--
-- Name: idx_interview_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_interview_requests_status ON public.interview_requests USING btree (status);


--
-- Name: idx_leave_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_created_at ON public.leave_requests USING btree (created_at DESC);


--
-- Name: idx_leave_requests_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_employee ON public.leave_requests USING btree (employee_id);


--
-- Name: idx_leave_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_status ON public.leave_requests USING btree (status);


--
-- Name: idx_leave_requests_team_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_team_lead ON public.leave_requests USING btree (team_lead_id);


--
-- Name: idx_overtime_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_overtime_requests_created_at ON public.overtime_requests USING btree (created_at DESC);


--
-- Name: idx_overtime_requests_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_overtime_requests_employee ON public.overtime_requests USING btree (employee_id);


--
-- Name: idx_overtime_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_overtime_requests_status ON public.overtime_requests USING btree (status);


--
-- Name: idx_overtime_requests_team_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_overtime_requests_team_lead ON public.overtime_requests USING btree (team_lead_id);


--
-- Name: idx_recruitment_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recruitment_requests_created_at ON public.recruitment_requests USING btree (created_at DESC);


--
-- Name: idx_recruitment_requests_manager_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recruitment_requests_manager_id ON public.recruitment_requests USING btree (manager_id);


--
-- Name: idx_recruitment_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recruitment_requests_status ON public.recruitment_requests USING btree (status);


--
-- Name: idx_request_items_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_items_request_id ON public.request_items USING btree (request_id);


--
-- Name: idx_request_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_items_status ON public.request_items USING btree (status);


--
-- Name: idx_requests_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requests_assigned_to ON public.requests USING btree (assigned_to);


--
-- Name: idx_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requests_created_at ON public.requests USING btree (created_at DESC);


--
-- Name: idx_requests_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requests_employee_id ON public.requests USING btree (employee_id);


--
-- Name: idx_requests_request_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requests_request_type ON public.requests USING btree (request_type);


--
-- Name: idx_requests_requested_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requests_requested_by ON public.requests USING btree (requested_by);


--
-- Name: idx_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requests_status ON public.requests USING btree (status);


--
-- Name: idx_requests_target_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_requests_target_department ON public.requests USING btree (target_department);


--
-- Name: idx_travel_expense_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_travel_expense_employee ON public.travel_expense_requests USING btree (employee_id);


--
-- Name: idx_travel_expense_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_travel_expense_status ON public.travel_expense_requests USING btree (status);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_trang_thai; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_trang_thai ON public.users USING btree (trang_thai);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: v_employees_with_equipment_count _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.v_employees_with_equipment_count AS
 SELECT e.id,
    e.ho_ten,
    e.chuc_danh,
    e.phong_ban,
    e.bo_phan,
    e.ngay_gia_nhap,
    e.email,
    e.trang_thai,
    count(eq.id) AS tong_vat_dung,
    e.created_at,
    e.updated_at
   FROM (public.employees e
     LEFT JOIN public.equipment_assignments eq ON (((e.id = eq.employee_id) AND ((eq.trang_thai)::text <> 'RETURNED'::text))))
  GROUP BY e.id;


--
-- Name: v_requests_with_items _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.v_requests_with_items AS
 SELECT r.id AS request_id,
    r.employee_id,
    r.request_type,
    r.target_department,
    r.title,
    r.description,
    r.status AS request_status,
    r.priority,
    r.requested_by,
    r.assigned_to,
    r.completed_at,
    r.notes AS request_notes,
    r.created_at AS request_created_at,
    r.updated_at AS request_updated_at,
    e.ho_ten AS employee_name,
    e.email AS employee_email,
    e.ma_nhan_vien,
    u1.ho_ten AS requested_by_name,
    u2.ho_ten AS assigned_to_name,
    count(ri.id) AS total_items,
    count(ri.id) FILTER (WHERE ((ri.status)::text = 'COMPLETED'::text)) AS completed_items,
    count(ri.id) FILTER (WHERE ((ri.status)::text = 'PARTIAL'::text)) AS partial_items,
    count(ri.id) FILTER (WHERE ((ri.status)::text = 'PENDING'::text)) AS pending_items,
    sum(ri.quantity) AS total_quantity,
    sum(ri.quantity_provided) AS total_provided
   FROM ((((public.requests r
     LEFT JOIN public.employees e ON ((r.employee_id = e.id)))
     LEFT JOIN public.users u1 ON ((r.requested_by = u1.id)))
     LEFT JOIN public.users u2 ON ((r.assigned_to = u2.id)))
     LEFT JOIN public.request_items ri ON ((r.id = ri.request_id)))
  GROUP BY r.id, e.id, u1.id, u2.id;


--
-- Name: attendance_adjustments trg_attendance_adjustments_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_attendance_adjustments_updated BEFORE UPDATE ON public.attendance_adjustments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: request_items trg_create_item_update_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_create_item_update_notification AFTER UPDATE ON public.request_items FOR EACH ROW WHEN ((((old.status)::text IS DISTINCT FROM (new.status)::text) OR (old.quantity_provided IS DISTINCT FROM new.quantity_provided))) EXECUTE FUNCTION public.create_item_update_notification();


--
-- Name: requests trg_create_request_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_create_request_notification AFTER INSERT ON public.requests FOR EACH ROW EXECUTE FUNCTION public.create_request_notification();


--
-- Name: leave_requests trg_leave_requests_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_leave_requests_updated BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: overtime_requests trg_overtime_requests_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_overtime_requests_updated BEFORE UPDATE ON public.overtime_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: requests trg_update_request_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_request_notification AFTER UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.update_request_notification();


--
-- Name: request_items trg_update_request_status_from_items; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_request_status_from_items AFTER INSERT OR UPDATE ON public.request_items FOR EACH ROW EXECUTE FUNCTION public.update_request_status_from_items();


--
-- Name: employees trigger_generate_ma_nhan_vien; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_ma_nhan_vien BEFORE INSERT ON public.employees FOR EACH ROW EXECUTE FUNCTION public.generate_ma_nhan_vien();


--
-- Name: employees update_employees_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: equipment_assignments update_equipment_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: request_items update_request_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_request_items_updated_at BEFORE UPDATE ON public.request_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: requests update_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: attendance_adjustments attendance_adjustments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_adjustments
    ADD CONSTRAINT attendance_adjustments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: attendance_adjustments attendance_adjustments_team_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_adjustments
    ADD CONSTRAINT attendance_adjustments_team_lead_id_fkey FOREIGN KEY (team_lead_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: equipment_assignments equipment_assignments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_assignments
    ADD CONSTRAINT equipment_assignments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: interview_requests interview_requests_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_requests
    ADD CONSTRAINT interview_requests_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: interview_requests interview_requests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_requests
    ADD CONSTRAINT interview_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.employees(id);


--
-- Name: interview_requests interview_requests_indirect_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_requests
    ADD CONSTRAINT interview_requests_indirect_manager_id_fkey FOREIGN KEY (indirect_manager_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: interview_requests interview_requests_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interview_requests
    ADD CONSTRAINT interview_requests_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_team_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_team_lead_id_fkey FOREIGN KEY (team_lead_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: overtime_requests overtime_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_requests
    ADD CONSTRAINT overtime_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: overtime_requests overtime_requests_team_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.overtime_requests
    ADD CONSTRAINT overtime_requests_team_lead_id_fkey FOREIGN KEY (team_lead_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: recruitment_requests recruitment_requests_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recruitment_requests
    ADD CONSTRAINT recruitment_requests_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: request_items request_items_provided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_items
    ADD CONSTRAINT request_items_provided_by_fkey FOREIGN KEY (provided_by) REFERENCES public.users(id);


--
-- Name: request_items request_items_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_items
    ADD CONSTRAINT request_items_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE;


--
-- Name: requests requests_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: requests requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: requests requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: travel_expense_requests travel_expense_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_expense_requests
    ADD CONSTRAINT travel_expense_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 1ZzwXGUnLDricCPRbPVgsJeZLbafAt0MadiRLvq01jcWJp0WozS7JQBLljJCVU7

