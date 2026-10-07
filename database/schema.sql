CREATE DATABASE IF NOT EXISTS modul_c3
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE modul_c3;

-- Role ผูกกับ Customer เพื่อแยกสิทธิ์ เช่น Admin และสมาชิกทั่วไป
CREATE TABLE IF NOT EXISTS Role (
  RoleID VARCHAR(15) NOT NULL,
  RoleName VARCHAR(30) NOT NULL,
  PRIMARY KEY (RoleID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customer เก็บบัญชี; Password ต้องเป็น hash และ Username ห้ามซ้ำ
CREATE TABLE IF NOT EXISTS Customer (
  UID VARCHAR(20) NOT NULL,
  FirstName VARCHAR(30) NOT NULL,
  LastName VARCHAR(30) NOT NULL,
  Username VARCHAR(20) NOT NULL,
  Password VARCHAR(255) NOT NULL COMMENT 'Password hash',
  RoleID VARCHAR(15) NOT NULL,
  Email VARCHAR(50) NULL,
  PRIMARY KEY (UID),
  UNIQUE KEY uq_customer_username (Username),
  KEY idx_customer_role (RoleID),
  CONSTRAINT fk_customer_role FOREIGN KEY (RoleID)
    REFERENCES Role (RoleID) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Company เก็บชื่อ/ที่อยู่/จังหวัด/โทรศัพท์/ลิงก์แผนที่สำหรับหน้าข้อมูลบริษัท
CREATE TABLE IF NOT EXISTS Company (
  CompanyID VARCHAR(20) NOT NULL,
  CompanyName VARCHAR(255) NOT NULL,
  Location VARCHAR(255) NULL,
  Province VARCHAR(100) NULL,
  Phone VARCHAR(30) NULL,
  MapUrl VARCHAR(500) NULL,
  BusinessTypes VARCHAR(100) NULL,
  WorkType VARCHAR(50) NULL,
  PRIMARY KEY (CompanyID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS VideoStatus (
  VideoStatusID VARCHAR(15) NOT NULL,
  StatusName VARCHAR(50) NOT NULL,
  PRIMARY KEY (VideoStatusID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Video ผูกเจ้าของกับ Customer และบริษัทกับ Company; foreign key คุมความสัมพันธ์ของข้อมูล
CREATE TABLE IF NOT EXISTS Video (
  VideoID VARCHAR(20) NOT NULL,
  UID VARCHAR(20) NOT NULL,
  VideoStatusID VARCHAR(15) NOT NULL,
  CompanyID VARCHAR(20) NULL,
  VideoTitle VARCHAR(100) NOT NULL,
  VideoPath VARCHAR(255) NOT NULL,
  UploadDate DATE NULL,
  ViewCount INT NOT NULL DEFAULT 0,
  VisibilityType VARCHAR(20) NOT NULL DEFAULT 'Private',
  PRIMARY KEY (VideoID),
  KEY idx_video_uid_upload_date (UID, UploadDate),
  KEY idx_video_company (CompanyID),
  KEY idx_video_status (VideoStatusID),
  CONSTRAINT fk_video_customer FOREIGN KEY (UID)
    REFERENCES Customer (UID) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_video_company FOREIGN KEY (CompanyID)
    REFERENCES Company (CompanyID) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_video_status FOREIGN KEY (VideoStatusID)
    REFERENCES VideoStatus (VideoStatusID) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=UTF8MB4_UNICODE_CI;

INSERT INTO Role (RoleID, RoleName)
VALUES ('R001', 'Admin');

INSERT IGNORE INTO Role (RoleID, RoleName)
VALUES ('R002', 'สมาชิกทั่วไป');

INSERT INTO Customer
  (UID, FirstName, LastName, Username, Password, RoleID, Email)
VALUES
  ('UID900', 'Test', 'User', 'testlogin',
   '$2b$10$iXaRhtVBMS0Q1PxzmY.rqeW4kEREKqtodbNLiNv9B3uicoyidUjpu',
   'R001', 'testlogin@example.com');
