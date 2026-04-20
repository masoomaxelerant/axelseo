"""HTML parsing and SEO data extraction using BeautifulSoup."""

from __future__ import annotations

import json
from urllib.parse import urljoin

from bs4 import BeautifulSoup, Tag

from axelseo_crawler.models import (
    HeadingTag,
    ImageInfo,
    LinkInfo,
    OpenGraphMeta,
    TwitterCardMeta,
)
from axelseo_crawler.url_utils import is_same_origin


def extract_title(soup: BeautifulSoup) -> str | None:
    tag = soup.find("title")
    if tag and tag.string:
        return tag.string.strip()
    return None


def extract_meta_description(soup: BeautifulSoup) -> str | None:
    tag = soup.find("meta", attrs={"name": "description"})
    if tag and isinstance(tag, Tag):
        content = tag.get("content")
        if content:
            return str(content).strip()
    return None


def extract_meta_robots(soup: BeautifulSoup) -> str | None:
    tag = soup.find("meta", attrs={"name": "robots"})
    if tag and isinstance(tag, Tag):
        content = tag.get("content")
        if content:
            return str(content).strip()
    return None


def extract_canonical(soup: BeautifulSoup) -> str | None:
    tag = soup.find("link", attrs={"rel": "canonical"})
    if tag and isinstance(tag, Tag):
        href = tag.get("href")
        if href:
            return str(href).strip()
    return None


def extract_headings(soup: BeautifulSoup) -> list[HeadingTag]:
    headings: list[HeadingTag] = []
    for level in range(1, 7):
        for tag in soup.find_all(f"h{level}"):
            text = tag.get_text(strip=True)
            if text:
                headings.append(HeadingTag(level=level, text=text))
    return headings


def extract_images(soup: BeautifulSoup) -> list[ImageInfo]:
    images: list[ImageInfo] = []
    for img in soup.find_all("img"):
        if not isinstance(img, Tag):
            continue
        src = img.get("src") or img.get("data-src")
        if not src:
            continue
        images.append(
            ImageInfo(
                src=str(src),
                alt=_attr_str(img.get("alt")),
                width=_attr_str(img.get("width")),
                height=_attr_str(img.get("height")),
                loading=_attr_str(img.get("loading")),
            )
        )
    return images


def extract_links(soup: BeautifulSoup, page_url: str, origin: str) -> list[LinkInfo]:
    links: list[LinkInfo] = []
    for a_tag in soup.find_all("a", href=True):
        if not isinstance(a_tag, Tag):
            continue
        href = str(a_tag["href"]).strip()
        if not href or href.startswith(("javascript:", "mailto:", "tel:", "#")):
            continue

        resolved = urljoin(page_url, href)
        rel_attr = a_tag.get("rel")
        rel_str = " ".join(rel_attr) if isinstance(rel_attr, list) else _attr_str(rel_attr)

        links.append(
            LinkInfo(
                href=resolved,
                anchor_text=a_tag.get_text(strip=True),
                rel=rel_str,
                is_internal=is_same_origin(resolved, origin),
            )
        )
    return links


def extract_open_graph(soup: BeautifulSoup) -> OpenGraphMeta | None:
    og: dict[str, str] = {}
    for tag in soup.find_all("meta", attrs={"property": True}):
        if not isinstance(tag, Tag):
            continue
        prop = str(tag.get("property", ""))
        if prop.startswith("og:"):
            key = prop[3:]
            content = tag.get("content")
            if content:
                og[key] = str(content).strip()

    if not og:
        return None

    return OpenGraphMeta(
        title=og.get("title"),
        description=og.get("description"),
        image=og.get("image"),
        url=og.get("url"),
        type=og.get("type"),
        site_name=og.get("site_name"),
    )


def extract_twitter_card(soup: BeautifulSoup) -> TwitterCardMeta | None:
    tc: dict[str, str] = {}
    for tag in soup.find_all("meta", attrs={"name": True}):
        if not isinstance(tag, Tag):
            continue
        name = str(tag.get("name", ""))
        if name.startswith("twitter:"):
            key = name[8:]
            content = tag.get("content")
            if content:
                tc[key] = str(content).strip()

    if not tc:
        return None

    return TwitterCardMeta(
        card=tc.get("card"),
        title=tc.get("title"),
        description=tc.get("description"),
        image=tc.get("image"),
        site=tc.get("site"),
    )


def extract_schema_org(soup: BeautifulSoup) -> list[dict]:
    schemas: list[dict] = []
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        if not script.string:
            continue
        try:
            data = json.loads(script.string)
            if isinstance(data, list):
                schemas.extend(data)
            elif isinstance(data, dict):
                schemas.append(data)
        except (json.JSONDecodeError, TypeError):
            continue
    return schemas


def _attr_str(value: object) -> str | None:
    """Safely convert a BS4 attribute to a string or None."""
    if value is None:
        return None
    if isinstance(value, list):
        return " ".join(str(v) for v in value)
    return str(value)
