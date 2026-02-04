const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/database');

// Helper function để đảm bảo cột password_display tồn tại
let ensurePasswordDisplayColumnPromise = null;
const ensurePasswordDisplayColumn = async () => {
    if (ensurePasswordDisplayColumnPromise) {
        return ensurePasswordDisplayColumnPromise;
    }

    ensurePasswordDisplayColumnPromise = (async () => {
        const checkQuery = `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'employees'
            AND column_name = 'password_display'
            LIMIT 1
        `;

        const result = await pool.query(checkQuery);

        if (result.rowCount === 0) {
            await pool.query(`
                ALTER TABLE employees
                ADD COLUMN password_display VARCHAR(255);
            `);

            await pool.query(`
                COMMENT ON COLUMN employees.password_display IS 'Mật khẩu plaintext để HR xem (chỉ cập nhật khi nhân viên đổi mật khẩu)';
            `);
        }
    })().catch((error) => {
        ensurePasswordDisplayColumnPromise = null;
        console.error('Error ensuring password_display column exists:', error);
        throw error;
    });

    return ensurePasswordDisplayColumnPromise;
};

// Helper function để generate OTP 6 chữ số
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function để check số lần reset trong tháng
const checkResetLimit = async (userId, userType) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const result = await pool.query(
    `SELECT COUNT(*) as count 
     FROM password_reset_requests 
     WHERE user_id = $1 
     AND user_type = $2 
     AND created_at >= $3 
     AND is_used = TRUE`,
    [userId, userType, startOfMonth]
  );

  return parseInt(result.rows[0].count, 10);
};

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
          
          // Đảm bảo cột password_display tồn tại và cập nhật với mật khẩu hiện tại
          // Điều này giúp hiển thị mật khẩu cho HR ngay cả khi nhân viên đổi mật khẩu trước khi migration
          try {
            await ensurePasswordDisplayColumn();
            await pool.query(
              `UPDATE employees SET password_display = $1 WHERE id = $2`,
              [password, employee.id]
            );
            console.log(`[Auth] Updated password_display for employee ${employee.id} on login`);
          } catch (updateError) {
            // Log lỗi nhưng không block login
            console.error(`[Auth] Error updating password_display for employee ${employee.id}:`, updateError.message);
          }
          
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

      // Đảm bảo cột password_display tồn tại (nếu là employee)
      await ensurePasswordDisplayColumn();

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
      // Nếu là employee, cũng lưu plaintext vào password_display để HR xem
      let updateQuery;
      if (userTable === 'employees') {
        try {
          updateQuery = `UPDATE ${userTable} SET password = $1, password_display = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`;
          const updateResult = await client.query(updateQuery, [hashedNewPassword, newPassword, userId]);
          console.log(`[Auth] Updated password for employee ${userId}, rows affected: ${updateResult.rowCount}`);
        } catch (updateError) {
          // Nếu lỗi do cột password_display chưa tồn tại, thử lại không có cột đó
          if (updateError.code === '42703') {
            console.log(`[Auth] password_display column not found, retrying without it`);
            updateQuery = `UPDATE ${userTable} SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
            await client.query(updateQuery, [hashedNewPassword, userId]);
          } else {
            throw updateError;
          }
        }
      } else {
        updateQuery = `UPDATE ${userTable} SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
        await client.query(updateQuery, [hashedNewPassword, userId]);
      }

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

// POST /api/auth/forgot-password - Xác thực thông tin để reset password
router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body; // Có thể là email, mã nhân viên, hoặc tên

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email, mã nhân viên hoặc tên của bạn'
      });
    }

    // Tìm user trong employees table
    let userQuery = `
      SELECT id, email, ho_ten, ma_nhan_vien, trang_thai, 'employee' as user_type
      FROM employees
      WHERE (
        LOWER(TRIM(email)) = LOWER(TRIM($1)) OR
        LOWER(TRIM(ma_nhan_vien)) = LOWER(TRIM($1)) OR
        LOWER(TRIM(ho_ten)) = LOWER(TRIM($1))
      ) AND trang_thai IN ('ACTIVE', 'PENDING')
    `;

    let userResult = await pool.query(userQuery, [identifier]);

    // Nếu không tìm thấy trong employees, tìm trong users table
    if (userResult.rows.length === 0) {
      userQuery = `
        SELECT id, email, ho_ten, username, trang_thai, 'user' as user_type
        FROM users
        WHERE (
          LOWER(TRIM(email)) = LOWER(TRIM($1)) OR
          LOWER(TRIM(username)) = LOWER(TRIM($1)) OR
          LOWER(TRIM(ho_ten)) = LOWER(TRIM($1))
        ) AND trang_thai = 'ACTIVE'
      `;
      userResult = await pool.query(userQuery, [identifier]);
    }

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản với thông tin đã nhập'
      });
    }

    const user = userResult.rows[0];

    if (!user.email || user.email.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản này chưa có email. Vui lòng liên hệ HR để được hỗ trợ.'
      });
    }

    // Kiểm tra giới hạn 2 lần/tháng
    const resetCount = await checkResetLimit(user.id, user.user_type);
    if (resetCount >= 2) {
      return res.status(429).json({
        success: false,
        message: 'Bạn đã sử dụng hết 2 lần reset password trong tháng này. Vui lòng thử lại vào tháng sau hoặc liên hệ HR.'
      });
    }

    // Đảm bảo bảng password_reset_requests tồn tại (không cần OTP nữa, chỉ track reset count)
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS password_reset_requests (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('employee', 'user')),
          email VARCHAR(255) NOT NULL,
          is_used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          used_at TIMESTAMP NULL
        )
      `);

      // Tạo indexes nếu chưa có
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_password_reset_user_month 
        ON password_reset_requests(user_id, user_type, DATE_TRUNC('month', created_at))
      `);
    } catch (createError) {
      // Bảng có thể đã tồn tại, bỏ qua
      console.log('[Auth] Password reset table check:', createError.message);
    }

    // Tạo reset token đơn giản (user_id + user_type + timestamp hash)
    const resetToken = Buffer.from(`${user.id}_${user.user_type}_${Date.now()}`).toString('base64');

    // Xác định identifier để hiển thị (ưu tiên mã nhân viên, sau đó username, cuối cùng là email)
    let displayIdentifier = user.email;
    if (user.user_type === 'employee' && user.ma_nhan_vien) {
      displayIdentifier = user.ma_nhan_vien;
    } else if (user.user_type === 'user' && user.username) {
      displayIdentifier = user.username;
    }

    res.json({
      success: true,
      message: 'Thông tin xác thực thành công',
      data: {
        email: user.email,
        identifier: displayIdentifier, // Mã nhân viên hoặc username để hiển thị
        resetToken: resetToken,
        userId: user.id,
        userType: user.user_type
      }
    });

  } catch (error) {
    console.error('Error in forgot-password:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});


// POST /api/auth/reset-password - Reset password trực tiếp (không cần OTP)
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, userId, userType, newPassword } = req.body;

    console.log('[Auth] Reset password request:', { 
      resetToken: resetToken ? 'present' : 'missing',
      userId, 
      userType, 
      hasPassword: !!newPassword 
    });

    if (!resetToken || !userId || !userType || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin'
      });
    }

    // Validate userId là số
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId) || numericUserId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Thông tin người dùng không hợp lệ'
      });
    }

    // Validate userType
    if (userType !== 'employee' && userType !== 'user') {
      return res.status(400).json({
        success: false,
        message: 'Loại tài khoản không hợp lệ'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }

    // Kiểm tra lại giới hạn 2 lần/tháng (để đảm bảo)
    const resetCount = await checkResetLimit(numericUserId, userType);
    if (resetCount >= 2) {
      return res.status(429).json({
        success: false,
        message: 'Bạn đã sử dụng hết 2 lần reset password trong tháng này. Vui lòng thử lại vào tháng sau hoặc liên hệ HR.'
      });
    }

      const userTable = userType === 'employee' ? 'employees' : 'users';

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Đảm bảo cột password_display tồn tại (nếu là employee)
        if (userTable === 'employees') {
          await ensurePasswordDisplayColumn();
        }

      // Kiểm tra user có tồn tại không
      const checkUserQuery = userType === 'employee' 
        ? `SELECT id, email FROM employees WHERE id = $1 AND trang_thai IN ('ACTIVE', 'PENDING')`
        : `SELECT id, email FROM users WHERE id = $1 AND trang_thai = 'ACTIVE'`;
      
      const userCheckResult = await client.query(checkUserQuery, [numericUserId]);
      
      console.log('[Auth] User check result:', { 
        found: userCheckResult.rows.length > 0,
        userId: numericUserId,
        userType 
      });
      
      if (userCheckResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài khoản'
        });
      }

      const userEmail = userCheckResult.rows[0].email;

      // Hash password mới
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password và kiểm tra số rows affected
      // Nếu là employee, cũng lưu plaintext vào password_display để HR xem
      let updateResult;
      if (userTable === 'employees') {
        try {
          updateResult = await client.query(
            `UPDATE ${userTable} 
             SET password = $1, password_display = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $3`,
            [hashedPassword, newPassword, numericUserId]
          );
          console.log(`[Auth] Reset password for employee ${numericUserId}, rows affected: ${updateResult.rowCount}`);
        } catch (updateError) {
          // Nếu lỗi do cột password_display chưa tồn tại, thử lại không có cột đó
          if (updateError.code === '42703') {
            console.log(`[Auth] password_display column not found, retrying without it`);
            updateResult = await client.query(
              `UPDATE ${userTable} 
               SET password = $1, updated_at = CURRENT_TIMESTAMP 
               WHERE id = $2`,
              [hashedPassword, numericUserId]
            );
          } else {
            throw updateError;
          }
        }
      } else {
        updateResult = await client.query(
          `UPDATE ${userTable} 
           SET password = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [hashedPassword, numericUserId]
        );
      }

      console.log('[Auth] Update password result:', { 
        rowCount: updateResult.rowCount,
        userId: numericUserId,
        userTable 
      });

      if (updateResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Không thể cập nhật mật khẩu. Vui lòng thử lại.'
        });
      }

      console.log(`[Auth] Password reset successful for user ${numericUserId} (${userType})`);

      // Lưu lại lịch sử reset để track số lần reset trong tháng
      try {
        // Đảm bảo bảng tồn tại (dùng pool riêng để tránh conflict với transaction)
        await pool.query(`
          CREATE TABLE IF NOT EXISTS password_reset_requests (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('employee', 'user')),
            email VARCHAR(255) NOT NULL,
            is_used BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Insert vào bảng tracking (dùng pool riêng vì CREATE TABLE không thể trong transaction)
        if (userEmail) {
          await pool.query(
            `INSERT INTO password_reset_requests (user_id, user_type, email, is_used, used_at)
             VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)`,
            [numericUserId, userType, userEmail]
          );
        }
      } catch (trackError) {
        // Nếu không track được cũng không sao, chỉ log
        console.log('[Auth] Error tracking reset:', trackError.message);
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[Auth] Reset password error:', error);
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error in reset-password:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

module.exports = router;
