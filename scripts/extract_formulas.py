#!/usr/bin/env python3
"""
Extract herbal formulas from 伤寒论方证类编 and 金匮要略方证类编.
Convert traditional dosages to modern grams and output CSV.

Conversion: 1两=3g (modern TCM textbook standard)
Handles: 两, 铢, 斤, 分, 枚, 个, 升, 合, 尺, 片, 钱, 等分, 如鸡子大
"""

import re
import csv
import sys
from collections import OrderedDict

# ========== Chinese number parsing ==========

CN_NUMS = {
    '半': 0.5, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '廿': 20, '卅': 30, '卌': 40,
}

def cn_num_to_float(s: str) -> float:
    s = s.strip()
    if s in CN_NUMS: return CN_NUMS[s]
    result = 0.0
    if '百' in s:
        parts = s.split('百')
        result += (cn_num_to_float(parts[0]) if parts[0] else 1) * 100
        if len(parts) > 1 and parts[1]: result += cn_num_to_float(parts[1])
        return result
    if '千' in s:
        parts = s.split('千')
        result += (cn_num_to_float(parts[0]) if parts[0] else 1) * 1000
        if len(parts) > 1 and parts[1]: result += cn_num_to_float(parts[1])
        return result
    if '十' in s:
        if s == '十': return 10.0
        if s.startswith('十'): return 10.0 + (cn_num_to_float(s[1:]) if len(s) > 1 else 0)
        parts = s.split('十')
        result = cn_num_to_float(parts[0]) * 10
        if len(parts) > 1 and parts[1]: result += cn_num_to_float(parts[1])
        return result
    return result

# ========== Dosage parsing ==========

DOSE_KEYWORDS = ['两', '铢', '斤', '分', '枚', '个', '升', '合', '尺', '片', '钱', '等分', '鸡子大', '如鸡子']

def has_real_dosage(text: str) -> bool:
    """Check if text contains actual dosage (not just prep notes)."""
    if not text: return False
    return any(kw in text for kw in DOSE_KEYWORDS)

def parse_weight_to_grams(raw: str, herb_name: str) -> tuple:
    """
    Parse dosage string to grams.
    Returns (grams, original_dosage_string, unit_type)
    """
    raw = raw.strip()
    if not raw: return (0, '', 'g')

    original = raw

    # Handle 等分 (equal parts) - return special marker
    if '等分' in raw:
        return (0, '等分', '等分')

    # Handle 如鸡子大
    if '如鸡子大' in raw or '鸡子大' in raw:
        # Size of an egg: ~30g for 石膏
        if '石膏' in herb_name: return (30.0, '如鸡子大', 'g')
        return (30.0, '如鸡子大', 'g')

    liang = zhu = fen = jin = qian = 0.0
    mei = ge = sheng = he = chi = pian = 0.0

    # 钱 (Song dynasty: 1钱=3g)
    m = re.search(r'([一二三四五六七八九十百千半]+)钱', raw)
    if m: qian = cn_num_to_float(m.group(1))

    m = re.search(r'([一二三四五六七八九十百千半]+)斤', raw)
    if m: jin = cn_num_to_float(m.group(1))

    m = re.search(r'([一二三四五六七八九十百千半]+)两', raw)
    if m: liang = cn_num_to_float(m.group(1))

    m = re.search(r'([一二三四五六七八九十百千半]+)铢', raw)
    if m: zhu = cn_num_to_float(m.group(1))

    # 分 - only as primary unit (not after 两 where it's 1/4 两)
    # But if there's no 两, 分 is the main unit
    m = re.search(r'([一二三四五六七八九十百千半]+)分$', raw)
    if not m:
        m = re.search(r'([一二三四五六七八九十百千半]+)分[，,]', raw)
    if not m and '两' not in raw:
        m = re.search(r'([一二三四五六七八九十百千半]+)分', raw)
    if m and liang == 0:
        fen = cn_num_to_float(m.group(1))

    m = re.search(r'([一二三四五六七八九十百千半]+)枚', raw)
    if m: mei = int(cn_num_to_float(m.group(1)))

    m = re.search(r'([一二三四五六七八九十百千半]+)个', raw)
    if m: ge = int(cn_num_to_float(m.group(1)))

    m = re.search(r'([一二三四五六七八九十百千半]+)升', raw)
    if m: sheng = cn_num_to_float(m.group(1))

    m = re.search(r'([一二三四五六七八九十百千半]+)合', raw)
    if m: he = cn_num_to_float(m.group(1))

    m = re.search(r'([一二三四五六七八九十百千半]+)尺', raw)
    if m: chi = cn_num_to_float(m.group(1))

    m = re.search(r'([一二三四五六七八九十百千半]+)片', raw)
    if m: pian = cn_num_to_float(m.group(1))

    # Base conversion: 1两=3g, 1铢=1/24两≈0.125g, 1斤=16两=48g, 1钱=3g, 1分(独立)=3g
    grams = (liang * 3.0 + zhu * 0.125 + fen * 3.0 + jin * 48.0 + qian * 3.0)

    # Special unit conversions
    if mei > 0: grams += _mei_to_grams(herb_name, mei)
    if ge > 0: grams += _ge_to_grams(herb_name, ge)
    if sheng > 0: grams += _sheng_to_grams(herb_name, sheng)
    if he > 0: grams += _he_to_grams(herb_name, he)
    if chi > 0: grams += chi * 10.0
    if pian > 0: grams += pian * 3.0

    grams = round(grams, 1)

    # Determine display unit
    unit_type = 'g'
    if mei > 0 and any(x in herb_name for x in ['大枣', '附子', '乌头', '杏仁', '桃仁', '栀子', '枳实']):
        unit_type = '枚'
    elif mei > 0: unit_type = '枚'
    elif ge > 0: unit_type = '个'
    elif pian > 0: unit_type = '片'
    elif sheng > 0: unit_type = '升'
    elif he > 0: unit_type = '合'

    return (grams, original, unit_type)


# ---- Special unit conversions ----

def _mei_to_grams(name, count):
    n = name.strip()
    if '大枣' in n or ('枣' in n and '酸枣' not in n): return count * 1.0  # match example: 12枚→12g
    if '附子' in n or '乌头' in n: return count * 9.0
    if '杏仁' in n: return count * 0.4
    if '桃仁' in n: return count * 0.5
    if '栀子' in n: return count * 3.0
    if '枳实' in n: return count * 5.0
    if '瓜蒌' in n or '栝楼' in n: return count * 30.0
    if '百合' in n: return count * 10.0
    if '鸡子' in n: return count * 50.0
    if any(x in n for x in ['䗪虫', '庶虫', '蟅虫', '土鳖虫']): return count * 1.0
    if '水蛭' in n: return count * 2.0
    if '虻虫' in n: return count * 0.3
    if '蝼蛄' in n: return count * 1.0
    if '蜣螂' in n: return count * 1.0
    if '鼠妇' in n: return count * 0.5
    if '蛴螬' in n: return count * 1.0
    if '蜘蛛' in n: return count * 0.5
    if '露蜂房' in n or '蜂巢' in n: return count * 5.0
    if '蜂蜜' in n or '白蜜' in n: return count * 10.0
    if '乌梅' in n: return count * 3.0
    if '诃子' in n or '诃黎勒' in n: return count * 3.0
    if '石膏' in n: return count * 30.0
    if '射干' in n: return count * 3.0
    if '麻黄' in n: return count * 3.0  # 麻黄如弹子大
    return count * 1.0

def _ge_to_grams(name, count):
    n = name.strip()
    if '杏仁' in n: return count * 0.4
    if '桃仁' in n: return count * 0.5
    if '乌梅' in n: return count * 3.0
    if '诃子' in n or '诃黎勒' in n: return count * 3.0
    if '鸡子黄' in n: return count * 15.0
    if '鸡子' in n: return count * 50.0
    if '大枣' in n or '枣' in n: return count * 2.5
    if '百合' in n: return count * 10.0
    if '水蛭' in n: return count * 2.0
    if '虻虫' in n: return count * 0.3
    return count * 3.0

def _sheng_to_grams(name, count):
    n = name.strip()
    if '半夏' in n: return count * 20.0
    if '芒硝' in n: return count * 30.0
    if '石膏' in n: return count * 30.0
    if '粳米' in n: return count * 50.0
    if '小麦' in n: return count * 40.0
    if '赤小豆' in n: return count * 40.0
    if any(x in n for x in ['麦冬', '麦门冬']): return count * 30.0
    if '葶苈' in n: return count * 30.0
    if any(x in n for x in ['麻子仁', '火麻仁']): return count * 30.0
    if '杏仁' in n: return count * 30.0
    if '酸枣仁' in n: return count * 30.0
    if '五味子' in n: return count * 20.0
    if '吴茱萸' in n: return count * 30.0
    if '花椒' in n or '蜀椒' in n: return count * 20.0
    if any(x in n for x in ['豆豉', '香豉']): return count * 30.0
    if '地黄' in n: return count * 40.0
    if '薏苡' in n: return count * 40.0
    if '虫' in n: return count * 20.0
    if '甘遂' in n: return count * 5.0
    if '芫花' in n: return count * 5.0
    if '大戟' in n: return count * 5.0
    return count * 25.0

def _he_to_grams(name, count):
    return _sheng_to_grams(name, count / 10.0)


# ========== Herb name normalization ==========

HERB_NAME_MAP = {
    '芍药': '白芍', '白芍药': '白芍',
    '芎䓖': '川芎', '芎穷': '川芎', '芎藭': '川芎',
    '薯蓣': '山药',
    '栝楼根': '天花粉', '栝蒌根': '天花粉', '瓜蒌根': '天花粉',
    '蜀漆': '常山', '连轺': '连翘',
    '香豉': '淡豆豉', '豉': '淡豆豉', '豆豉': '淡豆豉',
    '胶饴': '饴糖', '苦酒': '醋', '白蜜': '蜂蜜', '蜜': '蜂蜜',
    '人尿': '童便', '猪肤': '猪皮', '猪膏': '猪油', '猪脂': '猪油',
    '乱发': '血余炭', '代赭': '代赭石',
    '文蛤': '海蛤壳', '贝母': '川贝母', '乌扇': '射干',
    '人参': '党参',
    '天雄': '川乌',
    '橘皮': '陈皮',
    '麦门冬': '麦冬', '天门冬': '天冬',
    '薏苡': '薏苡仁',
    '黄蓍': '黄芪',
    '干地黄': '生地黄', '生地黄': '生地黄',
    '葶苈': '葶苈子',
    '诃黎勒': '诃子',
    '茵陈蒿': '茵陈',
    '䗪虫': '土鳖虫', '庶虫': '土鳖虫', '蟅虫': '土鳖虫',
    '蜂巢': '露蜂房',
    '赤硝': '赤石脂',
    '蜀椒': '花椒',
    '红蓝花': '红花', '新绛': '茜草',
    '白粉': '铅丹', '粉': '铅丹',
    '乌头': '川乌',
    '甘李根白皮': '甘李根白皮',
    '苇茎': '芦根', '瓜瓣': '冬瓜子',
    '牡丹': '牡丹皮', '丹皮': '牡丹皮',
    '通草': '木通',
    '白酒': '白酒', '清酒': '清酒',
    '马通汁': '',
    '食蜜': '蜂蜜',
    '商陆根': '商陆',
    '鸡子黄': '鸡子黄',
    '鸡子': '鸡蛋',
    '胶姜': '阿胶',
    '紫菀': '紫菀',
    '款冬花': '款冬花',
    '紫葳': '凌霄花',
    '蜣螂': '蜣螂',
    '鼠妇': '鼠妇',
    '蛴螬': '蛴螬',
    # Clean up fragment names
    '桂': '桂枝', '五味': '五味子',
    '川椒': '花椒', '蜀椒': '花椒',
    '肥栀子': '栀子', '大附子': '附子',
    '桂枝汤': '桂枝',
    '生地黄汁': '生地黄',
    '生姜汁': '生姜',
    '柏皮': '黄柏',
    '柏叶': '侧柏叶',
    '萎蕤': '玉竹',
    '硝石': '芒硝',
    '瓜蒌实': '瓜蒌',
    '栝蒌实': '瓜蒌',
    '茵陈蒿末': '茵陈',
    '生梓白皮': '梓白皮',
    '桑东南根白皮': '桑白皮',
    '太一禹余粮': '禹余粮',
    '狼牙': '仙鹤草',
    '灶中黄土': '灶心土',
    '蒲灰': '蒲黄',
    '蒴藋细叶': '蒴藋',
    '葵子': '冬葵子',
    '白鱼': '鲞鱼',
    '戎盐': '食盐',
    '盐': '食盐',
    '曲': '神曲',
    '生葛': '葛根',
    '蜂窠': '露蜂房',
    '生竹茹': '竹茹',
    '干苏叶': '紫苏叶',
    '瓜子': '冬瓜子',
    '云母': '云母石',
}

def normalize_herb_name(name: str) -> str:
    name = name.strip()
    if name in HERB_NAME_MAP:
        return HERB_NAME_MAP[name]
    return name


# ========== Tokenizer ==========

def tokenize_composition(comp_text: str) -> list[str]:
    """Split composition text into tokens (one per herb)."""
    comp = comp_text.replace('（', '(').replace('）', ')')
    tokens = []
    current = ''
    depth = 0
    for ch in comp:
        if ch == '(':
            depth += 1
            current += ch
        elif ch == ')':
            depth -= 1
            current += ch
        elif ch == ' ' and depth == 0:
            if current.strip():
                tokens.append(current.strip())
            current = ''
        else:
            current += ch
    if current.strip():
        tokens.append(current.strip())
    return tokens


# ========== Formula extraction ==========

def extract_formulas(md_path: str) -> list[dict]:
    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    formulas = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        m = re.match(r'^##\s+(.+)$', line)
        if m:
            formula_title = m.group(1).strip()
            for j in range(i+1, min(i+5, len(lines))):
                if lines[j].strip() == '方剂组成：':
                    for k in range(j+1, min(j+5, len(lines))):
                        candidate = lines[k].strip()
                        if not candidate: continue
                        if candidate.startswith('原文校注'): continue
                        if '描述：' in candidate: break
                        # Accept if it contains parenthesized dosages or dose keywords
                        if '（' in candidate or '(' in candidate:
                            formulas.append({'name': formula_title, 'composition': candidate})
                        elif any(kw in candidate for kw in ['各', '枚', '升', '合', '等分']):
                            formulas.append({'name': formula_title, 'composition': candidate})
                        elif re.search(r'\b[熬炙洗切去皮擘破碎]', candidate):
                            formulas.append({'name': formula_title, 'composition': candidate})
                        break
                    break
        i += 1
    return formulas


def parse_composition(comp_text: str) -> list[dict]:
    """Parse composition into list of {herb, grams, unit_type, original_dosage}."""
    if not comp_text: return []

    tokens = tokenize_composition(comp_text)
    items = []
    pending_herbs = []
    has_equal_parts = False

    # First pass: check if there's 等分 (equal parts) pattern
    for token in tokens:
        if '等分' in token:
            has_equal_parts = True
            break

    if has_equal_parts:
        # For equal parts formulas, extract the dosage indicator
        for token in tokens:
            if '各等分' in token:
                # This token has the shared 各等分
                m = re.match(r'^([^(]+)(?:\(([^)]*)\))?$', token)
                if m:
                    h = normalize_herb_name(m.group(1).strip())
                    if h:
                        pending_herbs.append(h)
                # resolve all pending (including those from earlier tokens)
                for h in pending_herbs:
                    items.append({'herb': h, 'grams': 10.0, 'unit_type': '等分', 'original_dosage': '等分'})
                pending_herbs = []
            else:
                m = re.match(r'^([^(]+)(?:\(([^)]*)\))?$', token)
                if m:
                    h = normalize_herb_name(m.group(1).strip())
                    if h:
                        pending_herbs.append(h)

        # Any remaining pending (unlikely)
        for h in pending_herbs:
            items.append({'herb': h, 'grams': 10.0, 'unit_type': '等分', 'original_dosage': '等分'})
        return items

    # Normal parsing
    for i, token in enumerate(tokens):
        m = re.match(r'^([^(]+)(?:\(([^)]*)\))?$', token)
        if not m: continue

        herb_name = normalize_herb_name(m.group(1).strip())
        content = m.group(2).strip() if m.group(2) else ''

        if not herb_name: continue

        # Check for 各 (shared dosage)
        if '各' in content:
            dosage_part = content.split('各', 1)[1]
            dosage_clean = dosage_part.split('，')[0].split(',')[0].strip()

            # Apply to pending
            for h in pending_herbs:
                grams, orig, utype = parse_weight_to_grams(dosage_clean, h)
                if grams == 0 and utype == '等分': grams = 3.0  # default
                items.append({'herb': h, 'grams': grams, 'unit_type': utype, 'original_dosage': orig})
            pending_herbs = []

            grams, orig, utype = parse_weight_to_grams(dosage_clean, herb_name)
            if grams == 0 and utype == '等分': grams = 3.0
            items.append({'herb': herb_name, 'grams': grams, 'unit_type': utype, 'original_dosage': orig})
            continue

        # Has real dosage
        if content and has_real_dosage(content):
            # Extract dosage part
            parts = re.split(r'[，,]', content)
            dose_parts = [p.strip() for p in parts if any(kw in p for kw in DOSE_KEYWORDS)]
            dosage_clean = dose_parts[0] if dose_parts else content

            # Apply to pending first
            for h in pending_herbs:
                grams, orig, utype = parse_weight_to_grams(dosage_clean, h)
                items.append({'herb': h, 'grams': grams, 'unit_type': utype, 'original_dosage': orig})
            pending_herbs = []

            grams, orig, utype = parse_weight_to_grams(dosage_clean, herb_name)
            items.append({'herb': herb_name, 'grams': grams, 'unit_type': utype, 'original_dosage': orig})
            continue

        # Prep notes only or no content - look ahead for 各
        has_ge_ahead = False
        for j in range(i+1, min(i+8, len(tokens))):
            if '各' in tokens[j]:
                has_ge_ahead = True
                break

        if has_ge_ahead:
            pending_herbs.append(herb_name)
        else:
            # Herb without dosage - default to equal parts (3g each)
            items.append({'herb': herb_name, 'grams': 3.0, 'unit_type': 'g', 'original_dosage': '等量'})

    # Any stragglers
    for h in pending_herbs:
        items.append({'herb': h, 'grams': 3.0, 'unit_type': 'g', 'original_dosage': '等量'})

    return items


# ========== Main ==========

def main():
    shanghan = extract_formulas('/tmp/shanghan.md')
    jingui = extract_formulas('/tmp/jingui.md')

    print(f"Extracted: 伤寒论 {len(shanghan)}, 金匮要略 {len(jingui)}")

    # Parse
    for f in shanghan: f['items'] = parse_composition(f['composition'])
    for f in jingui: f['items'] = parse_composition(f['composition'])

    # ======= SAMPLE =======
    print("\n" + "="*70)
    print("SAMPLE — Key formulas with conversion details")
    print("="*70)

    key_formulas = [
        '桂枝汤证', '麻黄汤证', '小柴胡汤证', '葛根汤证',
        '白虎汤证', '四逆汤证', '真武汤证', '小青龙汤证',
        '大青龙汤证', '半夏泻心汤证', '十枣汤证', '四逆散证',
        '炙甘草汤证', '乌梅丸证', '小建中汤证'
    ]

    all_formulas = shanghan + jingui
    for f in all_formulas:
        if f['name'] in key_formulas:
            name = re.sub(r'证$', '', f['name'])
            parts = []
            for item in f['items']:
                h, g, orig, ut = item['herb'], item['grams'], item['original_dosage'], item['unit_type']
                if g > 0:
                    parts.append(f"{h} {orig}→{g}g")
                else:
                    parts.append(f"{h} ({orig})")
            print(f"\n{name}:")
            print(f"  {' | '.join(parts)}")

    # ======= CSV OUTPUT =======
    print("\n" + "="*70)
    print("CSV FORMAT (clean, grams only)")
    print("="*70)

    seen = set()
    csv_lines = []
    for f in shanghan + jingui:
        name = re.sub(r'证$', '', f['name'])
        if name in seen: continue
        seen.add(name)
        herb_parts = []
        for item in f['items']:
            if item['grams'] > 0 and item['herb']:
                herb_parts.append(f"{item['herb']} {item['grams']}g")
            elif item['herb']:
                herb_parts.append(f"{item['herb']} {item['original_dosage']}")
        if herb_parts:
            csv_lines.append(f"{name},{'|'.join(herb_parts)}")

    for line in csv_lines[:20]:
        print(line)

    # ======= FULL CSV =======
    output_path = '/Users/zivenjasek/Desktop/Projects/my-projects/百草计/examples/templates-full.csv'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('模版名称,药材\n')
        for line in csv_lines:
            f.write(line + '\n')
    print(f"\nFull CSV: {output_path} ({len(csv_lines)} formulas)")

    # ======= ISSUES =======
    print("\n" + "="*70)
    print("PARSING ISSUES")
    print("="*70)
    issues = []
    for f in shanghan + jingui:
        name = re.sub(r'证$', '', f['name'])
        for item in f['items']:
            if item['grams'] == 0 and item['herb']:
                issues.append(f"  {name}: {item['herb']} (raw: '{item['original_dosage']}')")
    for issue in issues[:20]:
        print(issue)
    print(f"Total: {len(issues)}")

    # ======= STATS =======
    print("\n" + "="*70)
    print("STATISTICS")
    print("="*70)
    sh_names = {re.sub(r'证$', '', f['name']) for f in shanghan}
    jg_names = {re.sub(r'证$', '', f['name']) for f in jingui}
    total = sh_names | jg_names
    overlap = sh_names & jg_names
    print(f"伤寒论: {len(shanghan)} formulas, {len(sh_names)} unique")
    print(f"金匮要略: {len(jingui)} formulas, {len(jg_names)} unique")
    print(f"Combined unique: {len(total)} (overlap: {len(overlap)})")
    print(f"Overlap: {sorted(overlap)}")

    return shanghan, jingui

if __name__ == '__main__':
    sh, jg = main()
