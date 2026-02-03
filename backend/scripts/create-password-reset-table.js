const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function createPasswordResetTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Creating password_reset_requests table...');

    // Đọc SQL file nếu có
    const sqlFilePath = path.join(__dirname, '../../database/create_password_reset_table.sql');
    let sql = '';

    try {
      if (fs.existsSync(sqlFilePath)) {
        sql = fs.readFileSync(sqlFilePath, 'utf8');
        console.log('Read SQL from file:', sqlFilePath);
      } else {
        // Fallback SQL nếu file không tồn tại
        sql = `
          CREATE TABLE IF NOT EXISTS password_reset_requests (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('employee', 'user')),
            email VARCHAR(255) NOT NULL,
            otp VARCHAR(6) NOT NULL,
            otp_expires_at TIMESTAMP NOT NULL,
            is_used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used_at TIMESTAMP NULL
          );

          CREATE INDEX IF NOT EXISTS idx_password_reset_user_month 
          ON password_reset_requests(user_id, user_type, DATE_TRUNC('month', created_at));

          CREATE INDEX IF NOT EXISTS idx_password_reset_otp 
          ON password_reset_requests(otp, is_used, otp_expires_at);
        `;
        console.log('Using fallback SQL');
      }
    } catch (error) {
      console.log('Error reading SQL file, using fallback:', error.message);
      sql = `
        CREATE TABLE IF NOT EXISTS password_reset_requests (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('employee', 'user')),
          email VARCHAR(255) NOT NULL,
          otp VARCHAR(6) NOT NULL,
          otp_expires_at TIMESTAMP NOT NULL,
          is_used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          used_at TIMESTAMP NULL
        );

        CREATE INDEX IF NOT EXISTS idx_password_reset_user_month 
        ON password_reset_requests(user_id, user_type, DATE_TRUNC('month', created_at));

        CREATE INDEX IF NOT EXISTS idx_password_reset_otp 
        ON password_reset_requests(otp, is_used, otp_expires_at);
      `;
    }

    // Thực thi SQL
    await client.query(sql);

    await client.query('COMMIT');
    console.log('✅ Password reset table created successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating password reset table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Chạy script
createPasswordResetTable()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
