import json
for name in ['电脑专用', '手机专用']:
    path = f'e:/tavern_helper_template-main/src/鸣潮/参考脚本/regex-大头像版-角色聊天框（{name}）.json'
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    s = data['replaceString']
    checks = [
        ('__WUWA_RESOLVE_PIC__', '__WUWA_RESOLVE_PIC__ present'),
        ('fileName', 'WARN: old fileName still present', False),
        ('picRef', 'picRef present'),
        ('characterName', 'characterName present'),
        ('catbox.moe', 'catbox fallback preserved'),
    ]
    for token, label, *extra in checks:
        found = token in s
        if extra and extra[0] is False:
            status = 'OK' if not found else 'WARN'
            print(f'{name}: {status} - {label}')
        else:
            status = 'OK' if found else 'FAIL'
            print(f'{name}: {status} - {label}')
    print()