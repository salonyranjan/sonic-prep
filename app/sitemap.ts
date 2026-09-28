import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://sonic-prep.vercel.app/sign-in" },
    { url: "https://sonic-prep.vercel.app/sign-up" },
  ];
}
