// ==========================================
// DỮ LIỆU TIN TỨC (LẤY TỪ ADMIN LƯU TRONG LOCALSTORAGE)
// ==========================================

const defaultNews = [
    {
        date: "2026-09-18",
        title: "Cập nhật thông tin giá xăng dầu",
        content:
            "Thông tin giá các mặt hàng xăng dầu được cập nhật để người dùng thuận tiện theo dõi và so sánh."
    },

    {
        date: "2026-09-17",
        title: "Thông báo điều chỉnh giá nhiên liệu",
        content:
            "Người dùng có thể theo dõi lịch sử thay đổi giá nhiên liệu thông qua hệ thống."
    },

    {
        date: "2026-09-15",
        title: "Theo dõi giá xăng tại các trạm",
        content:
            "Hệ thống hỗ trợ người dùng xem và so sánh giá nhiên liệu giữa các trạm xăng."
    },

    {
        date: "2026-09-12",
        title: "Hướng dẫn sử dụng bản đồ trạm xăng",
        content:
            "Người dùng có thể tìm kiếm trạm xăng gần vị trí và xem đường đi đến trạm."
    },

    {
        date: "2026-09-10",
        title: "Tính năng quản lý chi phí nhiên liệu",
        content:
            "Người dùng có thể nhập số lít nhiên liệu, tính chi phí và theo dõi lịch sử sử dụng."
    },

    {
        date: "2026-09-08",
        title: "Hệ thống quản lý trạm xăng thông minh",
        content:
            "Hệ thống hướng tới việc hỗ trợ quản lý trạm xăng, theo dõi nhiên liệu và cung cấp trợ lý AI."
    }
];

function getNewsData() {
    const saved = localStorage.getItem("adminNews");
    if (saved !== null) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch (e) {
            console.error("Lỗi đọc adminNews từ localStorage:", e);
        }
    }
    return defaultNews;
}

function formatDateDisplay(dateStr) {
    if (!dateStr) return "";
    if (dateStr.includes("-")) {
        const parts = dateStr.split("-");
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    }
    return dateStr;
}


// ==========================================
// HIỂN THỊ TIN TỨC
// ==========================================

function displayNews(newsList = getNewsData()) {

    const container = document.getElementById("newsList");

    if (!container) return;

    container.innerHTML = "";

    if (!newsList || newsList.length === 0) {
        container.innerHTML = `
            <p style="
                grid-column: 1 / -1;
                text-align: center;
                color: #666;
                font-size: 18px;
                padding: 40px 0;
            ">
                Chưa có tin tức nào.
            </p>
        `;
        return;
    }

    newsList.forEach(function(news) {

        const card = document.createElement("article");

        card.className = "news-card";

        const formattedDate = formatDateDisplay(news.date);

        card.innerHTML = `
            <div class="news-date">
                📅 ${formattedDate}
            </div>

            <h2>
                ${news.title}
            </h2>

            <p>
                ${news.content}
            </p>

            <a href="#" class="news-button">
                Xem chi tiết
            </a>
        `;

        container.appendChild(card);
    });
}


// ==========================================
// KHI MỞ TRANG & LẮNG NGHE THAY ĐỔI DỮ LIỆU
// ==========================================

displayNews();

window.addEventListener("storage", function(e) {
    if (e.key === "adminNews") {
        displayNews();
    }
});


// ==========================================
// TÌM KIẾM TIN TỨC
// ==========================================

function searchNews() {
    const searchInput = document.getElementById("searchNews");
    if (!searchInput) return;

    const keyword = searchInput.value.toLowerCase().trim();
    const allNews = getNewsData();

    if (!keyword) {
        displayNews(allNews);
        return;
    }

    const result = allNews.filter(function(news) {
        return (
            (news.title && news.title.toLowerCase().includes(keyword)) ||
            (news.content && news.content.toLowerCase().includes(keyword))
        );
    });

    displayNews(result);
}