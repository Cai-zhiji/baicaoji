// 百草计 Service Worker — 离线壳 + API 缓存
const CACHE_STATIC = "baicaoji-static-v2";
const CACHE_API = "baicaoji-api-v1";

// 静态资源预缓存
const PRE_CACHE = ["/", "/manifest.json"];

// ── Install ──
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(PRE_CACHE))
  );
});

// ── Activate ──
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_STATIC && k !== CACHE_API)
          .map((k) => caches.delete(k))
      )
    )
  );
});

// ── Message ──
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── Fetch ──
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 只处理 GET
  if (event.request.method !== "GET") return;

  // 排除 Next.js 开发模式请求（HMR、_next 等）
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.includes("hmr") ||
    url.pathname.includes("turbopack")
  ) {
    return;
  }

  // API 请求：stale-while-revalidate（先拿缓存，后台更新）
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(apiStrategy(event.request));
    return;
  }

  // 页面/静态资源：network-first（开发模式保持最新）
  event.respondWith(networkFirstStrategy(event.request));
});

// ── API 策略：缓存优先 + 后台更新 ──
async function apiStrategy(request) {
  const cached = await caches.match(request);
  // 后台发起网络请求更新缓存
  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE_API);
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  // 有缓存立即返回，无缓存等网络
  return cached || fetchPromise;
}

// ── 页面策略：网络优先 + 缓存兜底 ──
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response("离线不可用", { status: 503 });
  }
}
