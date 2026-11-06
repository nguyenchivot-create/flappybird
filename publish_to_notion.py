#!/usr/bin/env python3
"""Publish the Flappy Bird article to Notion SecondBrain."""
import os, json, requests
from datetime import date

NOTION_API_KEY = os.environ.get("NOTION_API_KEY")
if not NOTION_API_KEY:
    print("ERROR: NOTION_API_KEY not set")
    exit(1)

DATA_SOURCE_ID = "703fbee5-8585-4845-9cea-990a5390c493"
NOTION_VERSION = "2025-09-03"
BASE_URL = "https://api.notion.com/v1"

headers = {
    "Authorization": f"Bearer {NOTION_API_KEY}",
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
}


def notion_post(endpoint, payload):
    resp = requests.post(f"{BASE_URL}/{endpoint}", headers=headers, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()


def notion_patch(endpoint, payload):
    resp = requests.patch(f"{BASE_URL}/{endpoint}", headers=headers, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()


def notion_get(endpoint):
    resp = requests.get(f"{BASE_URL}/{endpoint}", headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()


def find_page_by_title(title):
    payload = {
        "filter": {"property": "Item", "title": {"equals": title}},
        "page_size": 10,
    }
    resp = requests.post(
        f"{BASE_URL}/data_sources/{DATA_SOURCE_ID}/query",
        headers=headers, json=payload, timeout=30
    )
    resp.raise_for_status()
    results = resp.json().get("results", [])
    return results[0] if results else None


def md_to_notion_blocks(md_text):
    blocks = []
    for line in md_text.split("\n"):
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("# ") and not stripped.startswith("## "):
            text = stripped[2:].strip()
            blocks.append({
                "object": "block",
                "type": "heading_1",
                "heading_1": {"rich_text": [{"type": "text", "text": {"content": text}}]},
            })
        elif stripped.startswith("## ") and not stripped.startswith("### "):
            text = stripped[3:].strip()
            blocks.append({
                "object": "block",
                "type": "heading_2",
                "heading_2": {"rich_text": [{"type": "text", "text": {"content": text}}]},
            })
        elif stripped.startswith("### "):
            text = stripped[4:].strip()
            blocks.append({
                "object": "block",
                "type": "heading_3",
                "heading_3": {"rich_text": [{"type": "text", "text": {"content": text}}]},
            })
        elif stripped[0].isdigit() and ". " in stripped[:4]:
            text = stripped.split(". ", 1)[1]
            blocks.append({
                "object": "block",
                "type": "numbered_list_item",
                "numbered_list_item": {"rich_text": [{"type": "text", "text": {"content": text}}]},
            })
        elif stripped.startswith("- ") or stripped.startswith("* "):
            text = stripped[2:].strip()
            blocks.append({
                "object": "block",
                "type": "bulleted_list_item",
                "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": text}}]},
            })
        else:
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {"rich_text": [{"type": "text", "text": {"content": stripped}}]},
            })
    return blocks


def upsert_article(title, md_text, icon, status="Published", projects=None, people=None):
    existing = find_page_by_title(title)
    props = {
        "Item": {"title": [{"text": {"content": title}}]},
        "Status": {"select": {"name": status}},
        "Project": {"multi_select": [{"name": p} for p in (projects or ["Hermes Agent", "Writing"])]},
        "People": {"multi_select": [{"name": p} for p in (people or ["Taanis"])]},
        "Priority": {"select": {"name": "Medium"}},
        "How Important?": {"select": {"name": "Important"}},
        "How Urgent?": {"select": {"name": "Not Urgent"}},
        "Recurring?": {"multi_select": [{"name": "No"}]},
        "Date": {"date": {"start": str(date.today())}},
    }

    if existing:
        page_id = existing["id"]
        print(f"Updating existing: {title}")
        notion_patch(f"pages/{page_id}", {"properties": props, "icon": {"type": "emoji", "emoji": icon}})
        existing_blocks = notion_get(f"blocks/{page_id}/children").get("results", [])
        for block in existing_blocks:
            notion_patch(f"blocks/{block['id']}", {"archived": True})
    else:
        payload = {
            "parent": {"data_source_id": DATA_SOURCE_ID},
            "properties": props,
            "icon": {"type": "emoji", "emoji": icon},
        }
        resp = notion_post("pages", payload)
        page_id = resp["id"]
        print(f"Created new: {title}")

    blocks = md_to_notion_blocks(md_text)
    print(f"  Adding {len(blocks)} blocks...")
    for i in range(0, len(blocks), 50):
        notion_patch(f"blocks/{page_id}/children", {"children": blocks[i:i+50]})

    page = notion_get(f"pages/{page_id}")
    return page.get("url", f"https://notion.so/{page_id.replace('-', '')}")


def main():
    article_path = os.path.join(os.path.dirname(__file__), "ARTICLE.md")
    with open(article_path) as f:
        md_text = f.read()

    url = upsert_article(
        title="How My AI Agent Team Built a Flappy Bird Clone",
        md_text=md_text,
        icon="🎮",
        status="Published",
        projects=["Writing", "Agent Team"],
        people=["Taanis"],
    )
    print(f"Notion URL: {url}")


if __name__ == "__main__":
    main()
