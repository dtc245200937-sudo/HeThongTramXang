import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const db = new Database("trambom.db");

db.pragma("foreign_keys = ON");

// ===============================
// TẠO BẢNG TRẠM XĂNG
// ===============================
db.exec(`
    CREATE TABLE IF NOT EXISTS stations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        location TEXT NOT NULL
    )
`);

// ===============================
// TẠO BẢNG GIÁ NHIÊN LIỆU
// ===============================
db.exec(`
    CREATE TABLE IF NOT EXISTS prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id INTEGER NOT NULL,
        fuel_type TEXT NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (station_id)
        REFERENCES stations(id)
        ON DELETE CASCADE,
        UNIQUE(station_id, fuel_type)
    )
`);

// ===============================
// BẢNG GIAO DỊCH KHO
// ===============================
db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id INTEGER NOT NULL,
        fuel_type TEXT NOT NULL,
        transaction_type TEXT NOT NULL,
        quantity REAL NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (station_id)
            REFERENCES stations(id)
            ON DELETE CASCADE
    )
`);

// ===============================
// BẢNG TỒN KHO
// ===============================
db.exec(`
    CREATE TABLE IF NOT EXISTS inventories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id INTEGER NOT NULL,
        fuel_type TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 0,
        FOREIGN KEY (station_id)
            REFERENCES stations(id)
            ON DELETE CASCADE,
        UNIQUE (station_id, fuel_type)
    )
`);

// ===============================
// BẢNG NGƯỜI DÙNG (USERS)
// ===============================
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'employee', 'customer')),
        created_at TEXT NOT NULL
    )
`);

// ===============================
// SEED DỮ LIỆU BẢNG USERS
// ===============================
const now = new Date().toISOString();
const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users
    (username, password_hash, role, created_at)
    VALUES (?, ?, ?, ?)
`);

insertUser.run("admin", bcrypt.hashSync("admin123", 10), "admin", now);
insertUser.run("nhanvien", bcrypt.hashSync("nv123456", 10), "employee", now);
insertUser.run("khachhang", bcrypt.hashSync("khach123", 10), "customer", now);

// Add lat/lng columns if not exist
try {
    db.exec(`ALTER TABLE stations ADD COLUMN lat REAL`);
} catch (e) {}
try {
    db.exec(`ALTER TABLE stations ADD COLUMN lng REAL`);
} catch (e) {}

// ===============================
// DỮ LIỆU 4 TRẠM MẶC ĐỊNH
// ===============================
const stationsData = [
    {
        name: "Petrolimex Số 10",
        location: "Phan Đình Phùng, TP. Thái Nguyên",
        lat: 21.5937,
        lng: 105.8442,
        prices: { ron95: 24500, e5: 22500, diesel: 20500 }
    },
    {
        name: "Petrolimex Số 05",
        location: "Đường Hoàng Văn Thụ, TP. Thái Nguyên",
        lat: 21.5985,
        lng: 105.8360,
        prices: { ron95: 24300, e5: 22400, diesel: 20400 }
    },
    {
        name: "Cửa hàng số 1",
        location: "Đường Lương Ngọc Quyến, TP. Thái Nguyên",
        lat: 21.5850,
        lng: 105.8280,
        prices: { ron95: 24600, e5: 22600, diesel: 20600 }
    },
    {
        name: "PVOIL Tân Thịnh",
        location: "Tân Thịnh, TP. Thái Nguyên",
        lat: 21.5720,
        lng: 105.8150,
        prices: { ron95: 24400, e5: 22300, diesel: 20300 }
    }
];

const insertStation = db.prepare(`
    INSERT OR IGNORE INTO stations (name, location, lat, lng) VALUES (?, ?, ?, ?)
`);

const insertPrice = db.prepare(`
    INSERT OR IGNORE INTO prices (station_id, fuel_type, price) VALUES (?, ?, ?)
`);

const insertData = db.transaction(() => {
    for (const station of stationsData) {
        insertStation.run(station.name, station.location, station.lat, station.lng);
        const savedStation = db.prepare(`SELECT id FROM stations WHERE name = ?`).get(station.name);
        if (savedStation) {
            db.prepare(`UPDATE stations SET lat = ?, lng = ?, location = ? WHERE id = ?`).run(station.lat, station.lng, station.location, savedStation.id);
            insertPrice.run(savedStation.id, "ron95", station.prices.ron95);
            insertPrice.run(savedStation.id, "e5", station.prices.e5);
            insertPrice.run(savedStation.id, "diesel", station.prices.diesel);
        }
    }
});

insertData();

// ===============================
// SEED DỮ LIỆU TỒN KHO MẶC ĐỊNH
// ===============================
const inventoryData = [
    { station: "Petrolimex Số 10", ron95: 5000, e5: 3500, diesel: 4000 },
    { station: "Petrolimex Số 05", ron95: 4500, e5: 3000, diesel: 3800 },
    { station: "Cửa hàng số 1", ron95: 3200, e5: 2500, diesel: 2800 },
    { station: "PVOIL Tân Thịnh", ron95: 4000, e5: 2800, diesel: 3500 }
];

const insertInventory = db.prepare(`
    INSERT OR IGNORE INTO inventories (station_id, fuel_type, quantity) VALUES (?, ?, ?)
`);

for (const item of inventoryData) {
    const station = db.prepare(`SELECT id FROM stations WHERE name = ?`).get(item.station);
    if (!station) continue;
    insertInventory.run(station.id, "ron95", item.ron95);
    insertInventory.run(station.id, "e5", item.e5);
    insertInventory.run(station.id, "diesel", item.diesel);
}

console.log("✅ Database đã khởi tạo thành công!");

export default db;