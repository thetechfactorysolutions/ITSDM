export enum SkillCategory {
  TECHNICAL = 'TECHNICAL',
  PROCESS = 'PROCESS',
  TOOLING = 'TOOLING',
  SOFT = 'SOFT',
  OTHER = 'OTHER'
}

/** From a first grasp to being the person others ask. The order matters: it is what the gap is measured in. */
export enum SkillLevel {
  BASIC = 'BASIC',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT'
}

export enum SkillStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED'
}

/** One person's level in one skill. */
export interface Skill {
  id?: number;
  skillId: string;
  /** The name of the skill. */
  title: string;
  personUpn: string;
  category: SkillCategory;
  level: SkillLevel;
  /** The level the person is expected to reach. */
  targetLevel: SkillLevel;
  status: SkillStatus;
  lastAssessed?: string;
  certification: string;
  certificationExpiry?: string;
  notes: string;
  created?: string;
  modified?: string;
  editor?: string;
}
