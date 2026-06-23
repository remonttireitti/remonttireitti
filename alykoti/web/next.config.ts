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
      {
        source: "/keskusyksikko",
        destination: "/laitteet/keskusyksikko",
        permanent: true,
      },
      {
        source: "/keskusyksikko/:id",
        destination: "/laitteet/keskusyksikko/:id",
        permanent: true,
      },
      {
        source: "/koti/valot",
        destination: "/valot",
        permanent: true,
      },
      {
        source: "/laitteet/valot",
        destination: "/valot",
        permanent: true,
      },
      {
        source: "/asetukset",
        destination: "/laitteet",
        permanent: false,
      },
      {
        source: "/asetukset/:path*",
        destination: "/laitteet/:path*",
        permanent: false,
      },
      {
        source: "/koti/laitteet",
        destination: "/laitteet/luettelo",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
