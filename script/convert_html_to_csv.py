#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
HTML 保存済みの MUSIC ページから全楽曲を抽出し
CSV に保存する。

作詞・作曲・編曲はそれぞれ別々のカラムに出力されるようになりました。

使い方:
    python main.py <input.html> <output.csv>

依存パッケージ:
    pip install beautifulsoup4
"""

import csv
import sys
import re
from bs4 import BeautifulSoup


def parse_html(path: str):
    with open(path, encoding="utf-8") as f:
        soup = BeautifulSoup(f, "html.parser")

    songs = []
    # 各セクション (original／cover／extra)
    for section in soup.select("div.music-Index_Section"):
        category = section.get("data-id", "")        # original/cover/extra
        # 各楽曲
        for item in section.select("ul.list > li.item"):
            # バンド判別用クラス（poppinparty など）
            band = ""
            for cls in item.get("class", []):
                if cls != "item":
                    band = cls
                    break

            artist_el = item.find(class_="artist")
            artist = artist_el.get_text(strip=True) if artist_el else ""

            title_el = item.find(class_="title")
            title = title_el.get_text(strip=True) if title_el else ""

            # 作詞・作曲・編曲を個別カラムに分解する
            # 同じキーが複数ある場合はリストにためて後で連結する
            songwriting_data = {}
            seen_keys = set()
            for dl in item.select(".songwriting dl"):
                dt_el = dl.find("dt")
                dd_el = dl.find("dd")
                if not dt_el:
                    continue

                text_dt = dt_el.get_text(strip=True)
                text_dd = dd_el.get_text(strip=True) if dd_el else ""

                # dd に値があればそれを使い、ないときは dt を分割する
                if text_dd:
                    key = text_dt
                    value = text_dd
                else:
                    # recognize patterns like "作詞　名前" or "作詞：名前" or "作詞:名前"
                    m = re.match(r"(作詞|作曲|編曲)[\s\u3000]*[：:\uFF1A]?\s*(.+)", text_dt)
                    if m and m.group(2):
                        key = m.group(1)
                        value = m.group(2)
                    else:
                        continue

                seen_keys.add(key)
                songwriting_data.setdefault(key, []).append(value)

            lyricist = " | ".join(songwriting_data.get("作詞", []))
            composer = " | ".join(songwriting_data.get("作曲", []))
            arranger = " | ".join(songwriting_data.get("編曲", []))

            # if composer is blank but lyricist exists, copy lyricist (common when no 作曲 field)
            if not composer and lyricist:
                composer = lyricist
                # also drop lyricist entry from arranger if it was duplicated there
                arr_list = songwriting_data.get("編曲", [])
                arr_list = [a for a in arr_list if a != lyricist]
                arranger = " | ".join(arr_list)

            # warning only for keys present but empty
            missing = []
            for field, val in [("作詞", lyricist), ("作曲", composer), ("編曲", arranger)]:
                if field in seen_keys and not val:
                    missing.append(field)
            if missing:
                print(f"warning: missing songwriting info for '{title}' ({', '.join(missing)} empty)")

            songs.append([category, band, artist, title, lyricist, composer, arranger])

    return songs


def save_csv(songs, out_path: str):
    # ヘッダーを更新して作詞・作曲・編曲を別カラムに
    header = ["category", "band", "artist", "title", "lyricist", "composer", "arranger"]
    with open(out_path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(songs)


if __name__ == "__main__":
    html_file = sys.argv[1] if len(sys.argv) > 1 else "songs.html"
    csv_file = sys.argv[2] if len(sys.argv) > 2 else "songs.csv"

    songs = parse_html(html_file)
    save_csv(songs, csv_file)
    print(f"exported {len(songs)} songs → {csv_file}")