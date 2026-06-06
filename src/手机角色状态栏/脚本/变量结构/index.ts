import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
import { Schema } from '../../schema';

$(() => {
  registerMvuSchema(Schema);
  console.info('[手机角色状态栏] MVU zod schema 已注册');
});
