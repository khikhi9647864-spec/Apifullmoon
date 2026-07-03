const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Lưu trữ danh sách server trong RAM
let servers = {};

// Thời gian hết hạn của server: 5 phút (300,000 ms)
const EXPIRE_TIME = 5 * 60 * 1000;

// Hàm tự động xoá server quá 5 phút
function cleanupServers() {
    const now = Date.now();
    for (const jobId in servers) {
        if (now - servers[jobId].lastSeen > EXPIRE_TIME) {
            delete servers[jobId];
        }
    }
}

// Chạy dọn dẹp bộ nhớ mỗi 30 giây
setInterval(cleanupServers, 30000);

// API Nhận dữ liệu từ Code Lua gửi lên
app.post('/api/fullmoon', (req, res) => {
    const { jobId, players, maxPlayers, sea } = req.body;

    // KIỂM TRA NGHIÊM NGẶT: Chỉ nhận Sea 3 (SeaId = 3)
    if (Number(sea) !== 3) {
        return res.status(400).json({ success: false, message: "Chỉ chấp nhận dữ liệu từ Sea 3!" });
    }

    if (!jobId) {
        return res.status(400).json({ success: false, message: "Thiếu JobId!" });
    }

    // Cập nhật hoặc thêm mới server vào danh sách
    servers[jobId] = {
        jobId: jobId,
        players: players || "?",
        maxPlayers: maxPlayers || 12,
        sea: 3,
        lastSeen: Date.now()
    };

    return res.json({ success: true, message: "Đã cập nhật server Sea 3 Full Moon!" });
});

// API Lấy danh sách server (cho Web Frontend)
app.get('/api/servers', (req, res) => {
    cleanupServers(); // Dọn dẹp trước khi trả về
    res.json(Object.values(servers));
});

// Giao diện Web HTML (Tự làm mới mỗi 5 giây)
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sea 3 Full Moon Tracker</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
            body {
                background-color: #0b0e14;
                color: #ffffff;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #00ffcc;
                padding-bottom: 15px;
                margin-bottom: 20px;
            }
            .header h1 {
                font-family: 'Press Start 2P', monospace;
                font-size: 20px;
                color: #00ffcc;
                text-shadow: 0 0 10px #00ffcc;
            }
            .status {
                text-align: center;
                font-size: 14px;
                color: #aaaaaa;
                margin-bottom: 20px;
            }
            .grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                gap: 15px;
                max-width: 1200px;
                margin: 0 auto;
            }
            .card {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid #1f2937;
                border-left: 4px solid #00ffcc;
                border-radius: 8px;
                padding: 15px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            }
            .card-title {
                font-weight: bold;
                color: #f3f4f6;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
            }
            .badge {
                background: #00ffcc;
                color: #000;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
            }
            .info {
                font-size: 14px;
                color: #9ca3af;
                margin-bottom: 15px;
            }
            .info span {
                color: #fff;
                font-weight: bold;
            }
            .btn {
                display: block;
                width: 100%;
                text-align: center;
                background: #10b981;
                color: white;
                text-decoration: none;
                padding: 10px 0;
                border-radius: 5px;
                font-weight: bold;
                transition: background 0.2s;
            }
            .btn:hover {
                background: #059669;
            }
            .script-box {
                background: #111827;
                border: 1px solid #374151;
                padding: 8px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 11px;
                color: #38bdf8;
                word-break: break-all;
                margin-bottom: 10px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>SEA 3 FULL MOON TRACKER</h1>
        </div>
        <div class="status" id="status">Đang tải dữ liệu... (Tự động cập nhật mỗi 5s)</div>
        <div class="grid" id="server-list"></div>

        <script>
            function fetchServers() {
                fetch('/api/servers')
                    .then(res => res.json())
                    .then(data => {
                        const list = document.getElementById('server-list');
                        const status = document.getElementById('status');
                        list.innerHTML = '';
                        
                        if (data.length === 0) {
                            status.innerText = 'Hiện tại chưa có server Sea 3 nào đang Full Moon.';
                            return;
                        }

                        status.innerText = \`Tìm thấy \${data.length} server Sea 3 có Full Moon | Cập nhật lúc: \${new Date().toLocaleTimeString('vi-VN')}\`;

                        data.forEach(srv => {
                            const joinScript = \`game:GetService("TeleportService"):TeleportToPlaceInstance(7449423635, "\${srv.jobId}", game.Players.LocalPlayer)\`;
                            
                            const card = document.createElement('div');
                            card.className = 'card';
                            card.innerHTML = \`
                                <div class="card-title">
                                    <span>Server ID</span>
                                    <span class="badge">SEA 3</span>
                                </div>
                                <div class="info">Người chơi: <span>\${srv.players} / \${srv.maxPlayers}</span></div>
                                <div class="info">Mã JobId: <span>\${srv.jobId.slice(0, 18)}...</span></div>
                                <div class="script-box" onclick="navigator.clipboard.writeText(this.innerText); alert('Đã sao chép lệnh Teleport!');" style="cursor:pointer;" title="Click để copy">
                                    \${joinScript}
                                </div>
                                <button class="btn" onclick="navigator.clipboard.writeText('\${joinScript}'); alert('Đã sao chép script tham gia server!');">COPY LỆNH JOIN</button>
                            \`;
                            list.appendChild(card);
                        });
                    })
                    .catch(err => console.error(err));
            }

            // Tải ngay khi vào web
            fetchServers();
            // Lặp lại mỗi 5 giây
            setInterval(fetchServers, 5000);
        </script>
    </body>
    </html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server đang chạy trên port ${PORT}`));
