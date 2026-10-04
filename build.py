#!/usr/bin/env python3
"""
Build script for ALIF LAAM MEEM JEWELLERS static site.
Assembles root-level HTML pages from src/partials + src/pages.

Usage:  python3 build.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).parent
PARTIALS = ROOT / "src" / "partials"
PAGES = ROOT / "src" / "pages"

PAGES_META = {
    "index.html": {
        "title": "ALIF LAAM MEEM JEWELLERS — Timeless Elegance | Fine Gold & Diamond Jewellery",
        "desc": "Alif Laam Meem Jewellers — a house of fine 22K gold and diamond jewellery. Handcrafted in our atelier. Crafted to become part of your story.",
        "id": "home",
    },
    "collections.html": {
        "title": "The Collections — Alif Laam Meem Jewellers",
        "desc": "Explore seven worlds of gold and diamonds — rings, necklaces, earrings, bangles, bracelets and the bridal suite. Handcrafted 22K jewellery.",
        "id": "collections",
    },
    "about.html": {
        "title": "Our Story — Alif Laam Meem Jewellers",
        "desc": "Crafted for generations. Discover the story, the atelier and the art of craftsmanship behind Alif Laam Meem Jewellers.",
        "id": "about",
    },
    "contact.html": {
        "title": "Contact Us — Alif Laam Meem Jewellers",
        "desc": "Visit the boutique, start a bespoke commission or book a bridal consultation with Alif Laam Meem Jewellers.",
        "id": "contact",
    },
    "product.html": {
        "title": "Signature Pieces — Alif Laam Meem Jewellers",
        "desc": "The Signature Series by Alif Laam Meem Jewellers — 22K gold, hand finished. Enquire via WhatsApp.",
        "id": "product",
    },
    "journal.html": {
        "title": "The Journal — Alif Laam Meem Jewellers",
        "desc": "Jewellery stories, new collections, bridal inspiration and style guides from the world of Alif Laam Meem Jewellers.",
        "id": "journal",
    },
}


def read(path: pathlib.Path) -> str:
    return path.read_text(encoding="utf-8")


def main() -> None:
    head = read(PARTIALS / "head.html")
    header = read(PARTIALS / "header.html")
    footer = read(PARTIALS / "footer.html")

    for filename, meta in PAGES_META.items():
        src = PAGES / filename
        if not src.exists():
            print(f"  ! missing page source: {src}")
            continue
        page = read(src)
        html = head.replace("{{PAGE_TITLE}}", meta["title"]) \
                   .replace("{{PAGE_DESC}}", meta["desc"]) \
                   .replace("{{PAGE_ID}}", meta["id"])
        html += "\n" + header + "\n" + page + "\n" + footer
        # Collapse any accidental double blank lines
        html = re.sub(r"\n{3,}", "\n\n", html)
        out = ROOT / filename
        out.write_text(html, encoding="utf-8")
        print(f"  ✓ built {filename} ({len(html) // 1024} KB)")

    print("Done.")


if __name__ == "__main__":
    main()
