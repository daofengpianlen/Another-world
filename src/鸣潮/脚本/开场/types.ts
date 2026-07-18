export type Gender = '男' | '女' | '未知';

export type StoryStage = '发生前' | '进行中' | '后日谈';

export type StoryVersion = {
  version: string;
  parts: string[];
};

export type OpeningFormState = {
  isRover: boolean;
  myGender: Gender;
  npcExists: boolean;
  npcGender: Exclude<Gender, '未知'>;
  isStoryMode: boolean;
  storyVer: string;
  storyStage: StoryStage;
  customIdentity: string;
  aiRefine: boolean;
  locationMain: string;
  locationDetail: string;
  targetChar: string;
  plotExtra: string;
};

export type StartConfig = {
  majorVerIdx: number;
  partIdx: number;
  isPostScript: boolean;
  anchorVerStr: string;
  isRover: boolean;
  myGender: Gender;
  identity: string;
  npcExists: boolean;
  npcGender: Exclude<Gender, '未知'>;
};

export type OpeningEnvironment = {
  ready: boolean;
  errors: string[];
  warnings: string[];
  storyMap: StoryVersion[] | null;
  targetBookName: string | null;
  initEntryUid: number | null;
  openingEntryUid: number | null;
  openingContent: string;
};
