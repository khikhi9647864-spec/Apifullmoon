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

// ==========================================
// 1. XỬ LÝ NHẬN DỮ LIỆU TỪ ROBLOX (POST)
// ==========================================
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

    // Tự động nhận diện Sea chuẩn xác thay vì chặn cứng
    let sea = Number(body.sea) || 0;
    if (placeId === "2753915549") sea = 1;
    else if (placeId === "4442272183") sea = 2;
    else if (placeId === "7449423635") sea = 3;

    // Nếu không thuộc 3 Sea của Blox Fruits thì mới từ chối
    if (sea === 0) {
        return res.status(400).json({ success: false, error: "API chỉ chấp nhận dữ liệu từ game Blox Fruits!" });
    }

    // Lưu server vào hệ thống
    servers[jobId] = {
        jobId: jobId,
        players: Number(players),
        maxPlayers: Number(maxPlayers),
        placeId: placeId,
        sea: sea,
        lastSeen: Date.now()
    };

    console.log(`[+] Đã cập nhật Sea ${sea} Full Moon | JobId: ${jobId} | Players: ${players}/${maxPlayers}`);
    return res.status(200).json({ success: true, message: `Đã lưu server Sea ${sea} thành công!` });
}

// ==========================================
// 2. XỬ LÝ XEM DANH SÁCH TRÊN WEB/API (GET)
// ==========================================
function handleGetServers(req, res) {
    cleanupExpiredServers(); // Dọn dẹp trước khi xuất dữ liệu
    
    const serverList = Object.values(servers);

    res.status(200).json({
        status: "online",
        game: "Blox Fruits",
        total_servers: serverList.length,
        data: serverList
    });
}

// ==========================================
// 3. ĐĂNG KÝ ROUTER CHỐNG LỖI 404
// ==========================================
// Chấp nhận POST từ Script Lua (Có hoặc không có dấu / ở cuối đều ăn)
app.post(['/', '/api/fullmoon', '/api/fullmoon/', '/api/servers'], handleReceiveData);

// Chấp nhận GET từ Trình duyệt Web để xem danh sách server
app.get(['/', '/api/fullmoon', '/api/fullmoon/', '/api/servers'], handleGetServers);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 API Full Moon đang chạy tại Port ${PORT}`);
});
