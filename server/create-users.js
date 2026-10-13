import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const db = new Database("trambom.db");

// Tạo bảng users
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
        created_at TEXT NOT NULL
    );
`);

const now = new Date().toISOString();

// Mật khẩu
const adminPassword = await bcrypt.hash("admin123", 10);
const employeePassword = await bcrypt.hash("nv123456", 10);

// Thêm Admin
const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users
    (username, password_hash, role, created_at)
    VALUES (?, ?, ?, ?)
`);

insertUser.run(
    "admin",
    adminPassword,
    "admin",
    now
);

// Thêm Nhân viên
insertUser.run(
    "nhanvien",
    employeePassword,
    "employee",
    now
);

console.log("=================================");
console.log("✅ Tạo bảng users thành công!");
console.log("=================================");
console.log("Tài khoản Admin:");
console.log("Username: admin");
console.log("Password: admin123");
console.log("");
console.log("Tài khoản Nhân viên:");
console.log("Username: nhanvien");
console.log("Password: nv123456");
console.log("=================================");

const users = db.prepare(`
    SELECT id, username, role, created_at
    FROM users
`).all();

console.log("Danh sách tài khoản:");
console.table(users);

db.close();