// 定义缓存名称和需要缓存的文件列表
const CACHE_NAME = 'mars-terraformer-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
  // 注意：如果将来有独立的CSS/JS文件，也需要加入此列表
];

// 安装阶段：缓存核心文件
self.addEventListener('install', event => {
  console.log('[Service Worker] 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] 缓存核心文件');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] 安装完成');
        // 跳过等待，直接激活新Service Worker
        return self.skipWaiting();
      })
  );
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', event => {
  console.log('[Service Worker] 激活中...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 清除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] 激活完成，已控制所有客户端');
      return self.clients.claim();
    })
  );
});

// 拦截请求：使用缓存，回退到网络
self.addEventListener('fetch', event => {
  // 只处理GET请求
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果缓存中有，直接返回
        if (response) {
          console.log('[Service Worker] 从缓存返回:', event.request.url);
          return response;
        }
        
        // 否则从网络获取
        console.log('[Service Worker] 从网络获取:', event.request.url);
        return fetch(event.request).then(networkResponse => {
          // 可选：将新请求添加到缓存中
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(error => {
          console.error('[Service Worker] 获取失败:', error);
          // 可以在这里返回一个自定义的离线页面
          return new Response('网络连接不可用，请检查后重试。', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});