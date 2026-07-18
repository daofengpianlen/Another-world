import { isWuwaStoryPlaceholder } from '../tideMvuReader';
import { coerceStatArray } from '../statDataDefaults';

type StatData = Record<string, unknown>;

function esc(text: unknown): string {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safe(text: unknown, fallback = '--'): string {
  if (text === undefined || text === null || text === '') return fallback;
  const value = String(text);
  if (isWuwaStoryPlaceholder(value)) return fallback;
  return value;
}

function statRow(label: string, value: string, action: string, extra = ''): string {
  const clickable = action !== 'noop';
  return `
    <div class="phone-stat-row${clickable ? '' : ' is-readonly'}"${clickable ? ` data-tide-action="${action}"` : ''}${extra}>
      <span class="phone-stat-label">${esc(label)}</span>
      <span class="phone-stat-value">${value}</span>
      ${clickable ? '<i class="fas fa-chevron-right phone-stat-arrow"></i>' : ''}
    </div>`;
}

function section(title: string, body: string, actions = ''): string {
  return `
    <section class="phone-stat-section">
      <div class="phone-stat-section-head">
        <span class="phone-stat-section-title">${esc(title)}</span>
        ${actions}
      </div>
      <div class="phone-stat-section-body">${body}</div>
    </section>`;
}

function chip(text: string, action: string, extra = '', muted = false): string {
  return `<button type="button" class="phone-stat-chip${muted ? ' is-muted' : ''}" data-tide-action="${action}"${extra}>${text}</button>`;
}

export function generatePhoneTideStatusPanel(stat: StatData): string {
  const user = (stat.主角信息 as Record<string, unknown>) ?? {};
  const bag = (user.物品栏 as Record<string, Record<string, unknown>>) ?? {};
  const chars = (stat.女性角色 as Record<string, Record<string, unknown>>) ?? {};
  const npc = (stat.NPC漂泊者 as Record<string, unknown>) ?? {};
  const u_sex = (user.性爱状态 as Record<string, unknown>) ?? {};

  const is_sex = String(u_sex.是否正在性爱) === 'true';
  const is_rover = String(user.是否是漂泊者) === 'true' ? '是' : '否';
  const npc_str = String(npc.是否存在) === 'true' ? `存在 (${safe(npc.性别)})` : '无';

  const sex_alerts: string[] = [];
  if (is_sex) {
    sex_alerts.push(`{{user}} · 高潮 ${safe(u_sex.高潮计数, '0')}/${safe(u_sex._高潮次数上限, '5')} · ${safe(u_sex.高潮进度, '0')}%`);
  }
  Object.keys(chars).forEach(name => {
    const c_sex = (chars[name]?.性爱状态 as Record<string, unknown>) ?? {};
    if (String(c_sex.是否正在性爱) === 'true') {
      sex_alerts.push(`${name} · 高潮 ${safe(c_sex.高潮计数, '0')}/${safe(c_sex._高潮次数上限, '5')} · ${safe(c_sex.高潮进度, '0')}%`);
    }
  });

  const hero = `
    <div class="phone-stat-hero">
      <div class="phone-stat-hero-loc"><i class="fas fa-map-marker-alt"></i> ${esc(safe(stat.所在地点, '未知区域'))}</div>
      <div class="phone-stat-hero-time"><i class="far fa-clock"></i> ${esc(safe(stat.当前时间))}</div>
    </div>`;

  const sex_block =
    sex_alerts.length > 0
      ? `<div class="phone-stat-alert">${sex_alerts.map(line => `<div>${esc(line)}</div>`).join('')}</div>`
      : '';

  const profile = [
    statRow('主角性别', esc(safe(user.性别, '男')), 'edit-user-gender'),
    statRow('是否漂泊者', esc(is_rover), 'edit-user-rover'),
    statRow('身份设定', esc(safe(user.身份与额外设定)), 'edit-user-field', ' data-field="身份与额外设定"'),
    statRow('当前状态', esc(safe(user.当前状态)), 'edit-user-field', ' data-field="当前状态"'),
    statRow('性爱状态', is_sex ? '🔞 性爱中' : '✅ 正常', 'toggle-user-sex'),
    statRow('当前穿着', esc(safe(user.当前穿着)), 'edit-user-field', ' data-field="当前穿着"'),
    statRow('NPC 漂泊者', esc(npc_str), 'edit-npc-rover'),
  ].join('');

  const overview = [
    statRow('剧情版本', `<strong>${esc(safe(stat.剧情显示))}</strong>`, 'noop'),
    statRow('后日谈', String(stat.是否为后日谈) === 'true' ? '是' : '否', 'noop'),
    statRow('长期目标', esc(safe(stat.当前长期目标)), 'edit-goal'),
    statRow('当前事件', esc(safe(stat.当前演绎事件)), 'edit-story-var', ' data-key="当前演绎事件" data-label="当前事件"'),
    statRow('当前节点', esc(safe(stat.当前演绎事件节点)), 'edit-story-var', ' data-key="当前演绎事件节点" data-label="当前节点"'),
  ].join('');

  const bag_keys = Object.keys(bag);
  const bag_html =
    bag_keys.length > 0
      ? bag_keys
          .map(k => chip(`${esc(k)} ×${esc(bag[k]?.数量 ?? 1)}`, 'manage-item', ` data-item="${esc(k)}"`))
          .join('')
      : '<span class="phone-stat-empty-inline">暂无物品</span>';
  const bag_section = section(
    '物品栏',
    `<div class="phone-stat-chips">${bag_html}${chip('<i class="fas fa-plus"></i> 添加', 'add-item')}</div>`,
  );

  const char_keys = Object.keys(chars).sort((a, b) => {
    const ah = String(chars[a]?.是否在场) === 'true';
    const bh = String(chars[b]?.是否在场) === 'true';
    if (ah === bh) return 0;
    return ah ? -1 : 1;
  });
  const rel_html =
    char_keys.length > 0
      ? char_keys
          .map(n => {
            const here = String(chars[n]?.是否在场) === 'true';
            const aff = chars[n]?.好感度 ?? 0;
            return chip(
              `${esc(n)} <span class="phone-affection-heart">❤</span>${esc(String(aff))}`,
              'edit-affection',
              ` data-char="${esc(n)}"`,
              !here,
            );
          })
          .join('')
      : '<span class="phone-stat-empty-inline">暂无角色</span>';

  return `
    <div class="phone-tide-panel phone-tide-panel--status">
      ${hero}
      ${sex_block}
      ${section('主角档案', profile)}
      ${section('剧情概览', overview)}
      ${bag_section}
      ${section('人际关系', `<div class="phone-stat-chips">${rel_html}</div>`)}
      <p class="phone-stat-hint">点击带箭头的条目可编辑变量</p>
    </div>`;
}

export function generatePhoneTideStoryPanel(stat: StatData): string {
  const trigs = coerceStatArray(stat.剧情触发器) as Array<Record<string, string>>;
  const fores = coerceStatArray(stat.伏笔) as Array<Record<string, string>>;

  const nav = [
    statRow('剧情版本', `<strong>${esc(safe(stat.剧情显示))}</strong>`, 'noop'),
    statRow('后日谈', String(stat.是否为后日谈) === 'true' ? '是' : '否', 'noop'),
    statRow('长期目标', esc(safe(stat.当前长期目标)), 'edit-goal'),
    statRow('当前事件', esc(safe(stat.当前演绎事件)), 'edit-story-var', ' data-key="当前演绎事件" data-label="当前事件"'),
    statRow('当前节点', esc(safe(stat.当前演绎事件节点)), 'edit-story-var', ' data-key="当前演绎事件节点" data-label="当前节点"'),
    statRow('下一节点', esc(safe(stat.即将进行的下一个事件节点)), 'edit-story-var', ' data-key="即将进行的下一个事件节点" data-label="下一节点"'),
    statRow('上一事件', esc(safe(stat.已完成的上一个事件)), 'edit-story-var', ' data-key="已完成的上一个事件" data-label="上一事件"'),
    statRow('上一节点', esc(safe(stat.已完成的上一个事件节点)), 'edit-story-var', ' data-key="已完成的上一个事件节点" data-label="上一节点"'),
    statRow('终止条件', esc(safe(stat.章节终止条件)), 'edit-story-var', ' data-key="章节终止条件" data-label="章节终止条件"'),
  ].join('');

  const trig_html =
    trigs.length > 0
      ? trigs
          .map((t, i) => {
            const active = ['进行中', '正常计时', '待触发'].includes(t.状态 ?? '');
            return `
              <div class="list-item phone-tide-card${active ? ' is-active' : ''}">
                <div class="list-item-header">
                  <span class="phone-tide-badge">${esc(t.事件类别 ?? '事件')}</span>
                  <span class="list-item-value" style="color:${active ? '#0891b2' : '#9ca3af'}">${esc(t.状态 ?? '')}</span>
                </div>
                <div class="list-item-desc">${esc(t.事件简述 ?? '暂无描述')}</div>
                ${t.事件计时 ? `<div class="phone-tide-timer">${esc(t.事件计时)}</div>` : ''}
                <div class="phone-tide-card-actions">
                  <button type="button" class="phone-tide-btn" data-tide-action="edit-trigger" data-index="${i}"><i class="fas fa-pen"></i></button>
                  <button type="button" class="phone-tide-btn phone-tide-btn--danger" data-tide-action="delete-trigger" data-index="${i}"><i class="fas fa-trash"></i></button>
                </div>
              </div>`;
          })
          .join('')
      : '<div class="empty-message" style="padding:24px 12px">暂无触发器</div>';

  const fore_html =
    fores.length > 0
      ? fores
          .map((f, i) => `
              <div class="list-item phone-tide-card">
                <div class="list-item-desc">${esc(f.伏笔内容 ?? '')}</div>
                <div class="phone-tide-fore-result">→ ${esc(f.指向的预期结果 ?? '')}</div>
                <div class="phone-tide-card-actions">
                  <button type="button" class="phone-tide-btn" data-tide-action="edit-foreshadow" data-index="${i}"><i class="fas fa-pen"></i></button>
                  <button type="button" class="phone-tide-btn phone-tide-btn--danger" data-tide-action="delete-foreshadow" data-index="${i}"><i class="fas fa-trash"></i></button>
                </div>
              </div>`)
          .join('')
      : '<div class="empty-message" style="padding:24px 12px">暂无伏笔</div>';

  const trig_actions = `
    <div class="phone-stat-section-actions">
      <button type="button" class="phone-tide-link-btn" data-tide-action="add-trigger">添加</button>
      <button type="button" class="phone-tide-link-btn phone-tide-link-btn--muted" data-tide-action="clear-triggers">清空</button>
    </div>`;
  const fore_actions = `
    <div class="phone-stat-section-actions">
      <button type="button" class="phone-tide-link-btn" data-tide-action="add-foreshadow">添加</button>
      <button type="button" class="phone-tide-link-btn phone-tide-link-btn--muted" data-tide-action="clear-foreshadows">清空</button>
    </div>`;

  return `
    <div class="phone-tide-panel phone-tide-panel--story">
      ${section('命途航标', nav)}
      ${section('剧情触发器', trig_html, trig_actions)}
      ${section('暗线伏笔', fore_html, fore_actions)}
      <p class="phone-stat-hint">与浪潮状态栏剧情页数据同步，修改会写入 MVU</p>
    </div>`;
}
