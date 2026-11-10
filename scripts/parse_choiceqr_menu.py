"""Export all sections from a public ChoiceQR menu."""

import csv
import json
from decimal import Decimal, InvalidOperation
from html.parser import HTMLParser
from pathlib import Path
from time import sleep
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen

TARGET_URL = "https://residence1.choiceqr.com"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "source"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)


class NextDataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.capturing = False
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "script" and dict(attrs).get("id") == "__NEXT_DATA__":
            self.capturing = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self.capturing:
            self.capturing = False

    def handle_data(self, data: str) -> None:
        if self.capturing:
            self.parts.append(data)


def as_text(value: Any) -> str:
    if isinstance(value, dict):
        for key in ("uk", "ua", "name", "value", "text"):
            if key in value:
                text = as_text(value[key])
                if text:
                    return text
        return ""
    if isinstance(value, (str, int, float)):
        return str(value).strip()
    return ""


def extract_app_data(html: str) -> dict[str, Any]:
    parser = NextDataParser()
    parser.feed(html)
    if not parser.parts:
        raise ValueError("ChoiceQR response does not contain __NEXT_DATA__")
    page_data = json.loads("".join(parser.parts))
    app_data = page_data.get("props", {}).get("app")
    if not isinstance(app_data, dict):
        raise ValueError("ChoiceQR page data does not contain props.app")
    return app_data


def fetch_app_data(url: str) -> dict[str, Any]:
    request = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    for attempt in range(3):
        try:
            with urlopen(request, timeout=60) as response:
                charset = response.headers.get_content_charset() or "utf-8"
                html = response.read().decode(charset)
            return extract_app_data(html)
        except (HTTPError, URLError, TimeoutError) as error:
            if attempt == 2:
                raise RuntimeError(f"Не вдалося завантажити {url}: {error}") from error
            sleep(0.8 * (attempt + 1))
    raise RuntimeError(f"Не вдалося завантажити {url}")


def find_image_url(value: Any) -> str:
    if isinstance(value, str):
        return value if value.startswith(("https://", "http://")) else ""
    if isinstance(value, list):
        return next((url for entry in value if (url := find_image_url(entry))), "")
    if isinstance(value, dict):
        for key in ("webp", "url", "thumbnail", "medium", "big", "src"):
            if key in value and (url := find_image_url(value[key])):
                return url
    return ""


def get_image_url(item: dict[str, Any]) -> str:
    for key in ("media", "externalMedia", "image", "imageUrl"):
        if key in item and (url := find_image_url(item[key])):
            return url
    return ""


def price_in_uah(item: dict[str, Any]) -> int | float | None:
    value = item.get("price")
    if value is None:
        prices = item.get("prices")
        if isinstance(prices, list) and prices:
            price_entry = prices[0]
            value = price_entry.get("price") if isinstance(price_entry, dict) else price_entry
    if isinstance(value, dict):
        value = value.get("price", value.get("amount"))
    if value in (None, ""):
        return None
    try:
        amount = Decimal(str(value)) / 100
    except (InvalidOperation, ValueError):
        return None
    if amount == 0:
        return None
    return int(amount) if amount == amount.to_integral_value() else float(amount)


def normalize_item(
    item: dict[str, Any],
    section_name: str,
    categories: dict[str, str],
) -> dict[str, Any]:
    weight = as_text(item.get("weight"))
    weight_type = as_text(item.get("weightType"))
    return {
        "Розділ": section_name,
        "Категорія": categories.get(str(item.get("category", "")), section_name),
        "Назва": as_text(item.get("name")),
        "Ціна (грн)": price_in_uah(item),
        "Вага / Об'єм": " ".join(part for part in (weight, weight_type) if part),
        "Опис": as_text(item.get("description")),
        "Фото": get_image_url(item),
    }


def parse_choiceqr_menu() -> None:
    target = urlsplit(TARGET_URL)
    origin = urlunsplit((target.scheme, target.netloc, "", "", ""))
    raw_sections: list[dict[str, Any]] = []
    parsed_items: list[dict[str, Any]] = []
    seen_item_ids: set[str] = set()

    initial_app = fetch_app_data(TARGET_URL)
    sections = initial_app.get("sections")
    if not isinstance(sections, list) or not sections:
        raise ValueError("У ChoiceQR не знайдено розділів меню")

    print(f"Знайдено розділів: {len(sections)}")
    for index, section in enumerate(sections, start=1):
        if not isinstance(section, dict):
            continue
        section_hurl = as_text(section.get("hurl"))
        section_name = as_text(section.get("name")) or "Без назви"
        if not section_hurl:
            continue

        section_url = f"{origin}/{section_hurl.lstrip('/')}"
        app_data = fetch_app_data(section_url)
        menu = app_data.get("menu")
        if not isinstance(menu, list):
            menu = []
        category_data = app_data.get("categories")
        if not isinstance(category_data, list):
            category_data = []
        categories = {
            str(category.get("_id")): as_text(category.get("name"))
            for category in category_data
            if isinstance(category, dict) and category.get("_id")
        }

        raw_sections.append({
            "section": section,
            "categories": category_data,
            "items": menu,
        })
        for item in menu:
            if not isinstance(item, dict):
                continue
            item_id = as_text(item.get("_id"))
            unique_key = f"{section_hurl}:{item_id}" if item_id else ""
            if unique_key and unique_key in seen_item_ids:
                continue
            if unique_key:
                seen_item_ids.add(unique_key)
            parsed_items.append(normalize_item(item, section_name, categories))

        print(f"[{index}/{len(sections)}] {section_name}: {len(menu)} позицій")
        sleep(0.25)

    if not parsed_items:
        raise RuntimeError("Меню не містить позицій для експорту")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    raw_path = OUTPUT_DIR / "raw_menu.json"
    clean_path = OUTPUT_DIR / "menu_clean.json"
    csv_path = OUTPUT_DIR / "menu.csv"

    raw_path.write_text(
        json.dumps(raw_sections, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    clean_path.write_text(
        json.dumps(parsed_items, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    with csv_path.open("w", encoding="utf-8-sig", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=parsed_items[0].keys())
        writer.writeheader()
        writer.writerows(parsed_items)

    print(f"Збережено {len(parsed_items)} позицій:")
    print(f"- {raw_path}")
    print(f"- {csv_path}")
    print(f"- {clean_path}")


if __name__ == "__main__":
    parse_choiceqr_menu()
