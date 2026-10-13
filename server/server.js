import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import db from "./database.js";

dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "tram-xang-secret-key";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "..");

app.use(cookieParser());
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

let ai = null;
if (process.env.GEMINI_API_KEY) {
    try {
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
        console.warn("⚠️ Không thể khởi tạo GoogleGenAI:", e.message);
    }
}

// ===============================
// MIDDLEWARE KIỂM TRA XÁC THỰC & QUYỀN
// ===============================
function requireAuth(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ message: "Bạn chưa đăng nhập" });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Bạn chưa đăng nhập" });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Bạn không có quyền thực hiện thao tác này" });
        }
        next();
    };
}

// =====================================================
// HÀM LẤY DỮ LIỆU TRẠM TỪ DATABASE
// =====================================================
function getStationDataFromDB() {
    let stations = [];
    try {
        stations = db.prepare(`SELECT id, name, location, lat, lng FROM stations ORDER BY name`).all();
    } catch (e) {
        stations = db.prepare(`SELECT id, name, location FROM stations ORDER BY name`).all();
    }

    const defaultCoords = [
        { lat: 21.5937, lng: 105.8442 },
        { lat: 21.5985, lng: 105.8360 },
        { lat: 21.5850, lng: 105.8280 },
        { lat: 21.5720, lng: 105.8150 },
        { lat: 21.6050, lng: 105.8320 }
    ];

    return stations.map((station, index) => {
        const prices = db.prepare(`
            SELECT fuel_type, price FROM prices WHERE station_id = ?
        `).all(station.id);

        const inventory = db.prepare(`
            SELECT fuel_type, quantity FROM inventories WHERE station_id = ?
        `).all(station.id);

        const priceData = { ron95: 0, e5: 0, diesel: 0 };
        prices.forEach(item => { priceData[item.fuel_type] = item.price; });

        const inventoryData = { ron95: 0, e5: 0, diesel: 0 };
        inventory.forEach(item => { inventoryData[item.fuel_type] = item.quantity; });

        const fallback = defaultCoords[index % defaultCoords.length];
        const lat = station.lat || fallback.lat;
        const lng = station.lng || fallback.lng;

        return {
            id: station.id,
            name: station.name,
            location: station.location,
            lat,
            lng,
            prices: priceData,
            inventory: inventoryData
        };
    });
}

// =====================================================
// API DANH SÁCH TRẠM
// =====================================================
app.get("/api/stations", (req, res) => {
    try {
        const stations = getStationDataFromDB();
        res.json(stations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Không thể lấy dữ liệu từ Database!" });
    }
});

// =====================================================
// THÊM TRẠM
// =====================================================
app.post("/api/stations/add", requireAuth, requireRole("admin"), (req, res) => {
    const { name, location } = req.body;
    if (!name || !location) {
        return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin!" });
    }
    try {
        const exists = db.prepare(`SELECT id FROM stations WHERE name = ?`).get(name);
        if (exists) {
            return res.status(400).json({ message: "Tên trạm đã tồn tại!" });
        }
        const result = db.prepare(`INSERT INTO stations (name, location) VALUES (?, ?)`).run(name, location);
        
        // Thêm giá và kho mặc định
        const stationId = result.lastInsertRowid;
        const insertPrice = db.prepare(`INSERT OR IGNORE INTO prices (station_id, fuel_type, price) VALUES (?, ?, ?)`);
        insertPrice.run(stationId, "ron95", 24500);
        insertPrice.run(stationId, "e5", 22500);
        insertPrice.run(stationId, "diesel", 20500);

        const insertInv = db.prepare(`INSERT OR IGNORE INTO inventories (station_id, fuel_type, quantity) VALUES (?, ?, ?)`);
        insertInv.run(stationId, "ron95", 3000);
        insertInv.run(stationId, "e5", 3000);
        insertInv.run(stationId, "diesel", 3000);

        res.json({ message: "Thêm trạm thành công!", id: stationId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Không thể thêm trạm!" });
    }
});

// =====================================================
// SỬA TRẠM
// =====================================================
app.put("/api/stations/update", requireAuth, requireRole("admin"), (req, res) => {
    const { oldName, name, location } = req.body;
    if (!oldName || !name || !location) {
        return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin!" });
    }
    try {
        const station = db.prepare(`SELECT * FROM stations WHERE name = ?`).get(oldName);
        if (!station) {
            return res.status(404).json({ message: "Không tìm thấy trạm!" });
        }
        if (oldName !== name) {
            const exists = db.prepare(`SELECT id FROM stations WHERE name = ?`).get(name);
            if (exists) {
                return res.status(400).json({ message: "Tên trạm mới đã tồn tại!" });
            }
        }
        db.prepare(`UPDATE stations SET name = ?, location = ? WHERE id = ?`).run(name, location, station.id);
        res.json({ message: "Cập nhật trạm thành công!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Không thể cập nhật trạm!" });
    }
});

// =====================================================
// XÓA TRẠM
// =====================================================
app.delete("/api/stations/delete", requireAuth, requireRole("admin"), (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: "Thiếu tên trạm!" });
    }
    try {
        const station = db.prepare(`SELECT id FROM stations WHERE name = ?`).get(name);
        if (!station) {
            return res.status(404).json({ message: "Không tìm thấy trạm!" });
        }
        db.prepare(`DELETE FROM stations WHERE id = ?`).run(station.id);
        res.json({ message: "Xóa trạm thành công!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Không thể xóa trạm!" });
    }
});

// =====================================================
// API DỮ LIỆU CHO AI
// =====================================================
app.get("/api/ai/context", (req, res) => {
    try {
        const data = getStationDataFromDB();
        res.json(data);
    } catch (error) {
        console.error("Lỗi lấy dữ liệu AI:", error);
        res.status(500).json({ message: "Không thể lấy dữ liệu từ Database!" });
    }
});

// =====================================================
// CẬP NHẬT GIÁ
// =====================================================
let priceHistory = [];

app.post("/api/prices/update", requireAuth, requireRole("admin"), (req, res) => {
    const { stationName, fuelType, price } = req.body;
    if (!stationName || !fuelType || price === undefined) {
        return res.status(400).json({ message: "Thiếu thông tin cập nhật giá!" });
    }
    const validFuelTypes = ["ron95", "e5", "diesel"];
    if (!validFuelTypes.includes(fuelType)) {
        return res.status(400).json({ message: "Loại nhiên liệu không hợp lệ!" });
    }
    const newPrice = Number(price);
    if (isNaN(newPrice) || newPrice <= 0) {
        return res.status(400).json({ message: "Giá không hợp lệ!" });
    }
    try {
        const station = db.prepare(`SELECT id, name FROM stations WHERE name = ?`).get(stationName);
        if (!station) {
            return res.status(404).json({ message: "Không tìm thấy trạm!" });
        }
        const oldData = db.prepare(`SELECT price FROM prices WHERE station_id = ? AND fuel_type = ?`).get(station.id, fuelType);
        const oldPrice = oldData ? oldData.price : 0;

        if (oldData) {
            db.prepare(`UPDATE prices SET price = ? WHERE station_id = ? AND fuel_type = ?`).run(newPrice, station.id, fuelType);
        } else {
            db.prepare(`INSERT INTO prices (station_id, fuel_type, price) VALUES (?, ?, ?)`).run(station.id, fuelType, newPrice);
        }

        priceHistory.unshift({
            stationName,
            fuelType,
            oldPrice,
            newPrice,
            updatedAt: new Date().toLocaleString("vi-VN")
        });

        res.json({
            message: "Cập nhật giá thành công!",
            station: station.name,
            fuelType,
            oldPrice,
            price: newPrice
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Không thể cập nhật giá!" });
    }
});

// =====================================================
// LỊCH SỬ GIÁ
// =====================================================
app.get("/api/prices/history", (req, res) => {
    res.json(priceHistory);
});

app.delete("/api/prices/history", requireAuth, requireRole("admin"), (req, res) => {
    priceHistory = [];
    res.json({ message: "Đã xóa toàn bộ lịch sử cập nhật giá!" });
});

// =====================================================
// NHẬP NHIÊN LIỆU
// =====================================================
app.post("/api/inventory/import", requireAuth, requireRole("admin", "employee"), (req, res) => {
    const { stationName, fuelType, quantity } = req.body;
    if (!stationName || !fuelType || quantity === undefined) {
        return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin!" });
    }
    const validFuelTypes = ["ron95", "e5", "diesel"];
    if (!validFuelTypes.includes(fuelType)) {
        return res.status(400).json({ message: "Loại nhiên liệu không hợp lệ!" });
    }
    const amount = Number(quantity);
    if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Số lượng phải lớn hơn 0!" });
    }
    try {
        const station = db.prepare(`SELECT id, name FROM stations WHERE name = ?`).get(stationName);
        if (!station) {
            return res.status(404).json({ message: "Không tìm thấy trạm!" });
        }
        let inventory = db.prepare(`SELECT quantity FROM inventories WHERE station_id = ? AND fuel_type = ?`).get(station.id, fuelType);
        let oldQuantity = inventory ? inventory.quantity : 0;
        let newQuantity = oldQuantity + amount;

        if (inventory) {
            db.prepare(`UPDATE inventories SET quantity = ? WHERE station_id = ? AND fuel_type = ?`).run(newQuantity, station.id, fuelType);
        } else {
            db.prepare(`INSERT INTO inventories (station_id, fuel_type, quantity) VALUES (?, ?, ?)`).run(station.id, fuelType, newQuantity);
        }

        db.prepare(`
            INSERT INTO inventory_transactions (station_id, fuel_type, transaction_type, quantity, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(station.id, fuelType, "import", amount, new Date().toISOString());

        res.json({
            message: "Nhập nhiên liệu thành công!",
            station: station.name,
            fuelType,
            oldQuantity,
            importedQuantity: amount,
            newQuantity
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Không thể nhập nhiên liệu!" });
    }
});

// =====================================================
// XUẤT / BÁN NHIÊN LIỆU
// =====================================================
app.post("/api/inventory/export", requireAuth, requireRole("admin", "employee"), (req, res) => {
    const { stationName, fuelType, quantity } = req.body;
    if (!stationName || !fuelType || quantity === undefined) {
        return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin!" });
    }
    const validFuelTypes = ["ron95", "e5", "diesel"];
    if (!validFuelTypes.includes(fuelType)) {
        return res.status(400).json({ message: "Loại nhiên liệu không hợp lệ!" });
    }
    const amount = Number(quantity);
    if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Số lượng phải lớn hơn 0!" });
    }
    try {
        const station = db.prepare(`SELECT id, name FROM stations WHERE name = ?`).get(stationName);
        if (!station) {
            return res.status(404).json({ message: "Không tìm thấy trạm!" });
        }
        const inventory = db.prepare(`SELECT quantity FROM inventories WHERE station_id = ? AND fuel_type = ?`).get(station.id, fuelType);
        if (!inventory) {
            return res.status(404).json({ message: "Không tìm thấy kho nhiên liệu!" });
        }
        const oldQuantity = inventory.quantity;
        if (amount > oldQuantity) {
            return res.status(400).json({ message: `Không đủ nhiên liệu! Tồn kho hiện tại chỉ còn ${oldQuantity} lít.` });
        }
        const newQuantity = oldQuantity - amount;

        db.prepare(`UPDATE inventories SET quantity = ? WHERE station_id = ? AND fuel_type = ?`).run(newQuantity, station.id, fuelType);
        db.prepare(`
            INSERT INTO inventory_transactions (station_id, fuel_type, transaction_type, quantity, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(station.id, fuelType, "export", amount, new Date().toISOString());

        res.json({
            message: "Xuất nhiên liệu thành công!",
            station: station.name,
            fuelType,
            oldQuantity,
            exportedQuantity: amount,
            newQuantity
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Không thể xuất nhiên liệu!" });
    }
});

// =====================================================
// LẤY TỒN KHO
// =====================================================
app.get("/api/inventory", (req, res) => {
    try {
        const inventory = db.prepare(`
            SELECT
                inventories.id,
                stations.name AS stationName,
                stations.location,
                inventories.fuel_type AS fuelType,
                inventories.quantity
            FROM inventories
            INNER JOIN stations ON inventories.station_id = stations.id
            ORDER BY stations.name, inventories.fuel_type
        `).all();
        res.json(inventory);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Không thể lấy dữ liệu tồn kho!" });
    }
});

// =====================================================
// LỊCH SỬ GIAO DỊCH KHO
// =====================================================
app.get("/api/inventory/transactions", (req, res) => {
    try {
        const transactions = db.prepare(`
            SELECT
                inventory_transactions.id,
                stations.name AS stationName,
                inventory_transactions.fuel_type AS fuelType,
                inventory_transactions.transaction_type AS transactionType,
                inventory_transactions.quantity,
                inventory_transactions.created_at AS createdAt
            FROM inventory_transactions
            INNER JOIN stations ON inventory_transactions.station_id = stations.id
            ORDER BY inventory_transactions.id DESC
        `).all();
        res.json(transactions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Không thể lấy lịch sử giao dịch kho!" });
    }
});
    // =====================================================
// CHATBOT AI - GEMINI TRỢ LÝ ĐA NĂNG
// =====================================================
app.post("/api/chat", async (req, res) => {
    try {
        const message = req.body.message?.trim();

        if (!message) {
            return res.status(400).json({
                error: "Chưa có câu hỏi"
            });
        }

        // Lấy dữ liệu thực tế từ Database
        const stationData = getStationDataFromDB();
        const lowerMessage = message.toLowerCase();

        // =====================================================
        // 1. XỬ LÝ DỮ LIỆU HỆ THỐNG
        // =====================================================

        const station = stationData.find(item =>
            lowerMessage.includes(item.name.toLowerCase())
        );

        // Thông tin giá trạm
        if (
            station &&
            (
                lowerMessage.includes("giá") ||
                lowerMessage.includes("nhiên liệu") ||
                lowerMessage.includes("thông tin") ||
                lowerMessage.includes("chi tiết")
            )
        ) {
            return res.json({
                reply:
                    `⛽ Thông tin ${station.name}:\n\n` +
                    `📍 Địa điểm: ${station.location}\n\n` +
                    `💰 Giá nhiên liệu:\n` +
                    `• RON95: ${station.prices.ron95.toLocaleString("vi-VN")} đồng/lít\n` +
                    `• E5 RON92: ${station.prices.e5.toLocaleString("vi-VN")} đồng/lít\n` +
                    `• Diesel: ${station.prices.diesel.toLocaleString("vi-VN")} đồng/lít`
            });
        }

        // Tồn kho
        if (
            station &&
            (
                lowerMessage.includes("tồn kho") ||
                lowerMessage.includes("còn bao nhiêu") ||
                lowerMessage.includes("trong kho")
            )
        ) {
            return res.json({
                reply:
                    `📦 Tồn kho của ${station.name}:\n\n` +
                    `• RON95: ${station.inventory.ron95.toLocaleString("vi-VN")} lít\n` +
                    `• E5 RON92: ${station.inventory.e5.toLocaleString("vi-VN")} lít\n` +
                    `• Diesel: ${station.inventory.diesel.toLocaleString("vi-VN")} lít`
            });
        }

        // Vị trí trạm
        if (
            station &&
            (
                lowerMessage.includes("ở đâu") ||
                lowerMessage.includes("địa chỉ") ||
                lowerMessage.includes("chỉ đường") ||
                lowerMessage.includes("vị trí")
            )
        ) {
            const mapUrl =
                "https://www.google.com/maps/search/?api=1&query=" +
                encodeURIComponent(
                    station.name + " " + station.location
                );

            return res.json({
                reply:
                    `📍 ${station.name}\n` +
                    `Địa điểm: ${station.location}\n\n` +
                    `🧭 Chỉ đường:\n${mapUrl}`
            });
        }

        // Danh sách trạm
        if (
            lowerMessage.includes("các trạm") ||
            lowerMessage.includes("danh sách trạm") ||
            lowerMessage.includes("có những trạm") ||
            lowerMessage.includes("có trạm nào")
        ) {
            const stationList = stationData
                .map(
                    (s, index) =>
                        `${index + 1}. ${s.name} - ${s.location}`
                )
                .join("\n");

            return res.json({
                reply:
                    `⛽ Các trạm hiện có trong hệ thống:\n\n${stationList}`
            });
        }

        // Tính tiền đổ xăng
        const literMatch = lowerMessage.match(
            /(\d+(?:[.,]\d+)?)\s*(lít|lit|l)/i
        );

        if (
            literMatch &&
            (
                lowerMessage.includes("đổ") ||
                lowerMessage.includes("tính tiền") ||
                lowerMessage.includes("bao nhiêu tiền") ||
                lowerMessage.includes("chi phí")
            )
        ) {
            const liters = parseFloat(
                literMatch[1].replace(",", ".")
            );

            let fuelType = "ron95";

            if (
                lowerMessage.includes("e5") ||
                lowerMessage.includes("ron92")
            ) {
                fuelType = "e5";
            }

            if (
                lowerMessage.includes("diesel") ||
                lowerMessage.includes("dầu")
            ) {
                fuelType = "diesel";
            }

            const stationForPrice = stationData[0];

            if (stationForPrice) {
                const price = stationForPrice.prices[fuelType];
                const total = liters * price;

                const fuelName = {
                    ron95: "RON95",
                    e5: "E5 RON92",
                    diesel: "Diesel"
                };

                return res.json({
                    reply:
                        `🧮 Tính tiền đổ nhiên liệu:\n\n` +
                        `• Loại: ${fuelName[fuelType]}\n` +
                        `• Số lượng: ${liters} lít\n` +
                        `• Giá: ${price.toLocaleString("vi-VN")} đồng/lít\n` +
                        `• Tổng tiền: ${total.toLocaleString("vi-VN")} đồng`
                });
            }
        }

        // =====================================================
        // 2. GEMINI AI - TRỢ LÝ ĐA NĂNG
        // =====================================================

        if (ai) {
            const response = await ai.models.generateContent({
                model: "gemini-3.6-flash",
                contents: message,

                config: {
                    systemInstruction: `
Bạn là trợ lý AI đa năng của Hệ thống Quản lý Trạm Xăng Thái Nguyên.

Bạn KHÔNG chỉ trả lời về xăng dầu.

Bạn có thể trả lời mọi câu hỏi hợp lệ mà khách hàng đặt ra.

Bạn có thể trả lời về:
- Xăng dầu
- Nhiên liệu
- Ô tô
- Xe máy
- Động cơ
- Bảo dưỡng xe
- Công nghệ
- Máy tính
- Lập trình
- HTML
- CSS
- JavaScript
- Học tập
- Kiến thức phổ thông
- Đời sống
- Viết văn
- Dịch thuật
- Giải thích khái niệm
- Các câu hỏi giao tiếp thông thường
- Và các câu hỏi hợp lệ khác.

QUY TẮC:

Nếu khách hàng hỏi về dữ liệu của hệ thống trạm xăng,
hãy ưu tiên sử dụng DATABASE được cung cấp bên dưới.

Không được tự bịa:
- Giá nhiên liệu
- Tồn kho
- Tên trạm
- Địa điểm
- Dữ liệu hệ thống

Nếu DATABASE không có thông tin mà khách hàng yêu cầu,
hãy nói rõ rằng thông tin đó chưa có trong hệ thống.

Nếu câu hỏi KHÔNG liên quan đến hệ thống trạm xăng,
hãy trả lời bình thường bằng kiến thức của Gemini.

KHÔNG được nói:
"Tôi chỉ có thể trả lời câu hỏi về xăng dầu."

Không được từ chối câu hỏi chỉ vì câu hỏi không liên quan
đến trạm xăng.

Nếu người dùng hỏi bằng tiếng Việt thì trả lời bằng tiếng Việt.

Hãy trả lời tự nhiên, thân thiện, dễ hiểu và chính xác.

DỮ LIỆU DATABASE HIỆN TẠI:
${JSON.stringify(stationData, null, 2)}
                    `
                }
            });

            return res.json({
                reply: response.text
            });
        }

        // =====================================================
        // 3. KHÔNG CÓ GEMINI API
        // =====================================================

        return res.json({
            reply:
                "⚠️ Gemini AI chưa được kết nối. " +
                "Vui lòng kiểm tra GEMINI_API_KEY trong file .env."
        });

    } catch (error) {
        console.error("❌ Lỗi AI Chat:", error);

        return res.status(500).json({
            error: "Không thể phản hồi tin nhắn AI",
            detail: error.message
        });
    }
});    
// ===============================
// ĐĂNG NHẬP
// ===============================
app.post("/api/auth/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "Vui lòng nhập username và password" });
        }
        const user = db.prepare(`SELECT * FROM users WHERE username = ?`).get(username);
        if (!user) {
            return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: "8h" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            maxAge: 8 * 60 * 60 * 1000
        });

        res.json({
            message: "Đăng nhập thành công",
            user: { id: user.id, username: user.username, role: user.role }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi server" });
    }
});
// ===============================
// ĐĂNG XUẤT
// ===============================
app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        sameSite: "lax",
        secure: false
    });
    res.json({ message: "Đăng xuất thành công" });
});

// ===============================
// KIỂM TRA USER HIỆN TẠI
// ===============================
app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json({ user: req.user });
});

// ==========================================
// BÁO CÁO & THỐNG KÊ
// ==========================================
app.get("/api/reports/summary", requireAuth, (req, res) => {
    try {
        const stationCount = db.prepare(`SELECT COUNT(*) AS total FROM stations`).get().total;
        const totalInventory = db.prepare(`SELECT COALESCE(SUM(quantity), 0) AS total FROM inventories`).get().total;
        const totalImport = db.prepare(`SELECT COALESCE(SUM(quantity), 0) AS total FROM inventory_transactions WHERE transaction_type = 'import'`).get().total;
        const totalExport = db.prepare(`SELECT COALESCE(SUM(quantity), 0) AS total FROM inventory_transactions WHERE transaction_type = 'export'`).get().total;

        const inventoryByFuel = db.prepare(`
            SELECT fuel_type, SUM(quantity) AS quantity FROM inventories GROUP BY fuel_type ORDER BY fuel_type
        `).all();

        const transactionsByDate = db.prepare(`
            SELECT substr(created_at, 1, 10) AS date, transaction_type, SUM(quantity) AS quantity
            FROM inventory_transactions GROUP BY date, transaction_type ORDER BY date DESC
        `).all();

        const lowInventory = db.prepare(`
            SELECT s.name AS stationName, i.fuel_type AS fuelType, i.quantity
            FROM inventories i JOIN stations s ON s.id = i.station_id WHERE i.quantity < 3000 ORDER BY i.quantity ASC
        `).all();

        const prices = db.prepare(`
            SELECT s.name AS stationName, p.fuel_type AS fuelType, p.price
            FROM prices p JOIN stations s ON s.id = p.station_id ORDER BY s.name, p.fuel_type
        `).all();

        res.json({
            stationCount,
            totalInventory,
            totalImport,
            totalExport,
            inventoryByFuel,
            transactionsByDate,
            lowInventory,
            prices
        });
    } catch (error) {
        console.error("Lỗi báo cáo:", error);
        res.status(500).json({ message: "Không thể lấy dữ liệu báo cáo" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server đang chạy tại port ${PORT}`);
});