import type { Metadata } from "next";

type Props = { params: { shopSlug: string }; children: React.ReactNode };

export function generateMetadata({ params }: Props): Metadata {
  const { shopSlug } = params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/${shopSlug}`;
  const title = "Shop catalogue";
  const description = "Browse our jewellery catalogue";

  return {
    title: `${title} · Catalogue Agent`,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Catalogue Agent",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: { canonical: url },
  };
}

export default function ShopLayout({ children }: Props) {
  return children;
}
