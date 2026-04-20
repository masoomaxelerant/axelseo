"""
On-page SEO analyzer using BeautifulSoup.
Checks titles, meta descriptions, headings, images, schema markup, etc.
"""

from bs4 import BeautifulSoup


def analyze_page(html: str, url: str) -> dict:
    """Analyze a page's HTML for SEO factors."""
    soup = BeautifulSoup(html, "lxml")

    title_tag = soup.find("title")
    meta_desc = soup.find("meta", attrs={"name": "description"})
    canonical = soup.find("link", attrs={"rel": "canonical"})
    h1_tags = soup.find_all("h1")
    img_tags = soup.find_all("img")
    schema_scripts = soup.find_all("script", attrs={"type": "application/ld+json"})

    images_without_alt = [img for img in img_tags if not img.get("alt")]

    return {
        "url": url,
        "title": title_tag.string.strip() if title_tag and title_tag.string else None,
        "title_length": len(title_tag.string.strip()) if title_tag and title_tag.string else 0,
        "meta_description": meta_desc["content"].strip() if meta_desc and meta_desc.get("content") else None,
        "meta_description_length": len(meta_desc["content"].strip()) if meta_desc and meta_desc.get("content") else 0,
        "canonical": canonical["href"] if canonical else None,
        "h1_count": len(h1_tags),
        "h1_text": h1_tags[0].get_text(strip=True) if h1_tags else None,
        "image_count": len(img_tags),
        "images_without_alt": len(images_without_alt),
        "schema_types": [s.string for s in schema_scripts if s.string],
        "word_count": len(soup.get_text(separator=" ", strip=True).split()),
    }
