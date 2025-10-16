module.exports = {
  globDirectory: "dist/",
  globPatterns: [
    "**/*.{html,js,css,png,jpg,jpeg,svg,ico,json}"
  ],
  swDest: "dist/sw.js",
  ignoreURLParametersMatching: [
    /^utm_/,
    /^fbclid$/
  ],
  runtimeCaching: [
    // 1) Imágenes: CacheFirst (rápido, offline)
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "images-cache-v1",
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 días
        },
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    },
    // 2) APIs: NetworkFirst (prioriza datos frescos, cae a cache si no hay red)
    {
      urlPattern: new RegExp("^https://api\\.tudominio\\.com/"), // cambia a tu API
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache-v1",
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60 // 5 minutos
        },
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    },
    // 3) Otros assets: StaleWhileRevalidate (sirve cache rápido y actualiza en background)
    {
      urlPattern: /.*/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "assets-cache-v1",
        expiration: {
          maxEntries: 200,
        }
      }
    }
  ]
};
