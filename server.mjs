import express from 'express';
import http from 'node:http';
import https from 'node:https';
import { createBareServer } from "@tomphttp/bare-server-node";
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ES Moduleで __dirname を再現
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer();
const bareServer = createBareServer('/bare/');
const PORT = process.env.PORT || 10000;

/* ===== IP偽装 & ステルス通信設定 ===== */

// 1. ランダムなIPを生成
const getRandomIP = () => Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');

// 2. HTTP/HTTPS エージェント設定（Keep-Aliveで高速化）
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 100 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 100 });

// 3. User-Agent リスト
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
];

/* ===== 検索エンジン・チェッカー (IP偽装ヘッダー込) ===== */
async function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  
  // 人間らしいランダムな待機 (1000ms-2000ms)
  await new Promise(r => setTimeout(r, 1000 + Math.floor(Math.random() * 1000)));

  const fakeIP = getRandomIP();

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        // IP偽装用ヘッダー
        "CF-Connecting-IP": fakeIP,
        "X-Forwarded-For": fakeIP,
        "X-Real-IP": fakeIP,
        "Client-IP": fakeIP,
        "Forwarded": `for=${fakeIP};proto=https`,
        // ブラウザ整合性ヘッダー
        "Sec-Ch-Ua": '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0"
      },
      // エージェントの適用（Node 18+ の fetch は agent を直接サポートしない場合があるため注意）
      // 必要に応じて undici 等のライブラリ検討
    });

    return res.ok;
  } catch (err) {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/* ===== ミドルウェア ===== */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静的ファイルの提供（publicディレクトリ）
app.use(express.static(path.join(__dirname, "public"), { 
  maxAge: "1d", 
  etag: true 
}));

/* ===== UV ライブラリルート (明示的なパス指定) ===== */
app.get('/lib/uv.bundle.js', (req, res) => res.sendFile(path.join(__dirname, 'public', 'uv', 'uv.bundle.js')));
app.get('/lib/uv.handler.js', (req, res) => res.sendFile(path.join(__dirname, 'public', 'uv', 'uv.handler.js')));
app.get('/lib/uv.sw.js', (req, res) => res.sendFile(path.join(__dirname, 'public', 'uv', 'uv.sw.js')));

/* ===== 高速並列検索 API ===== */
app.get("/api/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "missing query" });

  const engines = [
    "https://duckduckgo.com/?q=%s",
    "https://search.brave.com/search?q=%s",
    "https://www.startpage.com/sp/search?q=%s"
  ];

  const query = encodeURIComponent(q);
  const urls = engines.map(tpl => tpl.replace("%s", query));

  try {
    // 最初にレスポンスを返した（成功した）エンジンを採用
    const fastestUrl = await Promise.any(
      urls.map(async (url) => {
        const ok = await fetchWithTimeout(url);
        if (ok) return url;
        throw new Error("Failed to fetch");
      })
    );
    return res.json({ url: fastestUrl });
  } catch (err) {
    return res.status(502).json({ 
      error: "All search engines failed or Cloudflare verification blocked the request." 
    });
  }
});

/* ===== Bare Server と Express の統合ルーティング ===== */
server.on('request', (req, res) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

server.on('upgrade', (req, socket, head) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

/* ===== 起動 ===== */
server.listen(PORT, () => {
  console.log(`------------------------------------------`);
  console.log(`Ultraviolet Stealth Server is running:`);
  console.log(`> Port: ${PORT}`);
  console.log(`> Mode: IP Spoofing & Stealth Active`);
  console.log(`------------------------------------------`);
});

// シャットダウン処理
function shutdown() {
  console.log("\nShutting down...");
  server.close(() => {
    bareServer.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
