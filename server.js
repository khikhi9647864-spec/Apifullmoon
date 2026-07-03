const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Bộ nhớ RAM lưu trữ danh sách server Full Moon
let servers = {};

// Thời gian hết hạn của 1 server: 5 phút (300,000 ms)
const EXPIRE_TIME = 5 * 60 * 1000;

// Hàm dọn dẹp server cũ quá 5 phút không cập nhật
function cleanupExpiredServers() {
    const now = Date.now();
    for (const id in servers) {
        if (now - servers[id].lastSeen > EXPIRE_TIME) {
            delete servers[id];
        }
    }
}

// Tự động quét dọn bộ nhớ mỗi 30 giây
setInterval(cleanupExpiredServers, 30000);

// Xử lý nhận dữ liệu từ Script Lua bắn lên (Method: POST)
function handleReceiveData(req, res) {
    const body = req.body;
    
    // Khắc phục lỗi viết hoa/thường từ Lua (chấp nhận cả jobid lẫn jobId)
    const jobId = body.jobid || body.jobId;
    const players = body.players || "?";
    const maxPlayers = body.maxPlayers || 12;
    const placeId = String(body.placeId || "");

    if (!jobId) {
        return res.status(400).json({ success: false, error: "Thiếu JobId!" });
    }

    // KIỂM TRA NGHIÊM NGẶT: Chỉ nhận dữ liệu từ Sea 3
    if (placeId !== "7449423635" && Number(body.sea) !== 3) {
        return res.status(400).json({ success: false, error: "API chỉ chấp nhận dữ liệu từ Sea 3!" });
    }

    // Lưu server vào hệ thống
    servers[jobId] = {
        jobId: jobId,
        players: Number(players),
        maxPlayers: Number(maxPlayers),
        placeId: "7449423635",
        sea: 3,
        lastSeen: Date.now()
    };

    console.log(`[+] Đã cập nhật Sea 3 Full Moon | JobId: ${jobId} | Players: ${players}/${maxPlayers}`);
    return res.status(200).json({ success: true, message: "Đã lưu server Sea 3 thành công!" });
}

// Mở cổng nhận POST cho Script Lua
app.post('/', handleReceiveData);
app.post('/api/fullmoon', handleReceiveData);

// Xử lý trả về danh sách server gốc (Method: GET - Không Giao Diện HTML)
function handleGetServers(req, res) {
    cleanupExpiredServers(); // Dọn dẹp trước khi xuất dữ liệu
    
    // Trả về JSON mặc định
    res.status(200).json({
        status: "online",
        game: "Blox Fruits",
        sea: 3,
        total_servers: Object.keys(servers).length,
        data: Object.values(servers)
    });
}

// Khi vào link web trên trình duyệt hoặc gọi GET API sẽ nhận được JSON thuần
app.get('/', handleGetServers);
app.get('/api/servers', handleGetServers);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Full Moon Sea 3 đang chạy không giao diện tại Port ${PORT}`);
});
