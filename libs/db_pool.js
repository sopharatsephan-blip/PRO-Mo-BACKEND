const mariadb = require('mariadb');

const pool = mariadb.createPool({ 
    host: '127.0.0.1',
    user: 'root',
    password: '1234',            // รหัสผ่านตาม HeidiSQL
    port: 3307,                  // พอร์ตตาม HeidiSQL
    database: 'video_summary_g15', // ✨ แก้ตรงนี้เป็น video_summary_g15 ให้ตรงกับในรูป
    connectionLimit: 5
});

module.exports = pool;