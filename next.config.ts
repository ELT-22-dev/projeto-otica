import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Foto da receita (já reduzida no navegador) vai em base64 numa Server Action.
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
