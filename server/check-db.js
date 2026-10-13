import Database from "better-sqlite3";

const db = new Database("trambom.db");

console.log("===== CÁC BẢNG TRONG DATABASE =====");

const tables = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    ORDER BY name
`).all();

console.log(tables);

console.log("\n===== GIAO DỊCH KHO =====");

const transactions = db.prepare(`
    SELECT *
    FROM inventory_transactions
`).all();

console.log(transactions);

db.close();