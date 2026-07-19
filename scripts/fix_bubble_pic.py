import json

# 旧的 inline script（在 replaceString 中，是 JSON 解析后的实际字符串）
old_inline_script = (
    '(function() {\\n'
    '                    var fileName = "$2";\\n'
    '                    var fullUrl = "https://files.catbox.moe/" + fileName;\\n'
    '                    var isVideo = /\\.(mp4|webm|mov|m4v|ogg)$/i.test(fileName);\\n'
    '                    var container = document.currentScript.parentElement;\\n'
    '                    var commonStyle = "width:100%; height:100%; object-fit:cover; display:block;";\\n'
    '                    \\n'
    '                    if (isVideo) {\\n'
    '                        container.innerHTML = \'<video src="\' + fullUrl + \'" autoplay loop muted playsinline style="\' + commonStyle + \'"></video>\';\\n'
    '                    } else {\\n'
    '                        container.innerHTML = \'<img src="\' + fullUrl + \'" style="\' + commonStyle + \'">\';\\n'
    '                    }\\n'
    '                })();'
)

# 新的 inline script
new_inline_script = (
    '(function() {\\n'
    '                    var picRef = "$2";\\n'
    '                    var characterName = "$1";\\n'
    '                    var container = document.currentScript.parentElement;\\n'
    '                    var commonStyle = "width:100%; height:100%; object-fit:cover; display:block;";\\n'
    '                    \\n'
    "                    var resolvedUrl = '';\\n"
    "                    if (typeof __WUWA_RESOLVE_PIC__ === 'function') {\\n"
    '                        resolvedUrl = __WUWA_RESOLVE_PIC__(picRef, characterName);\\n'
    '                    }\\n'
    '                    if (!resolvedUrl) {\\n'
    '                        resolvedUrl = "https://files.catbox.moe/" + picRef;\\n'
    '                    }\\n'
    '                    \\n'
    '                    var isVideo = /\\.(mp4|webm|mov|m4v|ogg)$/i.test(resolvedUrl);\\n'
    '                    \\n'
    '                    if (isVideo) {\\n'
    '                        container.innerHTML = \'<video src="\' + resolvedUrl + \'" autoplay loop muted playsinline style="\' + commonStyle + \'"></video>\';\\n'
    '                    } else {\\n'
    '                        container.innerHTML = \'<img src="\' + resolvedUrl + \'" style="\' + commonStyle + \'">\';\\n'
    '                    }\\n'
    '                })();'
)

names = ['电脑专用', '手机专用']
for name in names:
    path = f'e:/tavern_helper_template-main/src/鸣潮/参考脚本/regex-大头像版-角色聊天框（{name}）.json'
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    old_s = data['replaceString']
    if old_inline_script not in old_s:
        print(f'{name}: old script NOT FOUND in replaceString!')
        # Debug: show the part around 'function'
        idx = old_s.find('(function()')
        if idx >= 0:
            print(f'  Found at index {idx}')
            print(f'  Context: ...{old_s[max(0,idx-10):idx+50]}...')
        continue
    
    new_s = old_s.replace(old_inline_script, new_inline_script)
    data['replaceString'] = new_s
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    print(f'{name}: DONE')