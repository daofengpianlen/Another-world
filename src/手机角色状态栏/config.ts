import { isVideoUrl, resolveMediaUrl } from './media';

/** 角色名 → (场景名 → catbox 短文件名)；场景名不含 `/` */
export const CG_LIST: Record<string, Record<string, string>> = {
  凛: {
    接吻: 'ecx4rj.mp4',
    自慰: 'ovaweh.mp4',
    自慰高潮: '5tkgk6.png',
    摸胸: 'qbsru9.mp4',
    手交: '0f3ds5.mp4',
    手交射精: '6n33vu.png',
    足交: 'x0ydcg.mp4',
    足交射精: 'ciozrm.png',
    乳交: 'ucuutv.mp4',
    乳交射精: 'xpg7j3.png',
    口交: 'cp4xnk.mp4',
    口交射精: 'ymxut8.png',
    破处: 'uiw4j0.mp4',
    破除射精: 'uol067.png',
    正常位做爱: '1hcv25.mp4',
    正常位做爱射精: '7lxvpc.png',
    侧身抬腿做爱: 'ufpn98.mp4',
    侧身抬腿做爱射精: 'ho1ixc.png',
    女上位做爱: 'pyrnt0.mp4',
    女上位做爱射精: '1kmlmz.png',
    后入位做爱: '4ejmiv.mp4',
    后入位做爱射精: 'he9w4z.png',
    抱起做爱: 'iuhhi2.mp4',
    抱起做爱射精: 'yyoegg.png',
    做爱事后结束: 'uiw4j0.mp4',
  },
  艾莉亚: {
    接吻: 'kluquq.mp4',
    自慰: '5kpfga.mp4',
    自慰高潮: 'wlcios.png',
    摸胸: '00rhqc.mp4',
    手交: 'okc0nk.mp4',
    手交射精: 'bz3rjx.png',
    足交: 'detd33.mp4',
    足交射精: 'b0vqmp.png',
    乳交: 'oe50e6.mp4',
    乳交射精: 'iil20b.png',
    口交: '9ofv51.mp4',
    口交射精: 'hwguk9.png',
    破处: '5o6rgc.mp4',
    破除射精: '6zs6lf.png',
    正常位做爱: '3kl3gq.mp4',
    正常位做爱射精: 'dzrkoh.png',
    女上位做爱: '72oezr.mp4',
    女上位做爱射精: 'wm6t6r.png',
    后入位做爱: 'y8qplg.mp4',
    后入位做爱射精: 'fcosik.png',
    抱起做爱: 'k4qk8n.mp4',
    抱起做爱射精: 'lemyca.png',
    做爱事后结束: '8ncrk9.mp4',
  },
  伊洛丝: {
    接吻: '1tjaeu.mp4',
    自慰: 'u6ggl0.mp4',
    自慰高潮: '4249uk.png',
    摸胸: 'fz9f2t.mp4',
    手交: 'rk5qfl.mp4',
    手交射精: '6fztvm.png',
    足交: 'tplyq0.mp4',
    足交射精: '40b8ib.png',
    乳交: '9hbc5r.mp4',
    乳交射精: 'alksdu.png',
    口交: '5d0eii.mp4',
    口交射精: 'laup85.png',
    破处: 'e6g0dn.mp4',
    破除射精: 'p7b5yg.png',
    正常位做爱: 'hpoz2k.mp4',
    正常位做爱射精: 'yt9006.png',
    女上位做爱: 'k9a4wo.mp4',
    女上位做爱射精: 'zhn0k7.png',
    后入位做爱: '632l0t.mp4',
    后入位做爱射精: 'gkemit.png',
    抱起做爱: 'bmrck7.mp4',
    抱起做爱射精: 'vusb7y.png',
    做爱事后结束: 'x7s4jv.mp4',
  },
  莉莉安: {
    接吻: 'cjwzda.mp4',
    自慰: '9nyj4p.mp4',
    自慰高潮: 'cticsu.png',
    摸胸: '7u1x0a.mp4',
    手交: 'cejl5u.mp4',
    手交射精: 'nidr84.png',
    足交: 'tgu36h.mp4',
    足交射精: 'cs95s0.png',
    乳交: '7gl9gs.mp4',
    乳交射精: '4dkq4t.png',
    口交: 'hgpegl.mp4',
    口交射精: 'beepa6.png',
    破处: '6wxxsc.mp4',
    破除射精: 'pphgj9.png',
    正常位做爱: '814m7n.mp4',
    正常位做爱射精: 'bhxqxq.png',
    女上位做爱: '614n9i.mp4',
    女上位做爱射精: 'vlnojz.png',
    后入位做爱: '6ukvy6.mp4',
    后入位做爱射精: 'icmcl7.png',
    抱起做爱: 'ry3y2n.mp4',
    抱起做爱射精: 'spzfiw.png',
    做爱事后结束: 'smfuoe.mp4',
  },
  加洛琳娜: {
    接吻: '5lte1i.mp4',
    自慰: '0fsmge.mp4',
    自慰高潮: '8j4y7j.png',
    摸胸: 'fvo2o3.mp4',
    手交: '49jrxr.mp4',
    手交射精: '5vscf2.png',
    足交: '4vofit.mp4',
    足交射精: 'usziym.png',
    乳交: 'm7dsjc.mp4',
    乳交射精: 'iefanq.png',
    口交: '8vn913.mp4',
    口交射精: 'zxumgs.png',
    破处做爱: '5ooo9n.mp4',
    破除做爱射精: 'wnazuv.png',
    正常位做爱: 'm7yvlu.mp4',
    正常位做爱射精: 'lytssk.png',
    女上位做爱: 'r60i0o.mp4',
    女上位做爱射精: 'j4zkeh.png',
    后入位做爱: 'vpezqk.mp4',
    后入位做爱射精: 'h52vsy.png',
    抱起做爱: '4od981.mp4',
    抱起做爱射精: 'q0mvd7.png',
    做爱事后结束: 't4wi3q.mp4',
  },
  夏洛特: {
    接吻: '7mqied.mp4',
    自慰: 'bnvhap.mp4',
    自慰高潮: 'es1yjv.png',
    摸胸: 'hjnszz.mp4',
    手交: 'ogyf4p.mp4',
    手交射精: 'zsqkp1.png',
    足交: '6lnktz.mp4',
    足交射精: 'sowjbs.png',
    乳交: 'vn8xpt.mp4',
    乳交射精: '4lb1dq.png',
    口交: 'deamgk.mp4',
    口交射精: 'lvdvnq.png',
    正常位做爱: 'e75487.mp4',
    正常位做爱射精: '0eyklb.png',
    女上位做爱: 'vyaymx.mp4',
    女上位做爱射精: 'mhhoe8.png',
    后入位做爱: 'si154q.mp4',
    后入位做爱射精: '2ep49k.png',
    抱起做爱: 'tvgjml.mp4',
    抱起做爱射精: 'vmcnxc.png',
    做爱事后结束: 'fd4uk5.mp4',
  },
  莉娅: {
    接吻: 'a9iy5v.mp4',
    自慰: 'pqz6vx.mp4',
    自慰高潮: 'zi4e2o.png',
    摸胸: 'uhucc4.mp4',
    手交: 'tbdmw2.mp4',
    手交射精: 'q3vog1.png',
    足交: 'xs0k3m.mp4',
    足交射精: 'emih5r.png',
    乳交: 'zainxo.mp4',
    乳交射精: 'yigw1w.png',
    口交: 'wtkl2u.mp4',
    口交射精: '9731m8.png',
    破处做爱: 'kn0htb.mp4',
    破除做爱射精: 'dxgxig.png',
    正常位做爱: 'egf2bk.mp4',
    正常位做爱射精: 'lovxm3.png',
    女上位做爱: 'wwq9no.mp4',
    女上位做爱射精: '825oyh.png',
    后入位做爱: '544tcv.mp4',
    后入位做爱射精: 'o20epx.png',
    抱起做爱: '0lw24q.mp4',
    抱起做爱射精: '3c2gpu.png',
    做爱事后结束: 'y4d1kv.mp4',
  },
};

/** 画廊角色 Tab 顺序 */
export const CG_CHARACTER_ORDER = ['凛', '艾莉亚', '伊洛丝', '莉莉安', '加洛琳娜', '夏洛特', '莉娅'] as const;

/** 仅 SFW 立绘场景（须用 &lt;j&gt; 标签） */
export const CG_SFW_SCENES: Record<string, readonly string[]> = {};

/** NPC 默认头像（catbox 短文件名，完整 URL 由 resolveMediaUrl 拼接） */
export const NPC_AVATAR_URLS: Record<string, string> = {
  莉娅: '8vuya5.png',
  伊洛丝: 'mh3sxe.png',
  埃尔温娜: 'kip19o.png',
  凛: 'm6fo6t.png',
  瑟拉菲娜: 'vuyfeb.png',
  加洛琳娜: 'mplshx.png',
  艾莉亚: '9i43om.png',
  夏洛特: 'i7ttw0.png',
  莉莉安: 'rpt331.png',
  紫苑: 'gaay5d.png',
  绯夜: '2xtsy7.png',
  白璃: 'jp6ind.png',
  修伦: '3wvygg.png',
  莱克斯: 'd48oay.png',
  亚修: '0vqk5k.png',
};

/** <j> 标签 pic 表情差分：角色名 → (表情名 → catbox 短文件名) */
export const EXPRESSION_LIST: Record<string, Record<string, string>> = {
  伊洛丝: {
    平静: 'mh3sxe.png',
    微笑: 'oi1i5k.png',
    开心: '3jch5e.png',
    害羞: 'opik8n.png',
    生气: 'ge67f7.png',
    惊讶: 'tvy8f1.png',
    悲伤: 'hy7xkm.png',
    嫌弃: '6p65lm.png',
    痛苦: '1p7c38.png',
    眨眼笑: '82fguy.png',
    冷漠: 'h6z37b.png',
    震惊: '0p7mq2.png',
  },
  埃尔温娜: {
    平静: 'kip19o.png',
    微笑: '8eljjx.png',
    开心: 'b6rxzo.png',
    害羞: 'n3f4k9.png',
    生气: 'n9x3o4.png',
    惊讶: 'fj52f2.png',
    悲伤: 'i55nux.png',
    嫌弃: '6xwk0c.png',
    痛苦: '6xwk0c.png',
    眨眼笑: 'riux3q.png',
    冷漠: 'sb52w6.png',
    震惊: 'c1dosi.png',
  },
  凛: {
    平静: 'm6fo6t.png',
    微笑: 'oamkfz.png',
    开心: '1mu7q4.png',
    害羞: 'klicuq.png',
    生气: '4dkiv8.png',
    惊讶: 'clhhem.png',
    悲伤: 'tiko14.png',
    嫌弃: 'a8m4cb.png',
    痛苦: '09cglv.png',
    眨眼笑: 'nu4514.png',
    冷漠: 'gzpmr9.png',
    震惊: '9ntcry.png',
  },
  莉娅: {
    平静: '8vuya5.png',
    微笑: 'ay3uk9.png',
    开心: 'bxr0he.png',
    害羞: '5lqu4c.png',
    生气: 't5cvb7.png',
    惊讶: '68po7s.png',
    悲伤: 'yj8tm6.png',
    嫌弃: 'dcp68z.png',
    痛苦: 'anu0em.png',
    眨眼笑: 'q7v8e8.png',
    冷漠: '4aedhx.png',
    震惊: '8mis2y.png',
  },
  瑟拉菲娜: {
    平静: 'vuyfeb.png',
    微笑: 'jf5wfq.png',
    开心: 'uypvsh.png',
    害羞: 'rt9gef.png',
    生气: 'hcl6a9.png',
    惊讶: 'fysmm6.png',
    悲伤: 'zi70l5.png',
    嫌弃: '5fqxvz.png',
    痛苦: 'wkf63j.png',
    眨眼笑: 'c1trp7.png',
    冷漠: 'ozlz5i.png',
    震惊: 'oocmc8.png',
  },
  加洛琳娜: {
    平静: 'mplshx.png',
    微笑: '3wfnnc.png',
    开心: '1hq0hv.png',
    害羞: 'p6lna9.png',
    生气: 'vhobo3.png',
    惊讶: 'kxyr69.png',
    悲伤: 'imx07e.png',
    嫌弃: 'zy6jnn.png',
    痛苦: 'q6qux4.png',
    眨眼笑: 'h71bqr.png',
    冷漠: '5eak3s.png',
    震惊: '3y2b6c.png',
  },
  艾莉亚: {
    平静: '9i43om.png',
    微笑: 'xoochw.png',
    开心: 'lppksj.png',
    害羞: 'rjxz7x.png',
    生气: '5pc3ul.png',
    惊讶: 'g8qbgh.png',
    悲伤: '4g7kk3.png',
    嫌弃: 'v1x7cr.png',
    痛苦: '134b0w.png',
    眨眼笑: 'effwng.png',
    冷漠: 'abr1rv.png',
    震惊: 'axds04.png',
  },
  夏洛特: {
    平静: 'i7ttw0.png',
    微笑: '5mvggy.png',
    开心: 'ip2yl2.png',
    害羞: 'fdvnl4.png',
    生气: 'y76th5.png',
    惊讶: 'lnz55h.png',
    悲伤: '7lyk0g.png',
    嫌弃: 'en3osh.png',
    痛苦: '9fgbl7.png',
    眨眼笑: 'bfqiab.png',
    冷漠: 'a1rr6g.png',
    震惊: 'reowm3.png',
  },
  莉莉安: {
    平静: 'rpt331.png',
    微笑: 'xmzysa.png',
    开心: '9cgalh.png',
    害羞: 'atq5ka.png',
    生气: 'hpt5j5.png',
    惊讶: 'hti4dq.png',
    悲伤: 'n845y0.png',
    嫌弃: 'nosqwn.png',
    痛苦: 'i5hcq8.png',
    眨眼笑: 'xvb6o5.png',
    冷漠: 'zafebe.png',
    震惊: 'xf8b2q.png',
  },
  紫苑: {
    平静: 'gaay5d.png',
    微笑: 'l9c7za.png',
    开心: '48u23n.png',
    害羞: 'u83tqj.jpg',
    生气: '4vutqa.png',
    惊讶: 'u167l7.png',
    悲伤: '5iwnle.png',
    嫌弃: 'm2tt8q.png',
    痛苦: '66izoa.png',
    眨眼笑: 'nfl04x.png',
    冷漠: '0841tt.png',
    震惊: 'ixctcs.png',
  },
  绯夜: {
    平静: '2xtsy7.png',
    微笑: 'ri06wr.png',
    开心: 'ucod8l.png',
    害羞: 'u8x1zr.png',
    生气: 'q4bq7r.jpg',
    惊讶: '79rbmq.png',
    悲伤: '9ecpek.png',
    嫌弃: 'y3jlkz.png',
    痛苦: 'wnggkh.png',
    眨眼笑: '64kjxo.png',
    冷漠: 'x6tp65.png',
    震惊: 'j5vozj.png',
  },
  白璃: {
    平静: 'jp6ind.png',
    微笑: 'lhbant.png',
    开心: '61t6i0.png',
    害羞: '1luwe8.jpg',
    生气: 'aairfq.jpg',
    惊讶: 'iowklj.png',
    悲伤: '46yzv8.jpg',
    嫌弃: 'esqo3s.png',
    痛苦: 'ax3xug.png',
    眨眼笑: '43nc6f.png',
    冷漠: '7g5tkd.png',
    震惊: 'xcifhz.png',
  },
  修伦: {
    平静: '3wvygg.png',
    微笑: 'rfcch6.png',
    开心: 'coa2vy.png',
    害羞: 'm6e9al.png',
    生气: 'edigvj.png',
    惊讶: 'z7dc61.png',
    悲伤: 'ki1alv.png',
    嫌弃: 'ezsiqs.png',
    痛苦: 'i6983e.png',
    眨眼笑: 's8nkck.png',
    冷漠: 'zvkvs2.png',
    震惊: 'dw07lp.png',
  },
  莱克斯: {
    平静: 'd48oay.png',
    微笑: '3n7dzm.png',
    开心: '6rqvon.png',
    害羞: 'xl6d2x.png',
    生气: '67eolo.png',
    惊讶: 'ptl9k5.png',
    悲伤: 'qpkniv.png',
    嫌弃: 'erdbpl.png',
    痛苦: 't244nx.png',
    眨眼笑: 't244nx.png',
    冷漠: 'cfqwx9.png',
    震惊: 'nyjvqv.png',
  },
  亚修: {
    平静: '0vqk5k.png',
    微笑: 'bzzfvv.png',
    开心: 'r5zzyw.png',
    害羞: 'xszs0i.png',
    生气: '7q45oz.png',
    惊讶: 'qzhgbr.png',
    悲伤: 'qegljq.png',
    嫌弃: '1yhzvl.png',
    痛苦: 'fu5ayo.png',
    眨眼笑: 'vzzid5.png',
    冷漠: 'm5awrx.png',
    震惊: 'tydmy7.png',
  },
};

/** 剧情称呼 → 程序内角色名（头像 / 表情表键） */
export const NPC_NAME_ALIASES: Record<string, string> = {
  龙族首领: '白璃',
  血族首领: '绯夜',
  魔王护法·紫苑: '紫苑',
  魔王护法紫苑: '紫苑',
  '教会圣骑士·修伦': '修伦',
  教会圣骑士修伦: '修伦',
  '四天王·莱克斯': '莱克斯',
  四天王莱克斯: '莱克斯',
  '魔王四天王·莱克斯': '莱克斯',
  魔王四天王莱克斯: '莱克斯',
  魔王: '亚修',
  '魔王·亚修': '亚修',
};

export function normalizeNpcName(name: string): string {
  const trimmed = name.trim();
  return NPC_NAME_ALIASES[trimmed] ?? trimmed;
}

/** CG 场景名：去掉 `/`，如「抱起/做爱」→「抱起做爱」 */
export function normalizeCgSceneName(name: string): string {
  return name.trim().replace(/\//g, '');
}

export function lookupCgSceneFile(character: string, scene: string): string | undefined {
  const scenes = CG_LIST[character];
  if (!scenes) return undefined;
  const canonical = normalizeCgSceneName(scene);
  return scenes[canonical] ?? scenes[scene];
}

/** 解锁用：角色名 → 该角色全部 CG 完整 URL */
export const CG_GALLERY: Record<string, string[]> = buildCgGallery(CG_LIST);

export interface GallerySceneItem {
  label: string;
  url: string;
  character: string;
  nsfw?: boolean;
}

export interface GalleryTab {
  id: string;
  label: string;
  character: string;
  scenes: GallerySceneItem[];
}

export interface GalleryCategoryGroup {
  category: string;
  character: string;
  scenes: GallerySceneItem[];
}

function buildCgGallery(cg_list: Record<string, Record<string, string>>): Record<string, string[]> {
  const gallery: Record<string, string[]> = {};
  for (const [character, scenes] of Object.entries(cg_list)) {
    gallery[character] = _(scenes)
      .values()
      .uniq()
      .map(resolveMediaUrl)
      .value();
  }
  return gallery;
}

function is_sfw_scene(character: string, scene: string): boolean {
  return CG_SFW_SCENES[character]?.includes(scene) ?? false;
}

export function getGalleryTabs(): GalleryTab[] {
  return CG_CHARACTER_ORDER.map(character => ({
    id: character,
    label: character,
    character,
    scenes: Object.entries(CG_LIST[character] ?? {}).map(([label, file]) => ({
      label,
      url: resolveMediaUrl(file),
      character,
      nsfw: !is_sfw_scene(character, label),
    })),
  }));
}

/** @deprecated 使用 getGalleryTabs */
export function getGalleryCategories(): GalleryCategoryGroup[] {
  return getGalleryTabs().map(tab => ({
    category: tab.label,
    character: tab.character,
    scenes: tab.scenes,
  }));
}

export function isSfwMediaUrl(url: string): boolean {
  const resolved = resolveMediaUrl(url);
  for (const [character, scenes] of Object.entries(CG_LIST)) {
    for (const [label, file] of Object.entries(scenes)) {
      if (resolveMediaUrl(file) === resolved) return is_sfw_scene(character, label);
    }
  }
  return false;
}

export function isNsfwMediaUrl(url: string): boolean {
  const resolved = resolveMediaUrl(url);
  for (const [character, scenes] of Object.entries(CG_LIST)) {
    for (const [label, file] of Object.entries(scenes)) {
      if (resolveMediaUrl(file) === resolved) return !is_sfw_scene(character, label);
    }
  }
  return false;
}

export interface MapRegion {
  name: string;
  min_level: number;
  max_level: number;
  description: string;
  /** 该地图内可活动、可描写的次级地点 */
  sub_areas: string[];
  /** 与主线/圣器相关的提示（供界面与世界书引用） */
  story_hook?: string;
  /** 本区区域 Boss 名（野怪/NPC 四维不得超过该 Boss） */
  regional_boss?: string;
}

export const MAP_REGIONS: MapRegion[] = [
  {
    name: '圣光教会圣地',
    min_level: 1,
    max_level: 5,
    regional_boss: '守夜魔像',
    description: '独立于艾瑟兰王城的神权中心，白城与总坛所在。勇者被召唤落地于此，接受教主与圣女伊洛丝的任务。',
    sub_areas: ['召唤祭坛', '圣光教会总坛', '教主礼拜厅', '圣女院', '朝圣阶', '教会巡礼营'],
    story_hook: '第1章召唤；第12章返教会',
  },
  {
    name: '艾瑟兰王城',
    min_level: 5,
    max_level: 10,
    regional_boss: '试炼幻阵·铁骑残影',
    description: '人类王国政治与军事心脏，王宫与骑士团驻地；与北侧教会圣地分立，经大道相连。',
    sub_areas: ['艾瑟兰王宫', '骑士圣堂', '勇者广场', '下城区与亚人街', '凯旋门大道'],
    story_hook: '第4章试炼获勇者之剑',
  },
  {
    name: '中立自由地带',
    min_level: 11,
    max_level: 20,
    regional_boss: '佣兵统领',
    description: '王城外围缓冲带。奴隶贸易、冒险者与赴王城商路交汇。',
    sub_areas: ['自由贸易城', '奴隶市场旧址', '冒险者公会总部', '湿地商驿', '赴王城大道'],
    story_hook: '第2章解救凛；第3章遇见偷跑公主艾莉亚',
  },
  {
    name: '矮人王国废墟',
    min_level: 21,
    max_level: 30,
    regional_boss: '莉莉安',
    description: '千年前被天罚抹平的矮人王国残骸。',
    sub_areas: ['铁壁要塞残骸', '王国熔炉遗址', '天罚裂谷', '学者营地'],
    story_hook: '第5章结识莉莉安',
  },
  {
    name: '精灵古森林',
    min_level: 31,
    max_level: 40,
    regional_boss: '紫苑',
    description: '东部古林，生命之树与树心圣地所在。',
    sub_areas: ['迷障林缘', '生命之树', '树心圣地', '精灵遗民聚落'],
    story_hook: '第6章紫苑误会·生命之心',
  },
  {
    name: '远古遗迹带',
    min_level: 41,
    max_level: 50,
    regional_boss: '白璃',
    description: '龙族祖庭与血族夜域交界的千年遗迹。',
    sub_areas: ['龙眠断碑群', '永夜血庭外环', '双翼祭坛', '断碑古战场'],
    story_hook: '第7章龙血两族·双翼之盾（绯夜为同区次级 Boss）',
  },
  {
    name: '狐族领地',
    min_level: 51,
    max_level: 60,
    regional_boss: '莱克斯',
    description: '狐族传统家园，现由魔王四天王莱克斯实控。',
    sub_areas: ['狐丘圣镜殿', '九尾祭坛', '莱克斯军帐', '继承人禁苑'],
    story_hook: '第8章凛的继承人身份·心灵之镜·莱克斯',
  },
  {
    name: '魔女隐域',
    min_level: 61,
    max_level: 70,
    regional_boss: '埃尔温娜',
    description: '雾隐高地上的魔法学院，院长为四天王埃尔温娜。',
    sub_areas: ['魔法学院主楼', '院长办公室', '禁忌书库', '莉莉安曾居工坊'],
    story_hook: '第9章埃尔温娜·莉莉安卧底抉择',
  },
  {
    name: '邪神葬地',
    min_level: 71,
    max_level: 80,
    regional_boss: '亚修',
    description: '邪神遗迹与初代魔王亚修封印所在。',
    sub_areas: ['葬地入口', '邪神遗迹回廊', '魔王封印间', '千年回响坑'],
    story_hook: '第10章魔王亚修破封决战',
  },
  {
    name: '天空之门',
    min_level: 81,
    max_level: 90,
    regional_boss: '修伦',
    description: '悬浮于教会圣地与王城上空的界域入口，圣域唯一通道。第十二章由教会圣骑士修伦守门。',
    sub_areas: ['教会镇守军团营', '圣骑士验武台', '界域转译阵'],
    story_hook: '第12章守门战·进入圣域',
  },
  {
    name: '圣域',
    min_level: 91,
    max_level: 100,
    regional_boss: '莉娅',
    description: '女神莉娅的神圣位面；须由天空之门界域转译阵进入。',
    sub_areas: ['浮空云阶', '女神神殿', '信仰之泉', '六翼未竟台'],
    story_hook: '第12章终战女神',
  },
];

export {
  COMBAT_BOSSES,
  COMBAT_ENEMIES,
  COMBAT_WILD_ENEMIES,
  find_boss_template,
  format_battle_tag,
  get_regional_boss,
  get_region_level_band,
  list_bosses,
  list_wild_enemies,
  pick_combat_enemy,
  pick_wild_enemy,
  REGION_LEVEL_BANDS,
  type CombatEnemyKind,
  type CombatEnemyTier,
  type CombatRosterEntry,
} from './combatRoster';

export const GAME_TITLE = '异世界大冒险';

/** 按 NPC 姓名从程序内置表取头像，不读取 MVU / AI 传输的地址 */
export function resolveNpcAvatar(name: string): string {
  const canonical = normalizeNpcName(name);
  const file = NPC_AVATAR_URLS[canonical];
  return file ? resolveMediaUrl(file) : '';
}

export function hasNpcAvatar(name: string): boolean {
  return Boolean(NPC_AVATAR_URLS[normalizeNpcName(name)]);
}

/**
 * 解析 <j> 内 <pic>：pic 只写表情名（配合 j 开头角色名）；也兼容旧格式 `角色名/表情` 与 catbox/https
 */
export function resolveJPic(speaker: string, pic_ref: string): string {
  const ref = pic_ref.trim();
  if (!ref) return '';

  const speaker_name = normalizeNpcName(speaker);

  if (ref.includes('/')) {
    const slash = ref.indexOf('/');
    const character = normalizeNpcName(ref.slice(0, slash).trim());
    const expression = ref.slice(slash + 1).trim();
    const expression_file = EXPRESSION_LIST[character]?.[expression];
    if (expression_file) return resolveMediaUrl(expression_file);
    const calm = EXPRESSION_LIST[character]?.['平静'];
    if (calm) return resolveMediaUrl(calm);
    const cg_file = lookupCgSceneFile(character, expression);
    if (cg_file) return resolveMediaUrl(cg_file);
  } else {
    const expression_file = EXPRESSION_LIST[speaker_name]?.[ref];
    if (expression_file) return resolveMediaUrl(expression_file);
    const calm = EXPRESSION_LIST[speaker_name]?.['平静'];
    if (calm) return resolveMediaUrl(calm);
    const cg_file = lookupCgSceneFile(speaker_name, ref);
    if (cg_file) return resolveMediaUrl(cg_file);
  }

  return resolveMediaUrl(ref);
}

export function isSameMediaUrl(a: string, b: string): boolean {
  return resolveMediaUrl(a) === resolveMediaUrl(b);
}

export function findCgOwner(url: string): { character: string; index: number } | null {
  const resolved = resolveMediaUrl(url);
  for (const [character, urls] of Object.entries(CG_GALLERY)) {
    const index = urls.findIndex(u => resolveMediaUrl(u) === resolved);
    if (index >= 0) return { character, index };
  }
  return null;
}

export { isVideoUrl, resolveMediaUrl };
