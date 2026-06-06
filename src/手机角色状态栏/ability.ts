
export interface Ability {
  生命: number;
  力量: number;
  体魄: number;
  智慧: number;
}

export function migrate_raw_ability(raw: Record<string, unknown>): Ability {
  const num = (v: unknown, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  return {
    生命: num(raw.生命 ?? raw.生命值, 100),
    力量: num(raw.力量 ?? raw.攻击力, 10),
    体魄: num(raw.体魄 ?? raw.防御力, 10),
    智慧: num(raw.智慧 ?? raw.敏捷, 10),
  };
}

const AbilityCoreSchema = z
  .object({
    生命: z.coerce.number().prefault(100),
    力量: z.coerce.number().prefault(10),
    体魄: z.coerce.number().prefault(10),
    智慧: z.coerce.number().prefault(10),
  })
  .transform(
    data =>
      ({
        生命: _.clamp(data.生命, 0, 9999),
        力量: _.clamp(data.力量, 0, 999),
        体魄: _.clamp(data.体魄, 0, 999),
        智慧: _.clamp(data.智慧, 0, 999),
      }) satisfies Ability,
  );

export const AbilitySchema = z.preprocess(
  raw => migrate_raw_ability((raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>),
  AbilityCoreSchema,
);
