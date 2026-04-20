export interface PageSEOData {
  url: string;
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  canonical: string | null;
  metaRobots: string | null;
  h1Count: number;
  h1First: string | null;
  headings: { level: number; text: string }[];
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogUrl: string | null;
  twitterCard: string | null;
  schemaTypes: string[];
  imageCount: number;
  imagesWithoutAlt: number;
  linkCount: number;
  internalLinks: number;
  externalLinks: number;
  wordCount: number;
  lang: string | null;
  charset: string | null;
  viewport: string | null;
  hasHttps: boolean;
}

export interface Project {
  id: string;
  name: string;
  domain: string;
}
