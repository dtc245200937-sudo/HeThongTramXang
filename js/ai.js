// ==========================================
// TRỢ LÝ AI - KẾT NỐI GEMINI
// ==========================================

// Giá nhiên liệu mẫu
const fuelPrices = {
    ron95: 24500,
    e5: 22500,
    diesel: 20500
};

// Dữ liệu trạm mẫu
const stations = [
    {
        name: "Petrolimex Số 10",
        address: "Thái Nguyên",
        ron95: 24500,
        e5: 22500,
        diesel: 20500
    },
    {
        name: "Petrolimex Số 05",
        address: "Thái Nguyên",
        ron95: 24300,
        e5: 22400,
        diesel: 20400
    },
    {
        name: "Cửa hàng số 1",
        address: "Thái Nguyên",
        ron95: 24600,
        e5: 22600,
        diesel: 20600
    },
    {
        name: "PVOIL Tân Thịnh",
        address: "Thái Nguyên",
        ron95: 24400,
        e5: 22300,
        diesel: 20300
    }
];


// ==========================================
// GỬI TIN NHẮN
// ==========================================

async function sendMessage() {

    const input = document.getElementById("userInput");

    const message = input.value.trim();

    if (message === "") {
        return;
    }

    // Hiển thị câu hỏi người dùng
    addMessage(message, "user-message");

    // Xóa ô nhập
    input.value = "";

    // Hiển thị trạng thái đang trả lời
    addMessage("🤖 Đang suy nghĩ...", "ai-message");

    const chatContent = document.getElementById("chatContent");

    // Lấy tin nhắn "Đang suy nghĩ..."
    const loadingMessage =
        chatContent.lastElementChild;

    try {

        // ======================================
        // 1. CÂU HỎI TÍNH TIỀN
        // ======================================

        if (
            message.toLowerCase().includes("chi phí") ||
            message.toLowerCase().includes("tính tiền") ||
            message.toLowerCase().includes("hết bao nhiêu") ||
            message.toLowerCase().includes("bao nhiêu tiền") ||
            message.toLowerCase().includes("đổ")
        ) {

            const question = message.toLowerCase();

            const liters = extractLiters(question);

            if (liters > 0) {

                let fuelName = "RON95";
                let price = fuelPrices.ron95;

                if (
                    question.includes("e5") ||
                    question.includes("ron92") ||
                    question.includes("ron 92")
                ) {
                    fuelName = "E5 RON92";
                    price = fuelPrices.e5;
                }

                if (
                    question.includes("diesel") ||
                    question.includes("dầu")
                ) {
                    fuelName = "Diesel";
                    price = fuelPrices.diesel;
                }

                const total = price * liters;

                loadingMessage.innerHTML = `
                    Nếu đổ <b>${liters} lít ${fuelName}</b>:

                    <br><br>

                    ${price.toLocaleString("vi-VN")} đ/L
                    × ${liters} L

                    <br><br>

                    💰 <b>Tổng chi phí:
                    ${total.toLocaleString("vi-VN")} đ</b>

                    <br><br>

                    <small>
                    Đây là phép tính dựa trên
                    giá mẫu đang có trong hệ thống.
                    </small>
                `;

                return;
            }
        }


        // ======================================
        // 2. GỌI GEMINI
        // ======================================

        const answer = await askGemini(message);

        loadingMessage.innerHTML = answer;

    } catch (error) {

        console.error(error);

        loadingMessage.innerHTML =
            "⚠️ Có lỗi khi kết nối với AI.";

    }
}


// ==========================================
// KẾT NỐI GEMINI BACKEND
// ==========================================

async function askGemini(question) {

    try {

        const response = await fetch("/api/chat",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    message: question
                })
            }
        );
    
        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Lỗi server"
            );
        }

        return data.reply;

    } catch (error) {

        console.error(
            "Lỗi kết nối Gemini:",
            error
        );

        return `
            ⚠️ Không thể kết nối với Gemini.

            <br><br>

            Hãy kiểm tra xem
            <b>server.js</b> đã được chạy chưa.
        `;
    }
}


// ==========================================
// LẤY SỐ LÍT
// ==========================================

function extractLiters(question) {

    const match = question.match(
        /(\d+(?:[.,]\d+)?)\s*(?:lít|lit|l)/
    );

    if (!match) {
        return 0;
    }

    return Number(
        match[1].replace(",", ".")
    );
}


// ==========================================
// HIỂN THỊ TIN NHẮN
// ==========================================
function formatAIMessage(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return text.replace(urlRegex, function(url) {
        return `
            <br>
            <a href="${url}" target="_blank" class="direction-button">
                🧭 Chỉ đường
            </a>
        `;
    });
}
function addMessage(text, className) {


    const chatContent =
        document.getElementById("chatContent");

    const message =
        document.createElement("div");

    message.className =
        "message " + className;

    message.innerHTML = formatAIMessage(text);

    chatContent.appendChild(message);

    chatContent.scrollTop =
        chatContent.scrollHeight;
}


// ==========================================
// CÂU HỎI GỢI Ý
// ==========================================

function askQuestion(question) {

    document.getElementById("userInput").value =
        question;

    sendMessage();
}


// ==========================================
// NHẤN ENTER
// ==========================================

document
    .getElementById("userInput")
    .addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Enter") {
                sendMessage();
            }

        }
    );