const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/database');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password, email, fullName } = req.body;

    // Support username, email, or full name for login
    const loginIdentifier = (fullName || username || email || '').trim();

    // Validate input
    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin đăng nhập và mật khẩu'
      });
    }

    // First, try to find in users table (HR, IT, Accounting, Admin)
    const userQuery = `
      SELECT id, username, password, role, ho_ten, email, trang_thai
      FROM users
      WHERE (username = $1 OR email = $1) AND trang_thai = 'ACTIVE'
    `;

    const userResult = await pool.query(userQuery, [loginIdentifier]);

    let authenticatedUser = null;
    let isEmployee = false;

    if (userResult.rows.length > 0) {
      // Found in users table
      const user = userResult.rows[0];
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (isPasswordValid) {
        authenticatedUser = {
          id: user.id,
          username: user.username,
          role: user.role,
          hoTen: user.ho_ten,
          email: user.email
        };
      }
    } else {
      // Not found in users table, try employees table
      const employeeQuery = `
        SELECT id, ma_nhan_vien, ho_ten, email, password, trang_thai, phong_ban, chuc_danh, chi_nhanh, quan_ly_truc_tiep, quan_ly_gian_tiep
        FROM employees
        WHERE (
          email = $1 OR
          LOWER(TRIM(ho_ten)) = LOWER(TRIM($1)) OR
          LOWER(TRIM(ma_nhan_vien)) = LOWER(TRIM($1))
        ) AND trang_thai IN ('ACTIVE', 'PENDING')
      `;

      const employeeResult = await pool.query(employeeQuery, [loginIdentifier]);

      if (employeeResult.rows.length > 0) {
        const employee = employeeResult.rows[0];
        const isPasswordValid = await bcrypt.compare(password, employee.password);

        if (isPasswordValid) {
          isEmployee = true;
          authenticatedUser = {
            id: employee.id,
            username: employee.ho_ten,
            role: 'EMPLOYEE',
            hoTen: employee.ho_ten,
            email: employee.email,
            maNhanVien: employee.ma_nhan_vien,
            phongBan: employee.phong_ban,
            chucDanh: employee.chuc_danh,
            chiNhanh: employee.chi_nhanh,
            quanLyTrucTiep: employee.quan_ly_truc_tiep,
            quanLyGianTiep: employee.quan_ly_gian_tiep
          };
        }
      }
    }

    // Check if authentication was successful
    if (!authenticatedUser) {
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập hoặc mật khẩu không đúng'
      });
    }

    // Trả về thông tin user/employee
    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: authenticatedUser
    });

  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

// POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }

    // Get user ID from header
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Try to find in users table first
      let userQuery = `
        SELECT id, password, 'users' as table_name
        FROM users
        WHERE id = $1 AND trang_thai = 'ACTIVE'
      `;
      let userResult = await client.query(userQuery, [userId]);

      let userTable = 'users';
      let user = null;

      // If not found in users table, try employees table
      if (userResult.rows.length === 0) {
        userQuery = `
          SELECT id, password, 'employees' as table_name
          FROM employees
          WHERE id = $1 AND trang_thai IN ('ACTIVE', 'PENDING')
        `;
        userResult = await client.query(userQuery, [userId]);
        if (userResult.rows.length > 0) {
          userTable = 'employees';
          user = userResult.rows[0];
        }
      } else {
        user = userResult.rows[0];
      }

      if (!user) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài khoản'
        });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        await client.query('ROLLBACK');
        return res.status(401).json({
          success: false,
          message: 'Mật khẩu hiện tại không đúng'
        });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      const updateQuery = `UPDATE ${userTable} SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
      await client.query(updateQuery, [hashedNewPassword, userId]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Đổi mật khẩu thành công'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in change-password:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

module.exports = router;
