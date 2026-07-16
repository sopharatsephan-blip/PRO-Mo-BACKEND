const pool = require('../libs/db_pool'); // ดึงไฟล์อ่างเก็บสายเชื่อมต่อฐานข้อมูลมาใช้งาน เพื่อติดต่อกับฐานข้อมูลใหม่
const dateUtils = require('../libs/date_utils'); // ดึงไฟล์เครื่องมือจัดวันที่เข้ามาใช้สำหรับทำวันที่ขีดกลางฝังในตั๋ว

module.exports = { 
    getUserAccountById: async (accountId) => { // 1. ฟังก์ชันดึงข้อมูลผู้ใช้จากไอดี (รับ accountId เข้ามา)
        let conn; // conn สำหรับเก็บ connection ไปยัง mariadb 
        let result; // result สำหรับส่งคืนผลลัพธ์การสืบค้นข้อมูล

        try { 
            conn = await pool.getConnection(); // หยิบสายเชื่อมต่อฐานข้อมูลจาก pool

            // ✨ ปรับปรุง: ดึง UID เป็น account_id, Username เป็น account_username และเพิ่ม FirstName กลับไปด้วย
            var sql = "SELECT UID AS account_id, Username AS account_username, FirstName "
                    + "FROM Customer "
                    + "WHERE UID = ?"; 

            var rows = await conn.query(sql, [accountId]); 

            result = { 
                isError: false, 
                data: rows 
            }; 

        } catch (error) { 
            result = { 
                isError: true, 
                errorMessage: error.message 
            };
        } finally { 
            if (conn) conn.release(); // คืนสายเชื่อมต่อ
        } 

        return result; 
    }, 

    checkAuthenRequest: async (authenRequest) => { // 2. ฟังก์ชันตรวจสอบด่านที่ 1 (หาตัวตนผู้ใช้จากรหัสแฮช)
        let conn; 
        let result; 

        try { 
            conn = await pool.getConnection(); 

            // ✨ ปรับปรุง: ชี้หาตาราง Customer และเปรียบเทียบค่าโดยเชื่อมต่อสูตร SQL แฮชด่านแรก
            var sql = "SELECT Username AS account_username FROM Customer WHERE" 
                    + " SHA2(CONCAT(Username, '&', ?), 256) = ?"; 

            var rows = await conn.query(sql, [dateUtils.getCurrentDateForToken(), authenRequest]); 

            if (rows.length === 0) { 
                result = { 
                    isError: true, 
                    errorMessage: "ไม่พบข้อมูลผู้ใช้ในระบบ" 
                };
            } else { 
                result = { 
                    isError: false, 
                    data: rows 
                };
            }

        } catch (error) { 
            result = { 
                isError: true, 
                errorMessage: error.message
            };
        } finally { 
            if (conn) conn.release(); 
        }

        return result; 
    }, 

    checkAccessRequest: async (authenSignature, authenToken) => { // 3. ฟังก์ชันตรวจสอบด่านที่ 2 (ตรวจสอบรหัสผ่านแบบสองจังหวะ)
        let conn; 
        let result; 

        try { 
            conn = await pool.getConnection(); 

            // ✨ ปรับปรุง: เปลี่ยนฟิลด์ Password -> account_passwrd และเปรียบเทียบค่า Signature กับการต่อสตริงด้วยค่า Hash รหัสผ่านในตารางจริง
            var sql = "SELECT UID, Username, FirstName FROM Customer WHERE " 
                    + "SHA2(CONCAT(Username, '&', account_passwrd, '&', ?), 256) = ?"; 

            var rows = await conn.query(sql, [authenToken, authenSignature]); 

            if (rows.length == 0) { 
                result = { 
                    isError: true, 
                    errorMessage: "รหัสผ่านไม่ถูกต้อง" 
                }
            } else { 
                result = { 
                    isError: false, 
                    data: rows 
                };
            }
        } catch (error) { 
            result = { 
                isError: true, 
                errorMessage: error.message
            }
        } finally { 
            if (conn) {
                conn.release(); 
            }
            return result; 
        }
    }
};