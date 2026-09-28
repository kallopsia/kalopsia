/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
// Proyek Supabase umumnya berdomain *.supabase.co; URL khusus tetap diizinkan.
const supabaseOrigins = [
  "https://*.supabase.co",
  "wss://*.supabase.co",
  supabaseUrl,
]
  .filter(Boolean)
  .join(" ");

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "img-src 'self' data: blob: https://res.cloudinary.com",
              `script-src 'self' 'unsafe-eval' 'unsafe-inline'`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              `connect-src 'self' ${supabaseOrigins} https://api.cloudinary.com https://res.cloudinary.com`,
              "frame-ancestors 'none'",
            ].join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
