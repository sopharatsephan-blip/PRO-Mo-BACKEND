const crypto = require('crypto');
const pool = require('../libs/db_pool');

let tableReady;

// สร้าง SupportRequest เมื่อจำเป็น และเก็บ Promise ป้องกันการ CREATE ซ้ำทุก request
async function ensureTable() {
    if (!tableReady) {
        tableReady = (async () => {
            let conn;
            try {
                conn = await pool.getConnection();
                await conn.query(`
                    CREATE TABLE IF NOT EXISTS SupportRequest (
                        RequestID CHAR(36) NOT NULL,
                        RequestType ENUM('PASSWORD_RESET', 'CONTACT_ADMIN') NOT NULL,
                        FullName VARCHAR(120) NULL,
                        Username VARCHAR(100) NULL,
                        Email VARCHAR(254) NOT NULL,
                        Message TEXT NOT NULL,
                        Status ENUM('PENDING', 'IN_PROGRESS', 'RESOLVED') NOT NULL DEFAULT 'PENDING',
                        CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (RequestID),
                        KEY idx_support_status_created (Status, CreatedAt)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);
            } catch (error) {
                tableReady = null;
                throw error;
            } finally {
                if (conn) conn.release();
            }
        })();
    }
    return tableReady;
}

module.exports = {
    // รับคำขอจาก UI แล้ว INSERT ลงตาราง SupportRequest
    createRequest: async ({ requestType, fullName, username, email, message }) => {
        let conn;
        try {
            await ensureTable();
            conn = await pool.getConnection();
            const requestId = crypto.randomUUID();
            await conn.query(
                `INSERT INTO SupportRequest (RequestID, RequestType, FullName, Username, Email, Message)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [requestId, requestType, fullName || null, username || null, email, message]
            );
            return { isError: false, data: { RequestID: requestId } };
        } catch (error) {
            return { isError: true, errorMessage: error.message };
        } finally {
            if (conn) conn.release();
        }
    },
};
