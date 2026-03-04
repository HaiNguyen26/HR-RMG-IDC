# Thiết kế quy trình xin nghỉ việc (Resignation Lifecycle)

## I. Nguyên tắc
- **Không có Draft**: Tạo đơn = ghi nhận thông báo ngay.
- **Deadline pháp lý**: Tự động tính theo loại hợp đồng (Thử việc ≥3, HĐ xác định thời hạn ≥30, Không xác định thời hạn ≥45 ngày).
- **Không "Reject"**: Chỉ có "Xác nhận đã tiếp nhận"; không từ chối quyền nghỉ.
- **Checklist bàn giao**: Bắt buộc trong giai đoạn Notice Period.

## II. Trạng thái (status)

| Status | Mô tả | Deadline auto chuyển |
|--------|--------|----------------------|
| SUBMITTED | NV vừa nộp | - |
| HR_ACKNOWLEDGED | HR đã xác nhận nhận đơn | 1 ngày → PENDING_DIRECT_MANAGER |
| PENDING_DIRECT_MANAGER | Chờ QL trực tiếp xác nhận | 1 ngày → PENDING_INDIRECT_MANAGER |
| PENDING_INDIRECT_MANAGER | Chờ QL gián tiếp xác nhận | 1 ngày → PENDING_BRANCH_DIRECTOR |
| PENDING_BRANCH_DIRECTOR | Chờ GĐ chi nhánh xác nhận | 3 ngày → NOTICE_PERIOD_RUNNING |
| NOTICE_PERIOD_RUNNING | Đang trong thời gian báo trước | - |
| PRE_EXIT_CLEARANCE | Trước ngày nghỉ 3 ngày: IT + Finance clearance | Khi đủ clearance → LAST_WORKING_DAY |
| LAST_WORKING_DAY | Ngày nghỉ: khóa TK, employee → Inactive | - |
| CONTRACT_LIQUIDATION | HR thanh toán (14 ngày, tối đa 30) | Khi hoàn tất → CLOSED |
| CLOSED | Kết thúc | - |

## III. Bảng DB

### resignation_requests
- id, employee_id
- submitted_at (ngày nộp), intended_last_work_date (ngày dự kiến nghỉ)
- reason, notes
- status (enum như trên)
- required_notice_days (tính từ loại HĐ), contract_type (loại HĐ lưu lại)
- hr_acknowledged_at, hr_acknowledged_by
- direct_manager_ack_at, direct_manager_id, direct_manager_notes (dự án, người thay thế, rủi ro)
- indirect_manager_ack_at, indirect_manager_id, indirect_manager_notes
- branch_director_ack_at, branch_director_id, branch_director_notes
- notice_period_started_at
- it_clearance_at, it_clearance_by, finance_clearance_at, finance_clearance_by
- last_working_day_at, employee_made_inactive_at
- contract_liquidation_deadline (14 hoặc 30), contract_liquidation_completed_at, closed_at
- created_at, updated_at

### resignation_handover_items
- id, resignation_request_id
- title, description, completed (boolean), completed_at, completed_by
- sort_order

## IV. Logic nghiệp vụ
- **Submit**: Kiểm tra (intended_last_work_date - submitted_at) >= required_notice_days theo loại HĐ; nếu không đủ → không cho submit, hiển thị cảnh báo.
- **Escalation**: Job/cron hoặc khi load danh sách: nếu status HR_ACKNOWLEDGED và hr_acknowledged_at < now - 1 ngày → chuyển PENDING_DIRECT_MANAGER; tương tự cho từng bước.
- **Pre-Exit Clearance**: 3 ngày trước intended_last_work_date mở clearance; chỉ khi IT và Finance đều đã xác nhận mới cho chuyển LAST_WORKING_DAY.
- **Last Working Day**: Cron/script đổi status, gọi cập nhật employee.trang_thai = INACTIVE, khóa tài khoản (nếu có bảng user).

## V. API (Backend)
- POST /api/resignation-requests — NV tạo đơn (validate notice)
- GET /api/resignation-requests — List (filter status, employeeId, role)
- GET /api/resignation-requests/:id — Chi tiết
- POST /api/resignation-requests/:id/hr-acknowledge — HR xác nhận
- POST /api/resignation-requests/:id/direct-manager-acknowledge — QL trực tiếp ( + dự án, người thay thế, rủi ro)
- POST /api/resignation-requests/:id/indirect-manager-acknowledge — QL gián tiếp
- POST /api/resignation-requests/:id/branch-director-acknowledge — GĐ chi nhánh
- GET/POST /api/resignation-requests/:id/handover — Checklist bàn giao
- POST /api/resignation-requests/:id/it-clearance — IT xác nhận
- POST /api/resignation-requests/:id/finance-clearance — Finance xác nhận
- POST /api/resignation-requests/:id/close — HR đóng (Contract Liquidation xong)
- GET /api/resignation-requests/dashboard — Ai nghỉ trong 30/14/7 ngày tới (cho lãnh đạo)

## VI. Frontend
- **ResignRequest**: Thêm ngày nộp (auto = today), ngày dự kiến nghỉ; hiển thị required notice theo loại HĐ; validate trước khi submit; gọi API resignation-requests.
- **ResignApprovals** (hoặc tích hợp LeaveApprovals): Tab/theo role — HR xác nhận, QL trực tiếp/gián tiếp, GĐ chi nhánh — chỉ nút "Xác nhận đã tiếp nhận" + form nhập (dự án, người thay thế, rủi ro cho direct manager).
- **Resignation Dashboard**: Countdown đến ngày nghỉ; danh sách bàn giao; với role lãnh đạo: danh sách "Nghỉ trong 30/14/7 ngày tới".
- **Clearance**: Màn IT/Finance xác nhận clearance cho từng đơn (PRE_EXIT_CLEARANCE).
