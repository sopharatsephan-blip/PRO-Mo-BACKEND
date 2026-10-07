const mariadb = require('mariadb');

// สร้าง connection pool ใช้ร่วมกัน; model ขอ connection จาก pool แล้ว release หลัง query เสร็จ
const pool = mariadb.createPool({ 
    host: '127.0.0.1',
    user: 'root',
    password: '1234',            // รหัสผ่านตาม HeidiSQL
    port: 3307,                  // พอร์ตตาม HeidiSQL
    database: 'modul_c3', // ✨ แก้ตรงนี้เป็น video_summary_g15 ให้ตรงกับในรูป
    connectionLimit: 5
});

module.exports = pool;
