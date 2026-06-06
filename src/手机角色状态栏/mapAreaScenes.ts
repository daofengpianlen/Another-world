import { MAP_REGIONS } from './config';
import { resolveMediaUrl } from './media';

/** 地图次级区域 / 大区域名 → catbox 短文件名（`<background>召唤祭坛</background>`） */
export const MAP_AREA_FILES: Record<string, string> = {
  召唤祭坛: 'nwqh6t.png',
  圣光教会总坛: '8v1ndd.png',
  教主礼拜厅: 'jtkrc8.png',
  圣女院: 'jvxo3r.png',
  朝圣阶: 'y58j6v.png',
  教会巡礼营: 'kqb78c.png',
  艾瑟兰王宫: 'qt7y7m.png',
  骑士圣堂: 'frui91.png',
  勇者广场: '8w6z8l.png',
  下城区与亚人街: 'i7gnf9.png',
  凯旋门大道: 'rgow94.png',
  自由贸易城: 'qlkmek.png',
  奴隶市场旧址: 'qlwetu.png',
  冒险者公会总部: 'o0ms50.png',
  湿地商驿: 'u2e14h.png',
  赴王城大道: 'ej7hhz.png',
  铁壁要塞残骸: '2jlzij.png',
  矮人王国废墟: 'jr9e13.png',
  王国熔炉遗址: '9tqxfz.png',
  天罚裂谷: 'ci8sh7.png',
  学者营地: 'vb4dfa.png',
  迷障林缘: 'yrmn38.png',
  生命之树: 'qfv3ql.png',
  树心圣地: 'svgg04.png',
  精灵遗民聚落: '3ckroc.png',
  龙眠断碑群: 'nqnb7i.png',
  永夜血庭外环: '8o8bbf.png',
  双翼祭坛: 'u0lxqx.png',
  断碑古战场: 'pkywtu.png',
  狐丘圣镜殿: '4q4bq1.png',
  九尾祭坛: 'fqim6b.png',
  莱克斯军帐: 'ku0aee.png',
  继承人禁苑: 'jl9b3q.png',
  魔法学院主楼: 'wojfv4.png',
  院长办公室: '2hscxq.png',
  禁忌书库: 'vkacqm.png',
  莉莉安曾居工坊: 'b34vcg.png',
  葬地入口: '1z6wra.png',
  邪神遗迹回廊: '0ugpyo.png',
  魔王封印间: 'cc0fok.png',
  千年回响坑: 'lreqiy.png',
  教会镇守军团营: '5or0dp.png',
  圣骑士验武台: '94t8kg.png',
  界域转译阵: 'k35wgv.png',
  浮空云阶: '4n9qyy.png',
  女神神殿: 'htixxg.png',
  信仰之泉: '86wnvv.png',
  六翼未竟台: 'e50ht9.png',
};

export function is_map_area_label(label: string): boolean {
  return Boolean(MAP_AREA_FILES[label.trim()]);
}

export function resolveMapAreaRef(ref: string): string {
  const trimmed = ref.trim();
  if (!trimmed) return '';
  const file = MAP_AREA_FILES[trimmed];
  return file ? resolveMediaUrl(file) : '';
}

export function findMapAreaLabel(resolved_url: string): string | null {
  const resolved = resolveMediaUrl(resolved_url.trim());
  if (!resolved) return null;
  for (const [label, file] of Object.entries(MAP_AREA_FILES)) {
    if (resolveMediaUrl(file) === resolved) return label;
  }
  return null;
}

/** 传送至大区域时使用的默认次级地点标签 */
export function getDefaultMapAreaLabelForRegion(region_name: string): string {
  const region = MAP_REGIONS.find(r => r.name === region_name);
  if (!region) return region_name;
  if (MAP_AREA_FILES[region_name]) return region_name;
  return region.sub_areas[0] ?? region_name;
}

export function getDefaultMapAreaBackgroundForRegion(region_name: string): string {
  return resolveMapAreaRef(getDefaultMapAreaLabelForRegion(region_name));
}

export function listMapAreaLabels(): string[] {
  return Object.keys(MAP_AREA_FILES);
}
