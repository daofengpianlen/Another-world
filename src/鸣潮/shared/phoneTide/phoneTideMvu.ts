import { extractStatData, resolveTideEditMessageId } from '../tideMvuReader';



type StatData = Record<string, unknown>;



function tryApplyStoryLogic(stat_data: StatData): StatData {

  const pick =

    (typeof calculateStoryLogic === 'function' && calculateStoryLogic) ||

    (typeof window !== 'undefined' && (window as Window & { calculateStoryLogic?: (s: StatData) => StatData }).calculateStoryLogic) ||

    null;

  if (typeof pick === 'function') {

    try {

      return pick(stat_data);

    } catch (error) {

      console.warn('[鸣潮手机状态] Story Logic 同步失败', error);

    }

  }

  return stat_data;

}



async function saveMvuStatPatch(patch: (current: StatData) => StatData) {

  const message_id = resolveTideEditMessageId();

  const mvu_data = await Mvu.getMvuData({ type: 'message', message_id });

  const current = extractStatData(mvu_data);

  mvu_data.stat_data = tryApplyStoryLogic(patch(current));

  await Mvu.replaceMvuData(mvu_data, { type: 'message', message_id });



  if (typeof window !== 'undefined' && typeof window.fetchLatestMvuData === 'function') {

    window.fetchLatestMvuData(true);

  }



  document.dispatchEvent(new CustomEvent('wuwa-phone-tide-refresh'));



  if (typeof toastr !== 'undefined') {

    toastr.success('已保存');

  }

}



export async function phoneTideEditStoryVar(_stat: StatData, key: string, label: string) {

  const current = String(_stat[key] ?? '');

  const next = prompt(`修改${label}：`, current);

  if (next === null) return;

  await saveMvuStatPatch(stat => ({ ...stat, [key]: next }));

}



export async function phoneTideEditGoal(_stat: StatData) {

  const current = String(_stat.当前长期目标 ?? '');

  const next = prompt('请输入新的长期目标：', current);

  if (next === null) return;

  await saveMvuStatPatch(stat => ({ ...stat, 当前长期目标: next }));

}



export async function phoneTideEditUserField(_stat: StatData, field: string) {

  const user = (_stat.主角信息 as Record<string, unknown>) ?? {};

  const current = String(user[field] ?? '');

  const next = prompt(`修改主角的【${field}】：`, current);

  if (next === null) return;

  await saveMvuStatPatch(stat => {

    const u = (stat.主角信息 as Record<string, unknown>) ?? {};

    return { ...stat, 主角信息: { ...u, [field]: next } };

  });

}



export async function phoneTideEditUserGender(_stat: StatData) {

  const user = (_stat.主角信息 as Record<string, unknown>) ?? {};

  const current = String(user.性别 ?? '男');

  const next = current === '男' ? '女' : '男';

  if (!confirm(`是否将其性别修改为：${next}？`)) return;

  await saveMvuStatPatch(stat => {

    const u = (stat.主角信息 as Record<string, unknown>) ?? {};

    return { ...stat, 主角信息: { ...u, 性别: next } };

  });

}



export async function phoneTideEditUserRover(_stat: StatData) {

  const user = (_stat.主角信息 as Record<string, unknown>) ?? {};

  const is_rover = String(user.是否是漂泊者) === 'true';

  const next = !is_rover;

  if (!confirm(`是否将其漂泊者身份修改为：${next ? '是' : '否'}？`)) return;

  await saveMvuStatPatch(stat => {

    const u = (stat.主角信息 as Record<string, unknown>) ?? {};

    return { ...stat, 主角信息: { ...u, 是否是漂泊者: next } };

  });

}



export async function phoneTideToggleUserSex(_stat: StatData) {

  const user = (_stat.主角信息 as Record<string, unknown>) ?? {};

  const sex = (user.性爱状态 as Record<string, unknown>) ?? {};

  const is_sex = String(sex.是否正在性爱) === 'true';

  const next = !is_sex;

  if (!confirm(`是否切换性爱状态为：${next ? '性爱中' : '正常'}？`)) return;

  await saveMvuStatPatch(stat => {

    const u = (stat.主角信息 as Record<string, unknown>) ?? {};

    const s = (u.性爱状态 as Record<string, unknown>) ?? {};

    return { ...stat, 主角信息: { ...u, 性爱状态: { ...s, 是否正在性爱: next } } };

  });

}



export async function phoneTideEditNPCRover(_stat: StatData) {

  const npc = (_stat.NPC漂泊者 as Record<string, unknown>) ?? {};

  const exists = String(npc.是否存在) === 'true';

  const gender = String(npc.性别 ?? '未知');

  let next_exists = exists;

  let next_gender = gender;



  if (!exists) {

    if (!confirm('NPC漂泊者当前为【无】。是否要将其修改为【有】？')) return;

    next_exists = true;

    next_gender = confirm('点击[确定]设为【女】，点击[取消]设为【男】') ? '女' : '男';

  } else {

    const act = prompt(`当前为【有】(性别: ${gender})。\n1. 修改性别\n2. 删除`, '1');

    if (act === '1') next_gender = gender === '男' ? '女' : '男';

    else if (act === '2') next_exists = false;

    else return;

  }



  await saveMvuStatPatch(stat => {

    const n = (stat.NPC漂泊者 as Record<string, unknown>) ?? {};

    const updated = { ...n, 是否存在: next_exists };

    if (next_exists) updated.性别 = next_gender;

    return { ...stat, NPC漂泊者: updated };

  });

}



export async function phoneTideEditAffection(_stat: StatData, name: string) {

  const chars = (_stat.女性角色 as Record<string, Record<string, unknown>>) ?? {};

  const current = Number(chars[name]?.好感度 ?? 0);

  const raw = prompt(`请输入【${name}】的新好感度：`, String(current));

  if (raw === null) return;

  const next = parseInt(raw, 10);

  if (Number.isNaN(next)) {

    alert('请输入有效数字');

    return;

  }

  await saveMvuStatPatch(stat => {

    const c = (stat.女性角色 as Record<string, Record<string, unknown>>) ?? {};

    return {

      ...stat,

      女性角色: { ...c, [name]: { ...c[name], 好感度: next } },

    };

  });

}



export async function phoneTideManageItem(_stat: StatData, name: string) {

  const bag = ((_stat.主角信息 as Record<string, unknown>)?.物品栏 as Record<string, Record<string, unknown>>) ?? {};

  const item = bag[name];

  if (!item) return;

  const act = prompt(

    `【${name}】\n类型: ${item.类型 ?? '杂物'}\n数量: ${item.数量}\n描述: ${item.描述 ?? '无'}\n\n1. 修改\n2. 删除`,

    '',

  );

  if (act === '1') {

    const count = prompt('修改数量：', String(item.数量));

    if (count === null) return;

    const desc = prompt('修改描述：', String(item.描述 ?? ''));

    if (desc === null) return;

    await saveMvuStatPatch(stat => {

      const u = (stat.主角信息 as Record<string, unknown>) ?? {};

      const b = (u.物品栏 as Record<string, Record<string, unknown>>) ?? {};

      return {

        ...stat,

        主角信息: {

          ...u,

          物品栏: { ...b, [name]: { ...item, 数量: Number(count), 描述: desc } },

        },

      };

    });

  } else if (act === '2') {

    if (!confirm(`确定删除物品【${name}】？`)) return;

    await saveMvuStatPatch(stat => {

      const u = (stat.主角信息 as Record<string, unknown>) ?? {};

      const b = { ...((u.物品栏 as Record<string, unknown>) ?? {}) };

      delete b[name];

      return { ...stat, 主角信息: { ...u, 物品栏: b } };

    });

  }

}



export async function phoneTideAddItem(_stat: StatData) {

  const name = prompt('新物品名称：');

  if (!name) return;

  const type = prompt('物品类型：', '杂物');

  if (type === null) return;

  const count = prompt('数量：', '1');

  if (count === null) return;

  const desc = prompt('描述：');

  if (desc === null) return;

  await saveMvuStatPatch(stat => {

    const u = (stat.主角信息 as Record<string, unknown>) ?? {};

    const bag = (u.物品栏 as Record<string, unknown>) ?? {};

    return {

      ...stat,

      主角信息: {

        ...u,

        物品栏: { ...bag, [name]: { 数量: Number(count), 描述: desc, 类型: type } },

      },

    };

  });

}



export async function phoneTideAddTrigger(_stat: StatData) {

  const type = prompt('触发器类别：');

  if (!type) return;

  const desc = prompt('触发器简述：');

  if (!desc) return;

  const state = prompt('初始状态：', '待触发');

  if (!state) return;

  await saveMvuStatPatch(stat => {

    const list = [...((stat.剧情触发器 as unknown[]) ?? [])];

    list.push({ 事件类别: type, 事件简述: desc, 状态: state, 事件计时: '' });

    return { ...stat, 剧情触发器: list };

  });

}



export async function phoneTideEditTrigger(_stat: StatData, index: number) {

  const list = [...((_stat.剧情触发器 as Array<Record<string, string>>) ?? [])];

  const old = list[index];

  if (!old) return;

  const type = prompt('修改类别：', old.事件类别);

  if (type === null) return;

  const desc = prompt('修改简述：', old.事件简述);

  if (desc === null) return;

  const state = prompt('修改状态：', old.状态);

  if (state === null) return;

  const timer = prompt('修改计时：', old.事件计时 ?? '');

  if (timer === null) return;

  await saveMvuStatPatch(stat => {

    const trigs = [...((stat.剧情触发器 as Array<Record<string, string>>) ?? [])];

    trigs[index] = { 事件类别: type, 事件简述: desc, 状态: state, 事件计时: timer };

    return { ...stat, 剧情触发器: trigs };

  });

}



export async function phoneTideDeleteTrigger(_stat: StatData, index: number) {

  if (!confirm('确定删除此触发器？')) return;

  await saveMvuStatPatch(stat => {

    const list = [...((stat.剧情触发器 as unknown[]) ?? [])];

    list.splice(index, 1);

    return { ...stat, 剧情触发器: list };

  });

}



export async function phoneTideClearTriggers(_stat: StatData) {

  if (!confirm('确定清空全部触发器？')) return;

  await saveMvuStatPatch(stat => ({ ...stat, 剧情触发器: [] }));

}



export async function phoneTideAddForeshadow(_stat: StatData) {

  const content = prompt('伏笔内容：');

  if (!content) return;

  const result = prompt('预期导向：');

  if (!result) return;

  await saveMvuStatPatch(stat => {

    const list = [...((stat.伏笔 as unknown[]) ?? [])];

    list.push({ 伏笔内容: content, 指向的预期结果: result });

    return { ...stat, 伏笔: list };

  });

}



export async function phoneTideEditForeshadow(_stat: StatData, index: number) {

  const list = [...((_stat.伏笔 as Array<Record<string, string>>) ?? [])];

  const old = list[index];

  if (!old) return;

  const content = prompt('修改伏笔内容：', old.伏笔内容);

  if (content === null) return;

  const result = prompt('修改预期结果：', old.指向的预期结果);

  if (result === null) return;

  await saveMvuStatPatch(stat => {

    const fores = [...((stat.伏笔 as Array<Record<string, string>>) ?? [])];

    fores[index] = { 伏笔内容: content, 指向的预期结果: result };

    return { ...stat, 伏笔: fores };

  });

}



export async function phoneTideDeleteForeshadow(_stat: StatData, index: number) {

  if (!confirm('确定删除此伏笔？')) return;

  await saveMvuStatPatch(stat => {

    const list = [...((stat.伏笔 as unknown[]) ?? [])];

    list.splice(index, 1);

    return { ...stat, 伏笔: list };

  });

}



export async function phoneTideClearForeshadows(_stat: StatData) {

  if (!confirm('确定清空全部伏笔？')) return;

  await saveMvuStatPatch(stat => ({ ...stat, 伏笔: [] }));

}


