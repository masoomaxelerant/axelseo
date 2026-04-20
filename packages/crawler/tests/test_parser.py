from bs4 import BeautifulSoup

from axelseo_crawler.parser import (
    extract_canonical,
    extract_headings,
    extract_images,
    extract_links,
    extract_meta_description,
    extract_meta_robots,
    extract_open_graph,
    extract_schema_org,
    extract_title,
    extract_twitter_card,
)


SAMPLE_HTML = """\
<!DOCTYPE html>
<html>
<head>
    <title>Test Page — AxelSEO</title>
    <meta name="description" content="This is a test page for SEO analysis.">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://example.com/test">
    <meta property="og:title" content="OG Title">
    <meta property="og:description" content="OG Desc">
    <meta property="og:image" content="https://example.com/og.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="TW Title">
    <script type="application/ld+json">
    {"@type": "WebPage", "name": "Test Page"}
    </script>
</head>
<body>
    <h1>Main Heading</h1>
    <h2>Sub Heading</h2>
    <h2>Another Sub</h2>
    <p>Some content here.</p>
    <img src="/img/photo.jpg" alt="A photo" width="800" height="600" loading="lazy">
    <img src="/img/icon.svg">
    <a href="/about">About Us</a>
    <a href="https://external.com/link" rel="nofollow">External</a>
    <a href="mailto:test@example.com">Email</a>
    <a href="javascript:void(0)">JS link</a>
</body>
</html>
"""


def _soup():
    return BeautifulSoup(SAMPLE_HTML, "lxml")


def test_extract_title():
    assert extract_title(_soup()) == "Test Page — AxelSEO"


def test_extract_meta_description():
    assert extract_meta_description(_soup()) == "This is a test page for SEO analysis."


def test_extract_meta_robots():
    assert extract_meta_robots(_soup()) == "index, follow"


def test_extract_canonical():
    assert extract_canonical(_soup()) == "https://example.com/test"


def test_extract_headings():
    headings = extract_headings(_soup())
    assert len(headings) == 3
    assert headings[0].level == 1
    assert headings[0].text == "Main Heading"
    assert headings[1].level == 2
    assert headings[2].level == 2


def test_extract_images():
    images = extract_images(_soup())
    assert len(images) == 2
    assert images[0].src == "/img/photo.jpg"
    assert images[0].alt == "A photo"
    assert images[0].width == "800"
    assert images[0].loading == "lazy"
    assert images[1].alt is None  # missing alt


def test_extract_links():
    links = extract_links(_soup(), "https://example.com/test", "https://example.com")
    # Should only include /about and external.com — not mailto or javascript
    assert len(links) == 2

    internal = [l for l in links if l.is_internal]
    external = [l for l in links if not l.is_internal]
    assert len(internal) == 1
    assert internal[0].anchor_text == "About Us"
    assert len(external) == 1
    assert external[0].rel == "nofollow"


def test_extract_open_graph():
    og = extract_open_graph(_soup())
    assert og is not None
    assert og.title == "OG Title"
    assert og.description == "OG Desc"
    assert og.image == "https://example.com/og.jpg"


def test_extract_twitter_card():
    tc = extract_twitter_card(_soup())
    assert tc is not None
    assert tc.card == "summary_large_image"
    assert tc.title == "TW Title"


def test_extract_schema_org():
    schemas = extract_schema_org(_soup())
    assert len(schemas) == 1
    assert schemas[0]["@type"] == "WebPage"
    assert schemas[0]["name"] == "Test Page"


def test_missing_elements():
    soup = BeautifulSoup("<html><body><p>Bare page</p></body></html>", "lxml")
    assert extract_title(soup) is None
    assert extract_meta_description(soup) is None
    assert extract_meta_robots(soup) is None
    assert extract_canonical(soup) is None
    assert extract_open_graph(soup) is None
    assert extract_twitter_card(soup) is None
    assert extract_schema_org(soup) == []
    assert extract_headings(soup) == []
    assert extract_images(soup) == []
