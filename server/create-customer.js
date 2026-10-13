import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const db = new Database("trambom.db");

const passwordHash = await bcrypt.hash("khach123", 10);

db.prepare(`
    INSERT OR IGNORE INTO users
    (username, password_hash, role, created_at)
    VALUES (?, ?, ?, ?)
`).run(
    "khachhang",
    passwordHash,
    "customer",
    new Date().toISOString()
);

console.log("✅ Đã tạo tài khoản khách hàng!");
console.log("Username: khachhang");
console.log("Password: khach123");
console.log("Role: customer");

db.close();