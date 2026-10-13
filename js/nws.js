const defaultNews = [
    {
        title: "Thông báo giá xăng",
        date: "2026-09-18",
        content: "Cập nhật thông tin giá nhiên liệu mới nhất."
    },
    {
        title: "Khuyến cáo sử dụng nhiên liệu",
        date: "2026-09-17",
        content: "Người dùng nên kiểm tra thông tin trước khi đổ nhiên liệu."
    }
];

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

// Lấy tin Admin đã thêm
function getNews() {
    const adminNews = localStorage.getItem("adminNews");
    if (adminNews !== null) {
        try {
            const parsed = JSON.parse(adminNews);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch (e) {
            console.error("Lỗi đọc adminNews từ localStorage:", e);
        }
    }
    return defaultNews;
}


// Hiển thị tin tức
function displayNews(newsList = getNews()) {

    const container =
        document.getElementById("newsList");

    if (!container) {
        return;
    }

    container.innerHTML = "";


    if (!newsList || newsList.length === 0) {

        container.innerHTML = `
            <p style="grid-column: 1 / -1; text-align: center; color: #666; font-size: 18px; padding: 40px 0;">
                Chưa có tin tức nào.
            </p>
        `;

        return;
    }


    newsList.forEach(news => {

        const article =
            document.createElement("article");

        article.className = "news-card";


        article.innerHTML = `

            <h3>
                ${news.title}
            </h3>

            <div class="news-date">
                📅 ${formatDateDisplay(news.date)}
            </div>

            <p>
                ${news.content}
            </p>

        `;


        container.appendChild(article);

    });

}


// Tìm kiếm tin tức
function searchNews() {

    const searchInput =
        document.getElementById("searchNews") ||
        document.getElementById("newsSearch");

    const keyword = searchInput?.value.toLowerCase().trim() || "";

    const news = getNews();

    if (!keyword) {
        displayNews(news);
        return;
    }

    const result = news.filter(item =>
        (item.title && item.title.toLowerCase().includes(keyword)) ||
        (item.content && item.content.toLowerCase().includes(keyword))
    );

    displayNews(result);
}


// Hiển thị khi mở trang & lắng nghe thay đổi
displayNews();

window.addEventListener("storage", function(e) {
    if (e.key === "adminNews") {
        displayNews();
    }
});