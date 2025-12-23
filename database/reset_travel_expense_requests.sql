-- Script de xoa toan bo du lieu don cong tac (travel expense requests)
-- Giu nguyen cau truc bang de co the test lai tu dau

-- Xoa du lieu tu bang travel_expense_attachments truoc (bang phu thuoc)
DELETE FROM travel_expense_attachments;

-- Xoa du lieu tu bang travel_expense_requests
DELETE FROM travel_expense_requests;

-- Reset sequence ve 1 de ID bat dau tu 1 khi tao don moi
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'travel_expense_requests_id_seq') THEN
        ALTER SEQUENCE travel_expense_requests_id_seq RESTART WITH 1;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'travel_expense_attachments_id_seq') THEN
        ALTER SEQUENCE travel_expense_attachments_id_seq RESTART WITH 1;
    END IF;
END $$;

-- Thong bao ket qua
DO $$
BEGIN
    RAISE NOTICE 'Da xoa toan bo du lieu don cong tac. Cau truc bang duoc giu nguyen.';
END $$;
