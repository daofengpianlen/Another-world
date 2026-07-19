import json

NEW_BLOCK = """(function() {\n                    var picRef = "$2";\n                    var characterName = "$1";\n                    var container = document.currentScript.parentElement;\n                    var commonStyle = "width:100%; height:100%; object-fit:cover; display:block;";\n                    \n                    var resolvedUrl = '';\n                    if (typeof __WUWA_RESOLVE_PIC__ === 'function') {\n                        resolvedUrl = __WUWA_RESOLVE_PIC__(picRef, characterName);\n                    }\n                    if (!resolvedUrl) {\n                        resolvedUrl = "https://files.catbox.moe/" + picRef;\n                    }\n                    \n                    var isVideo = /\.(mp4|webm|mov|m4v|ogg)$/i.test(resolvedUrl);\n                    \n                    if (isVideo) {\n                        container.innerHTML = '<video src="' + resolvedUrl + '" autoplay loop muted playsinline style="' + commonStyle + '"></video>';\n                    } else {\n                        container.innerHTML = '<img src="' + resolvedUrl + '" style="' + commonStyle + '">';\n                    }\n                })();"""

for name in ['电脑专用', '手机专用']:
    path = f'e:/tavern_helper_template-main/src/鸣潮/参考脚本/regex-大头像版-角色聊天框（{name}）.json'
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    s = data['replaceString']

    idx = s.find('(function() {')
    end_marker = '})();'
    end_idx = s.find(end_marker, idx)
    if idx < 0 or end_idx < 0:
        print(f'{name}: NOT FOUND')
        continue
    end_idx += len(end_marker)
    if end_idx < len(s) and s[end_idx] == '\n':
        end_idx += 1
    old_block = s[idx:end_idx]

    # Verify old_block looks correct
    if 'fileName' not in old_block:
        print(f'{name}: block does not contain fileName, skipping')
        print(f'  block[:200]: {old_block[:200]}')
        continue

    new_s = s.replace(old_block, NEW_BLOCK)
    data['replaceString'] = new_s

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    print(f'{name}: DONE')