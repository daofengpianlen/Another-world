import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
import { Schema } from '../../schema';

$(() => {
  registerMvuSchema(Schema);
  console.info('[鸣潮] MVU zod schema 已注册（女性角色 / 主角信息 / 剧情触发器等）');
});
