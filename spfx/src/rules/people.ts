import { AppConfig } from '../config/AppConfig';
import { Article, ArticleStatus, Skill, SkillLevel, SkillStatus, Training, TrainingStatus } from '../models';
import { addDays, dayKeyFromValue, toDayKey } from './dates';
import { daysBetween } from './finance';

/** Rules for skills, training and the knowledge base. Pure, so they are tested without a screen. */

// ---------------------------------------------------------------- skills

/** The levels in order, from the lowest to the highest. */
export const SKILL_LEVELS: SkillLevel[] = [SkillLevel.BASIC, SkillLevel.INTERMEDIATE, SkillLevel.ADVANCED, SkillLevel.EXPERT];

/** 1 for Basic up to 4 for Expert. */
export const skillLevelValue = (level: SkillLevel): number => SKILL_LEVELS.indexOf(level) + 1;

/** How many levels short of the desired one the person is; zero when they have reached it or passed it. */
export const skillGap = (skill: Pick<Skill, 'level' | 'targetLevel'>): number => Math.max(0, skillLevelValue(skill.targetLevel) - skillLevelValue(skill.level));

export const isActiveSkill = (skill: Pick<Skill, 'status'>): boolean => skill.status === SkillStatus.ACTIVE;

/** An active skill with a gap. Archived records are history and do not count. */
export const hasSkillGap = (skill: Skill): boolean => isActiveSkill(skill) && skillGap(skill) > 0;

export type CertificationAlert = 'NONE' | 'EXPIRING' | 'EXPIRED';

export interface ICertificationInfo {
  alert: CertificationAlert;
  /** Days until it expires; negative once it has. Undefined without an expiry date. */
  daysLeft: number | undefined;
}

/**
 * EXPIRED when the expiry date has passed; EXPIRING when it falls within the warning period
 * (60 days by default). Only active skills with a certification and a date are checked. The expiry
 * day itself still counts as valid.
 */
export const certificationAlert = (
  skill: Skill, now: Date = new Date(), warningDays: number = AppConfig.people.certificationWarningDays
): ICertificationInfo => {
  const expiry = dayKeyFromValue(skill.certificationExpiry);
  if (!expiry || !skill.certification.trim() || !isActiveSkill(skill)) {
    return { alert: 'NONE', daysLeft: expiry ? daysBetween(toDayKey(now), expiry) : undefined };
  }

  const daysLeft = daysBetween(toDayKey(now), expiry);
  return { alert: daysLeft < 0 ? 'EXPIRED' : daysLeft <= warningDays ? 'EXPIRING' : 'NONE', daysLeft };
};

export const needsCertificationAttention = (skill: Skill, now: Date = new Date()): boolean => certificationAlert(skill, now).alert !== 'NONE';

// ---------------------------------------------------------------- training

const isFinished = (status: TrainingStatus): boolean => status === TrainingStatus.COMPLETED || status === TrainingStatus.CANCELLED;

/** Late: not finished and its planned end date has passed (the end day itself is still in time). */
export const isTrainingOverdue = (training: Training, now: Date = new Date()): boolean => {
  const due = dayKeyFromValue(training.dueDate);
  return !isFinished(training.status) && !!due && due < toDayKey(now);
};

/** The completion date (today) is filled in when a training is completed, and cleared when it is reopened. */
export const applyTrainingEffects = (training: Training, previousStatus: TrainingStatus | undefined, now: Date = new Date()): Training => {
  if (training.status === TrainingStatus.COMPLETED && previousStatus !== TrainingStatus.COMPLETED && !training.completedDate) {
    return { ...training, completedDate: toDayKey(now) };
  }
  if (training.status !== TrainingStatus.COMPLETED && previousStatus === TrainingStatus.COMPLETED) {
    return { ...training, completedDate: '' };
  }
  return training;
};

// ---------------------------------------------------------------- knowledge base

/** Published, and the date to check it again has passed. */
export const isReviewDue = (article: Article, now: Date = new Date()): boolean => {
  const review = dayKeyFromValue(article.reviewDate);
  return article.status === ArticleStatus.PUBLISHED && !!review && review < toDayKey(now);
};

/**
 * When an article becomes PUBLISHED, the publication date (today) and the next review (today plus
 * the review interval, 180 days by default) are filled in if empty. Returns the same object when
 * nothing had to change.
 */
export const applyArticleEffects = (
  article: Article, previousStatus: ArticleStatus | undefined, now: Date = new Date(), reviewDays: number = AppConfig.knowledge.reviewDays
): Article => {
  if (article.status !== ArticleStatus.PUBLISHED || previousStatus === ArticleStatus.PUBLISHED) {
    return article;
  }

  const today = toDayKey(now);
  const publishedOn = article.publishedOn || today;
  const reviewDate = article.reviewDate || addDays(today, reviewDays);
  return publishedOn === article.publishedOn && reviewDate === article.reviewDate ? article : { ...article, publishedOn, reviewDate };
};

// ---------------------------------------------------------------- status changes

const SKILL_TRANSITIONS: Record<SkillStatus, SkillStatus[]> = {
  [SkillStatus.ACTIVE]: [SkillStatus.ARCHIVED],
  [SkillStatus.ARCHIVED]: [SkillStatus.ACTIVE]
};

const TRAINING_TRANSITIONS: Record<TrainingStatus, TrainingStatus[]> = {
  [TrainingStatus.PLANNED]: [TrainingStatus.IN_PROGRESS, TrainingStatus.COMPLETED, TrainingStatus.CANCELLED],
  [TrainingStatus.IN_PROGRESS]: [TrainingStatus.PLANNED, TrainingStatus.COMPLETED, TrainingStatus.CANCELLED],
  [TrainingStatus.COMPLETED]: [TrainingStatus.IN_PROGRESS],
  [TrainingStatus.CANCELLED]: [TrainingStatus.PLANNED]
};

const ARTICLE_TRANSITIONS: Record<ArticleStatus, ArticleStatus[]> = {
  [ArticleStatus.DRAFT]: [ArticleStatus.IN_REVIEW, ArticleStatus.PUBLISHED],
  [ArticleStatus.IN_REVIEW]: [ArticleStatus.DRAFT, ArticleStatus.PUBLISHED],
  [ArticleStatus.PUBLISHED]: [ArticleStatus.IN_REVIEW, ArticleStatus.ARCHIVED],
  [ArticleStatus.ARCHIVED]: [ArticleStatus.DRAFT]
};

/** The current status plus every status it may move to. */
export const getAllowedSkillStatuses = (current: SkillStatus): SkillStatus[] => [current].concat(SKILL_TRANSITIONS[current]);
export const getAllowedTrainingStatuses = (current: TrainingStatus): TrainingStatus[] => [current].concat(TRAINING_TRANSITIONS[current]);
export const getAllowedArticleStatuses = (current: ArticleStatus): ArticleStatus[] => [current].concat(ARTICLE_TRANSITIONS[current]);
