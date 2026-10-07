const pool = require('../libs/db_pool'); // ดึงไฟล์อ่างเก็บสายเชื่อมต่อฐานข้อมูลที่เราตั้งค่าไว้เข้ามาใช้งานในไฟล์นี้

module.exports = { // สั่งส่งออกกลุ่มฟังก์ชันภายในก้อนนี้ เพื่อให้ไฟล์อื่น (เช่น controller หรือ server.js) ดึงไปใช้งานได้
    getAllCompanies: async () => { // สร้างฟังก์ชันดึงรายชื่อบริษัททั้งหมด โดยรอบนี้ไม่ต้องรับค่าไอดีใด ๆ เข้ามา
        let conn; // เตรียมสร้างกล่องเปล่าชื่อ conn เอาไว้สำหรับรอใส่สายเชื่อมต่อฐานข้อมูล
        let result; // เตรียมสร้างกล่องเปล่าชื่อ result เอาไว้สำหรับรอเก็บก้อนผลลัพธ์ที่จะส่งกลับไปหน้าบ้าน

        try { // เริ่มต้นบล็อก try (แปลว่า "ลองทำตามคำสั่งในนี้ดูนะ") ถ้าทำงานราบรื่นดีจะทำจนเสร็จสิ้น
            conn = await pool.getConnection(); // สั่งให้ไปหยิบสายเชื่อมต่อฐานข้อมูลที่ว่างอยู่จากอ่าง pool มาเก็บไว้ใน conn

            // ✨ ปรับปรุง: เขียนคำสั่ง SQL เลือกดึงข้อมูลรหัสบริษัท (CompanyID) และชื่อบริษัท (CompanyName) มาจากตาราง Company
            var sql = "SELECT CompanyID, CompanyName, Province, Location, Phone, MapUrl FROM Company ORDER BY CompanyName";
            var rows = await conn.query(sql); // สั่งรันคำสั่ง SQL ด้านบน เพื่อกวาดเอารายการบริษัททั้งหมดมาเก็บไว้ใน rows

            result = { // มัดก้อนผลลัพธ์ใส่กล่อง result เมื่อรันคำสั่งดึงข้อมูลรายชื่อบริษัทได้สำเร็จเรียบร้อย
                isError: false, // บอกหน้าบ้านว่า "ทำงานผ่านฉลุย ไม่พบข้อผิดพลาดจ้า"
                data: rows, // แนบก้อนข้อมูลรายการบริษัททั้งหมดจากฐานข้อมูลส่งไปให้หน้าบ้าน
                errorMessage: "" // ช่องข้อความแจ้งเตือนข้อผิดพลาดปล่อยให้ว่างไว้ เพราะทำงานสำเร็จ
            };

        } catch (error) { // บล็อก catch จะทำงานทันทีถ้าเกิดระบบพัง หรือชื่อตารางสะกดผิดในบล็อก try
            result = { // มัดก้อนผลลัพธ์รูปแบบแจ้งเตือนความผิดพลาดใส่กล่อง result แทน
                isError: true, // บอกหน้าบ้านชัดเจนเลยว่า "เกิดข้อผิดพลาดขึ้นในการดึงข้อมูลนะ"
                data: "", // ข้อมูลส่งกลับปล่อยเป็นค่าว่างไว้ เพราะดึงข้อมูลมาไม่ได้
                errorMessage: error.message // ส่งข้อความสาเหตุที่ระบบพังไปให้หน้าบ้านเปิดอ่านดู
            };
        } finally { // บล็อกสุดท้ายจะทำงานเสมอ 100% ไม่ว่าระบบจะรันผ่านหรือรันพังก็ตาม
            if (conn) // เช็กดูว่าถ้าในกล่อง conn มีสายเชื่อมต่อค้างอยู่จริง ๆ
                conn.release(); // สั่งคืนสายเชื่อมต่อกลับเข้าอ่าง pool ทันที เพื่อไม่ให้เซิร์ฟเวอร์ค้างและกินแรม
        }

        return result; // ส่งก้อนผลลัพธ์สุดท้าย (ไม่ว่าจะสำเร็จหรือพัง) ในกล่อง result กลับคืนไปให้คนที่เรียกใช้ฟังก์ชันนี้
    },

    // หา company เดิมด้วยชื่อ+จังหวัดก่อน; ถ้าไม่พบจึง INSERT เพื่อลดรายการซ้ำ
    getOrCreateCompany: async (name, province, address = "", phone = "", mapUrl = "") => {
        let conn;
        try {
            conn = await pool.getConnection();
            const rows = await conn.query(
                "SELECT CompanyID, Province FROM Company WHERE LOWER(TRIM(CompanyName)) = LOWER(TRIM(?)) AND (Province = ? OR Province IS NULL) LIMIT 1",
                [name, province]
            );
            if (rows.length) {
                await conn.query("UPDATE Company SET Province = COALESCE(Province, ?), Location = CASE WHEN ? = '' THEN Location ELSE ? END, Phone = CASE WHEN ? = '' THEN Phone ELSE ? END, MapUrl = CASE WHEN ? = '' THEN MapUrl ELSE ? END WHERE CompanyID = ?", [province, address, address, phone, phone, mapUrl, mapUrl, rows[0].CompanyID]);
                return { isError: false, data: { CompanyID: rows[0].CompanyID } };
            }
            const companyId = 'C' + require('crypto').randomUUID().replace(/-/g, '').slice(0, 19);
            await conn.query(
                "INSERT INTO Company (CompanyID, CompanyName, Province, Location, Phone, MapUrl) VALUES (?, ?, ?, ?, ?, ?)",
                [companyId, name, province, address || null, phone || null, mapUrl || null]
            );
            return { isError: false, data: { CompanyID: companyId } };
        } catch (error) {
            return { isError: true, errorMessage: error.message };
        } finally {
            if (conn) conn.release();
        }
    },

    // UPDATE บริษัทตาม CompanyID; ค่าเบอร์/แผนที่ที่ไม่ส่งมาจะคงค่าเดิม
    updateCompanyDetails: async (companyId, name, province, address, phone = null, mapUrl = null) => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.query(
                "UPDATE Company SET CompanyName = ?, Province = ?, Location = ?, Phone = CASE WHEN ? IS NULL THEN Phone ELSE NULLIF(?, '') END, MapUrl = CASE WHEN ? IS NULL THEN MapUrl ELSE NULLIF(?, '') END WHERE CompanyID = ?",
                [name, province, address || null, phone, phone, mapUrl, mapUrl, companyId]
            );
            return { isError: false };
        } catch (error) {
            return { isError: true, errorMessage: error.message };
        } finally {
            if (conn) conn.release();
        }
    },

    // ลบบริษัทตาม CompanyID; foreign key ของ Video จะทำให้ CompanyID เป็น NULL
    deleteCompany: async (companyId) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const result = await conn.query("DELETE FROM Company WHERE CompanyID = ?", [companyId]);
            if (!result.affectedRows) return { isError: true, errorMessage: "Company was not found" };
            return { isError: false, message: "Company deleted" };
        } catch (error) {
            return { isError: true, errorMessage: error.message };
        } finally {
            if (conn) conn.release();
        }
    },

    // รายงานจังหวัด: JOIN/ GROUP BY เพื่อรวมคลิปตามจังหวัด
    getVideoCountsByProvince: async () => {
        let conn;
        try {
            conn = await pool.getConnection();
            const rows = await conn.query(
                "SELECT COALESCE(NULLIF(TRIM(c.Province), ''), 'ไม่ระบุจังหวัด') AS Province, " +
                "COUNT(v.VideoID) AS VideoCount FROM Video v " +
                "LEFT JOIN Company c ON c.CompanyID = v.CompanyID " +
                "GROUP BY COALESCE(NULLIF(TRIM(c.Province), ''), 'ไม่ระบุจังหวัด') " +
                "ORDER BY VideoCount DESC, Province"
            );
            return { isError: false, data: rows, errorMessage: "" };
        } catch (error) {
            return { isError: true, data: "", errorMessage: error.message };
        } finally {
            if (conn) conn.release();
        }
    },

    // รายงานต่อบริษัท: LEFT JOIN ทำให้บริษัทที่ยังไม่มีคลิปได้ยอดเป็น 0 ด้วย
    getCompanyVideoCounts: async () => {
        let conn;
        try {
            conn = await pool.getConnection();
            const rows = await conn.query(
                "SELECT c.CompanyID, c.CompanyName, COUNT(v.VideoID) AS VideoCount " +
                "FROM Company c LEFT JOIN Video v ON v.CompanyID = c.CompanyID " +
                "GROUP BY c.CompanyID, c.CompanyName ORDER BY c.CompanyName"
            );
            return { isError: false, data: rows, errorMessage: "" };
        } catch (error) {
            return { isError: true, data: "", errorMessage: error.message };
        } finally {
            if (conn) conn.release();
        }
    }
};

// ฟังก์ชันนี้มีหลักการทำงานง่าย ๆ ครับ คือทำหน้าที่เป็น 
// "คนไปกวาดรายชื่อบริษัททั้งหมด" โดยการเปิดประตูเชื่อมต่อเข้าไปแล้วสั่ง SELECT CompanyID, CompanyName FROM Company
// เพื่อเอาท์พุตรายชื่อบริษัทที่มีในระบบ (เช่น บริษัทฝึกงานต่าง ๆ)
// ส่งไปกองให้หน้าบ้านนำไปแสดงผลในกล่องตัวเลือก (Dropdown) เพื่อให้ผู้ใช้เลือกข้อมูลได้ถูกต้องครับ
