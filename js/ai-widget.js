// ==========================================
// FLOATING AI CHATBOT WIDGET CHO HỆ THỐNG
// ==========================================

(function () {
    // Thêm CSS cho Widget AI
    const style = document.createElement("style");
    style.innerHTML = `
        /* Nút Chat Widget Float */
        .ai-widget-button {
            position: fixed;
            bottom: 25px;
            right: 25px;
            background: linear-gradient(135deg, #0f766e, #0d9488);
            color: white;
            border: none;
            border-radius: 50px;
            padding: 14px 22px;
            font-size: 15px;
            font-weight: bold;
            box-shadow: 0 8px 25px rgba(15, 118, 110, 0.4);
            cursor: pointer;
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s ease;
        }

        .ai-widget-button:hover {
            transform: translateY(-3px) scale(1.03);
            box-shadow: 0 12px 30px rgba(15, 118, 110, 0.5);
        }

        .ai-widget-badge {
            background: #ef4444;
            color: white;
            font-size: 11px;
            padding: 2px 7px;
            border-radius: 20px;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }

        /* Khung cửa sổ Chat Popup */
        .ai-widget-window {
            position: fixed;
            bottom: 90px;
            right: 25px;
            width: 380px;
            height: 520px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            z-index: 9999;
            display: none;
            flex-direction: column;
            overflow: hidden;
            font-family: sans-serif;
            animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .ai-widget-header {
            background: #0f766e;
            color: white;
            padding: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: bold;
            font-size: 16px;
        }

        .ai-widget-close {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            line-height: 1;
        }

        .ai-widget-body {
            flex: 1;
            padding: 15px;
            overflow-y: auto;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .ai-widget-msg {
            max-width: 80%;
            padding: 10px 14px;
            border-radius: 12px;
            font-size: 14px;
            line-height: 1.5;
        }

        .ai-widget-msg-ai {
            background: #d1fae5;
            color: #064e3b;
            align-self: flex-start;
            border-bottom-left-radius: 2px;
        }

        .ai-widget-msg-user {
            background: #0f766e;
            color: white;
            align-self: flex-end;
            border-bottom-right-radius: 2px;
        }

        .ai-widget-chips {
            display: flex;
            gap: 6px;
            overflow-x: auto;
            padding: 8px 12px;
            background: #f1f5f9;
            border-top: 1px solid #e2e8f0;
        }

        .ai-widget-chip {
            white-space: nowrap;
            padding: 6px 12px;
            background: white;
            border: 1px solid #0f766e;
            color: #0f766e;
            border-radius: 15px;
            font-size: 12px;
            cursor: pointer;
        }

        .ai-widget-chip:hover {
            background: #0f766e;
            color: white;
        }

        .ai-widget-footer {
            padding: 10px 12px;
            border-top: 1px solid #e2e8f0;
            background: white;
            display: flex;
            gap: 8px;
        }

        .ai-widget-input {
            flex: 1;
            padding: 10px 14px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font-size: 14px;
            outline: none;
        }

        .ai-widget-input:focus {
            border-color: #0f766e;
        }

        .ai-widget-send {
            padding: 10px 16px;
            background: #0f766e;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
        }

        @media (max-width: 480px) {
            .ai-widget-window {
                width: 90%;
                right: 5%;
                bottom: 80px;
                height: 480px;
            }
        }
    `;
    document.head.appendChild(style);

    // Tạo HTML Widget
    const widgetContainer = document.createElement("div");
    widgetContainer.innerHTML = `
        <button class="ai-widget-button" id="aiWidgetToggle">
            🤖 Trợ lý AI <span class="ai-widget-badge">Online</span>
        </button>

        <div class="ai-widget-window" id="aiWidgetWindow">
            <div class="ai-widget-header">
                <span>🤖 AI Trạm Xăng Thái Nguyên</span>
                <button class="ai-widget-close" id="aiWidgetClose">&times;</button>
            </div>
            <div class="ai-widget-body" id="aiWidgetBody">
                <div class="ai-widget-msg ai-widget-msg-ai">
                    Xin chào! 👋 Tôi là Trợ lý AI của hệ thống Trạm Xăng Thái Nguyên.
                    <br><br>Bạn có thể hỏi tôi về giá xăng, địa chỉ cây xăng gần nhất, hoặc tính chi phí nhiên liệu!
                </div>
            </div>
            <div class="ai-widget-chips">
                <button class="ai-widget-chip" onclick="window.sendWidgetPrompt('Giá xăng hôm nay là bao nhiêu?')">💰 Giá xăng</button>
                <button class="ai-widget-chip" onclick="window.sendWidgetPrompt('Có những trạm xăng nào gần đây?')">📍 Danh sách trạm</button>
                <button class="ai-widget-chip" onclick="window.sendWidgetPrompt('Đổ 10 lít RON95 hết bao nhiêu tiền?')">🧮 Tính chi phí</button>
            </div>
            <div class="ai-widget-footer">
                <input type="text" class="ai-widget-input" id="aiWidgetInput" placeholder="Nhập câu hỏi...">
                <button class="ai-widget-send" id="aiWidgetSend">Gửi</button>
            </div>
        </div>
    `;
    document.body.appendChild(widgetContainer);

    // Gán sự kiện
    const toggleBtn = document.getElementById("aiWidgetToggle");
    const closeBtn = document.getElementById("aiWidgetClose");
    const chatWindow = document.getElementById("aiWidgetWindow");
    const inputEl = document.getElementById("aiWidgetInput");
    const sendBtn = document.getElementById("aiWidgetSend");

    toggleBtn.addEventListener("click", () => {
        chatWindow.style.display = chatWindow.style.display === "flex" ? "none" : "flex";
        if (chatWindow.style.display === "flex") inputEl.focus();
    });

    closeBtn.addEventListener("click", () => {
        chatWindow.style.display = "none";
    });

    sendBtn.addEventListener("click", handleWidgetSend);
    inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleWidgetSend();
    });

    window.sendWidgetPrompt = function (text) {
        inputEl.value = text;
        handleWidgetSend();
    };

    async function handleWidgetSend() {
        const text = inputEl.value.trim();
        if (!text) return;

        appendMsg(text, "user");
        inputEl.value = "";

        const loadingMsg = appendMsg("🤖 Đang xử lý...", "ai");
        const body = document.getElementById("aiWidgetBody");

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Lỗi kết nối");

            // Format URL trong câu trả lời AI
            let replyText = data.reply.replace(/(https?:\/\/[^\s]+)/g, '<br><a href="$1" target="_blank" style="color: #0f766e; font-weight: bold;">🧭 Xem Google Maps</a>');
            loadingMsg.innerHTML = replyText;
        } catch (err) {
            loadingMsg.innerHTML = "⚠️ Không thể kết nối với AI. Vui lòng thử lại sau!";
        }
        body.scrollTop = body.scrollHeight;
    }

    function appendMsg(text, sender) {
        const body = document.getElementById("aiWidgetBody");
        const msg = document.createElement("div");
        msg.className = `ai-widget-msg ai-widget-msg-${sender}`;
        msg.innerHTML = text;
        body.appendChild(msg);
        body.scrollTop = body.scrollHeight;
        return msg;
    }
})();
