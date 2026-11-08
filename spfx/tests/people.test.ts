import assert from 'node:assert/strict';
import {
  Article, ArticleCategory, ArticleStatus, Skill, SkillCategory, SkillLevel, SkillStatus, Training, TrainingStatus, TrainingType
} from '../src/models';
import { evaluateChange } from '../src/rules/approvals';
import {
  applyArticleEffects, applyTrainingEffects, certificationAlert, getAllowedArticleStatuses, getAllowedSkillStatuses, getAllowedTrainingStatuses,
  hasSkillGap, isReviewDue, isTrainingOverdue, skillGap, skillLevelValue
} from '../src/rules/people';
import { isClosedStatus } from '../src/rules/transitions';
import { hasErrors, validateArticle, validateSkill, validateTraining } from '../src/rules/validation';

const day = (y: number, m: number, d: number, h: number = 12): Date => new Date(y, m - 1, d, h);

const skill = (o: Partial<Skill> = {}): Skill => ({
  skillId: 'S-1', title: 'Azure', personUpn: 'a@b.com', category: SkillCategory.TECHNICAL, level: SkillLevel.INTERMEDIATE, targetLevel: SkillLevel.ADVANCED,
  status: SkillStatus.ACTIVE, certification: '', notes: '', ...o
});
const training = (o: Partial<Training> = {}): Training => ({
  trainingId: 'T-1', title: 'Course', status: TrainingStatus.PLANNED, type: TrainingType.COURSE, personUpn: 'a@b.com', provider: '', cost: 0, notes: '', ...o
});
const article = (o: Partial<Article> = {}): Article => ({
  articleId: 'A-1', title: 'How to', summary: '', body: '', category: ArticleCategory.HOW_TO, status: ArticleStatus.DRAFT, ownerUpn: 'a@b.com', tags: '', ...o
});

// ---------------------------------------------------------------- skills
const testSkillGap = (): void => {
  assert.equal(skillLevelValue(SkillLevel.BASIC), 1);
  assert.equal(skillLevelValue(SkillLevel.EXPERT), 4);
  assert.equal(skillGap(skill()), 1, 'intermediate to advanced');
  assert.equal(skillGap(skill({ level: SkillLevel.BASIC, targetLevel: SkillLevel.EXPERT })), 3);
  assert.equal(skillGap(skill({ level: SkillLevel.EXPERT, targetLevel: SkillLevel.BASIC })), 0, 'above target is no gap');
  assert.equal(skillGap(skill({ level: SkillLevel.ADVANCED })), 0, 'on target');
  assert.equal(hasSkillGap(skill()), true);
  assert.equal(hasSkillGap(skill({ status: SkillStatus.ARCHIVED })), false, 'archived does not count');
  assert.equal(hasSkillGap(skill({ level: SkillLevel.ADVANCED })), false);
};

const testCertification = (): void => {
  const now = day(2026, 11, 8);
  const cert = (expiry: string | undefined, o: Partial<Skill> = {}): Skill => skill({ certification: 'AZ-104', certificationExpiry: expiry, ...o });
  assert.equal(certificationAlert(cert('2026-11-07'), now).alert, 'EXPIRED');
  assert.equal(certificationAlert(cert('2026-11-07'), now).daysLeft, -1);
  assert.equal(certificationAlert(cert('2026-11-08'), now).alert, 'EXPIRING', 'expiry day is still valid but about to end');
  assert.equal(certificationAlert(cert('2026-11-08'), now).daysLeft, 0);
  assert.equal(certificationAlert(cert('2027-01-07'), now).alert, 'EXPIRING', '60 days left is inside the warning period');
  assert.equal(certificationAlert(cert('2027-01-08'), now).alert, 'NONE', '61 days left is outside it');
  assert.equal(certificationAlert(cert('2027-01-08'), now, 90).alert, 'EXPIRING', 'custom warning period');
  assert.equal(certificationAlert(cert(undefined), now).alert, 'NONE', 'no date');
  assert.equal(certificationAlert(cert(undefined), now).daysLeft, undefined);
  assert.equal(certificationAlert(cert('2026-01-01', { certification: '  ' }), now).alert, 'NONE', 'no certification name');
  assert.equal(certificationAlert(cert('2026-01-01', { status: SkillStatus.ARCHIVED }), now).alert, 'NONE', 'archived is history');
  assert.equal(certificationAlert(cert('2026-12-31'), day(2026, 11, 8, 23)).daysLeft, 53, 'late in the day does not shift it');
};

// ---------------------------------------------------------------- training
const testTraining = (): void => {
  const now = day(2026, 11, 8);
  assert.equal(isTrainingOverdue(training({ dueDate: '2026-11-07' }), now), true);
  assert.equal(isTrainingOverdue(training({ dueDate: '2026-11-08' }), now), false, 'due today is still in time');
  assert.equal(isTrainingOverdue(training({ dueDate: '2026-11-07', status: TrainingStatus.IN_PROGRESS }), now), true);
  assert.equal(isTrainingOverdue(training({ dueDate: '2026-11-07', status: TrainingStatus.COMPLETED }), now), false);
  assert.equal(isTrainingOverdue(training({ dueDate: '2026-11-07', status: TrainingStatus.CANCELLED }), now), false);
  assert.equal(isTrainingOverdue(training(), now), false, 'no due date');

  const done = applyTrainingEffects(training({ status: TrainingStatus.COMPLETED }), TrainingStatus.IN_PROGRESS, now);
  assert.equal(done.completedDate, '2026-11-08', 'completion date is filled in');
  const keep = applyTrainingEffects(training({ status: TrainingStatus.COMPLETED, completedDate: '2026-10-01' }), TrainingStatus.IN_PROGRESS, now);
  assert.equal(keep.completedDate, '2026-10-01', 'an entered date is kept');
  const reopened = applyTrainingEffects(training({ status: TrainingStatus.IN_PROGRESS, completedDate: '2026-10-01' }), TrainingStatus.COMPLETED, now);
  assert.equal(reopened.completedDate, '', 'reopening clears it');
  const same = training({ status: TrainingStatus.PLANNED });
  assert.equal(applyTrainingEffects(same, TrainingStatus.PLANNED, now), same, 'nothing to change returns the same object');
  assert.equal(applyTrainingEffects(training({ status: TrainingStatus.COMPLETED }), undefined, now).completedDate, '2026-11-08', 'a new item created as completed');
};

// ---------------------------------------------------------------- knowledge
const testArticles = (): void => {
  const now = day(2026, 11, 8);
  assert.equal(isReviewDue(article({ status: ArticleStatus.PUBLISHED, reviewDate: '2026-11-07' }), now), true);
  assert.equal(isReviewDue(article({ status: ArticleStatus.PUBLISHED, reviewDate: '2026-11-08' }), now), false, 'review day itself is in time');
  assert.equal(isReviewDue(article({ status: ArticleStatus.DRAFT, reviewDate: '2020-01-01' }), now), false, 'only published articles');
  assert.equal(isReviewDue(article({ status: ArticleStatus.PUBLISHED }), now), false, 'no review date');

  const published = applyArticleEffects(article({ status: ArticleStatus.PUBLISHED }), ArticleStatus.IN_REVIEW, now);
  assert.equal(published.publishedOn, '2026-11-08');
  assert.equal(published.reviewDate, '2027-05-07', 'today + 180 days');
  const custom = applyArticleEffects(article({ status: ArticleStatus.PUBLISHED }), ArticleStatus.DRAFT, now, 30);
  assert.equal(custom.reviewDate, '2026-12-08');
  const kept = applyArticleEffects(article({ status: ArticleStatus.PUBLISHED, publishedOn: '2026-01-01', reviewDate: '2026-07-01' }), ArticleStatus.DRAFT, now);
  assert.equal(kept.publishedOn, '2026-01-01', 'entered dates are kept');
  assert.equal(kept.reviewDate, '2026-07-01');
  const already = article({ status: ArticleStatus.PUBLISHED });
  assert.equal(applyArticleEffects(already, ArticleStatus.PUBLISHED, now), already, 'editing a published article changes nothing');
  const draft = article();
  assert.equal(applyArticleEffects(draft, undefined, now), draft);
  assert.equal(applyArticleEffects(article({ status: ArticleStatus.PUBLISHED }), undefined, now).publishedOn, '2026-11-08', 'a new item created as published');
};

const testPolicyApproval = (): void => {
  const policy = article({ category: ArticleCategory.POLICY, status: ArticleStatus.IN_REVIEW });
  const publishPolicy = { ...policy, status: ArticleStatus.PUBLISHED };
  assert.equal(evaluateChange('articles', policy, publishPolicy).required.length, 1, 'publishing a policy needs approval');
  assert.equal(evaluateChange('articles', policy, publishPolicy).blockedBy.length, 1);
  assert.equal(evaluateChange('articles', undefined, publishPolicy).needsExistingItem, true, 'a new policy cannot be created published');
  assert.equal(evaluateChange('articles', policy, { ...policy, title: 'Edited' }).required.length, 0, 'editing needs nothing');
  const howTo = article({ status: ArticleStatus.IN_REVIEW });
  assert.equal(evaluateChange('articles', howTo, { ...howTo, status: ArticleStatus.PUBLISHED }).required.length, 0, 'other categories are free');
  const live = article({ category: ArticleCategory.POLICY, status: ArticleStatus.PUBLISHED });
  assert.equal(evaluateChange('articles', live, { ...live, summary: 'x' }).required.length, 0, 'already published');
  assert.equal(evaluateChange('articles', live, { ...live, status: ArticleStatus.ARCHIVED }).required.length, 0, 'retiring needs nothing');
};

// ---------------------------------------------------------------- transitions
const testTransitions = (): void => {
  assert.deepEqual(getAllowedSkillStatuses(SkillStatus.ACTIVE), [SkillStatus.ACTIVE, SkillStatus.ARCHIVED]);
  assert.deepEqual(getAllowedSkillStatuses(SkillStatus.ARCHIVED), [SkillStatus.ARCHIVED, SkillStatus.ACTIVE]);
  assert.ok(getAllowedTrainingStatuses(TrainingStatus.PLANNED).indexOf(TrainingStatus.COMPLETED) >= 0, 'planned can complete directly');
  assert.ok(getAllowedTrainingStatuses(TrainingStatus.COMPLETED).indexOf(TrainingStatus.IN_PROGRESS) >= 0, 'completed can be reopened');
  assert.equal(getAllowedTrainingStatuses(TrainingStatus.COMPLETED).indexOf(TrainingStatus.CANCELLED), -1);
  assert.equal(getAllowedArticleStatuses(ArticleStatus.DRAFT)[0], ArticleStatus.DRAFT, 'current status first');
  assert.ok(getAllowedArticleStatuses(ArticleStatus.PUBLISHED).indexOf(ArticleStatus.DRAFT) < 0, 'a published article goes through review again');
  assert.ok(getAllowedArticleStatuses(ArticleStatus.ARCHIVED).indexOf(ArticleStatus.DRAFT) >= 0, 'archived can be recovered as draft');

  // Archived items hide behind "show closed"; published articles and active skills stay visible.
  assert.equal(isClosedStatus(ArticleStatus.ARCHIVED), true);
  assert.equal(isClosedStatus(SkillStatus.ARCHIVED), true);
  assert.equal(isClosedStatus(TrainingStatus.COMPLETED), true);
  assert.equal(isClosedStatus(TrainingStatus.CANCELLED), true);
  assert.equal(isClosedStatus(ArticleStatus.PUBLISHED), false);
  assert.equal(isClosedStatus(SkillStatus.ACTIVE), false);
  assert.equal(isClosedStatus(ArticleStatus.IN_REVIEW), false);
};

// ---------------------------------------------------------------- validation
const testValidation = (): void => {
  assert.equal(hasErrors(validateSkill(skill())), false);
  assert.equal(validateSkill(skill({ title: ' ' })).title, 'validation.titleRequired');
  assert.equal(validateSkill(skill({ personUpn: '' })).personUpn, 'validation.ownerRequired');
  assert.equal(validateSkill(skill({ personUpn: 'nope' })).personUpn, 'validation.ownerInvalid');
  assert.equal(validateSkill(skill({ certificationExpiry: '2026-13-40' })).certificationExpiry, 'validation.dateInvalid');
  assert.equal(validateSkill(skill({ lastAssessed: 'x' })).lastAssessed, 'validation.dateInvalid');

  assert.equal(hasErrors(validateTraining(training())), false);
  assert.equal(validateTraining(training({ personUpn: '' })).personUpn, 'validation.ownerRequired');
  assert.equal(validateTraining(training({ startDate: '2026-11-10', dueDate: '2026-11-09' })).dueDate, 'validation.endBeforeStart');
  assert.equal(hasErrors(validateTraining(training({ startDate: '2026-11-10', dueDate: '2026-11-10' }))), false, 'same day is fine');
  assert.equal(validateTraining(training({ cost: -1 })).cost, 'validation.cannotBeNegative');
  assert.equal(validateTraining(training({ cost: NaN })).cost, 'validation.mustBeNumber');

  assert.equal(hasErrors(validateArticle(article())), false);
  assert.equal(validateArticle(article({ title: '' })).title, 'validation.titleRequired');
  assert.equal(validateArticle(article({ ownerUpn: '' })).ownerUpn, 'validation.ownerRequired');
  assert.equal(validateArticle(article({ reviewDate: '2026-02-30' })).reviewDate, 'validation.dateInvalid');
};

testSkillGap();
testCertification();
testTraining();
testArticles();
testPolicyApproval();
testTransitions();
testValidation();
console.log('people tests passed');
