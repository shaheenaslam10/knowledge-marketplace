import type { MetadataRoute } from "next";

/** Foundation robots — app surfaces are noindexed by default once they exist. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
  };
}
