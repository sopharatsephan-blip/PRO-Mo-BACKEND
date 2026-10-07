const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../libs/db_pool');

// รองรับฐานข้อมูลสองรุ่นที่ตั้งชื่อคอลัมน์รหัสผ่านต่างกัน
async function getPasswordColumn(conn) {
    const columns = await conn.query('SHOW COLUMNS FROM Customer');
    const names = new Set(columns.map((column) => column.Field));
    if (names.has('Password')) return 'Password';
    if (names.has('account_passwrd')) return 'account_passwrd';
    throw new Error('Customer table has no supported password column');
}

module.exports = {
    // สร้างสมาชิก Role R002 โดยแฮชรหัสผ่านก่อนบันทึกลง Customer
    register: async ({ firstName, lastName, username, email, password }) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const passwordColumn = await getPasswordColumn(conn);
            await conn.query(
                "INSERT IGNORE INTO Role (RoleID, RoleName) VALUES ('R002', 'สมาชิกทั่วไป')",
            );
            const uid = `UID${crypto.randomUUID().replace(/-/g, '').slice(0, 17)}`;
            const passwordHash = await bcrypt.hash(password, 12);
            await conn.query(
                `INSERT INTO Customer (UID, FirstName, LastName, Username, \`${passwordColumn}\`, RoleID, Email)
                 VALUES (?, ?, ?, ?, ?, 'R002', ?)`,
                [uid, firstName, lastName, username, passwordHash, email],
            );
            return { isError: false, data: { UID: uid, Username: username } };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return { isError: true, errorCode: 'DUPLICATE_ACCOUNT', errorMessage: 'ชื่อผู้ใช้งานหรือรหัสสมาชิกนี้ถูกใช้แล้ว' };
            }
            return { isError: true, errorMessage: error.message };
        } finally {
            if (conn) conn.release();
        }
    },

    // ตั้งรหัสใหม่เมื่อ username และ email ตรงกัน; บันทึกเป็น bcrypt hash
    resetPassword: async ({ username, email, password }) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const passwordColumn = await getPasswordColumn(conn);
            const passwordHash = await bcrypt.hash(password, 12);
            const result = await conn.query(
                `UPDATE Customer SET \`${passwordColumn}\` = ? WHERE Username = ? AND Email = ?`,
                [passwordHash, username, email],
            );
            if (result.affectedRows === 0) {
                return { isError: true, errorCode: 'ACCOUNT_NOT_FOUND', errorMessage: 'ชื่อผู้ใช้หรืออีเมลไม่ตรงกับบัญชี' };
            }
            return { isError: false };
        } catch (error) {
            return { isError: true, errorMessage: error.message };
        } finally {
            if (conn) conn.release();
        }
    },
};
