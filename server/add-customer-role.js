import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const db = new Database("trambom.db");

try {
    // Bắt đầu giao dịch
    db.exec("BEGIN");

    // 1. Tạo bảng users mới cho phép 3 quyền
    db.exec(`
        CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'employee', 'customer')),
            created_at TEXT NOT NULL
        )
    `);

    // 2. Chuyển tài khoản hiện tại sang bảng mới
    db.exec(`
        INSERT INTO users_new
        (id, username, password_hash, role, created_at)
        SELECT id, username, password_hash, role, created_at
        FROM users
    `);

    // 3. Xóa bảng cũ
    db.exec(`DROP TABLE users`);

    // 4. Đổi tên bảng mới
    db.exec(`ALTER TABLE users_new RENAME TO users`);

    // 5. Tạo tài khoản khách hàng
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

    db.exec("COMMIT");

    console.log("=================================");
    console.log("✅ Đã mở quyền khách hàng!");
    console.log("=================================");
    console.log("Admin:");
    console.log("  admin / admin123");
    console.log("");
    console.log("Nhân viên:");
    console.log("  nhanvien / nv123456");
    console.log("");
    console.log("Khách hàng:");
    console.log("  khachhang / khach123");
    console.log("=================================");

} catch (error) {
    db.exec("ROLLBACK");
    console.error("❌ Lỗi:", error);
}

db.close();