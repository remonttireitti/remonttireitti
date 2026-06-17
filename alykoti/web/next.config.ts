import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["modbus-serial"],
  async redirects() {
    return [
      {
        source: "/ohjaimet/:id/asetukset",
        destination: "/ilmanvaihto/:id/asetukset",
        permanent: true,
      },
      {
        source: "/ohjaimet/:id",
        destination: "/ilmanvaihto/:id",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
