import {
  ActionItem, Article, Budget, CapexItem, ChangeRequest, Contract, Decision, Idea, Incident, Initiative, Interaction, Kpi, Lesson, Meeting, Note, OpexItem, Project, Review, Risk, Skill, Training, Vendor
} from '../models';
import { isValidDayKey } from './dates';

/** Translation key of the error per field name (e.g. validation.titleRequired); a missing key means the field is valid. */
export type ValidationErrors = Record<string, string | undefined>;

// SharePoint's built-in Title column accepts at most 255 characters.
const MAX_TITLE_LENGTH = 255;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const hasErrors = (errors: ValidationErrors): boolean => {
  return Object.keys(errors).some(key => !!errors[key]);
};

const validateTitle = (errors: ValidationErrors, title: string): void => {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    errors.title = 'validation.titleRequired';
  } else if (trimmed.length > MAX_TITLE_LENGTH) {
    errors.title = 'validation.titleTooLong';
  }
};

const validateOwner = (errors: ValidationErrors, owner: string): void => {
  if (owner.trim().length === 0) {
    errors.ownerUpn = 'validation.ownerRequired';
  } else if (!EMAIL_PATTERN.test(owner.trim())) {
    errors.ownerUpn = 'validation.ownerInvalid';
  }
};

/** An empty date is allowed; a filled one must be a real YYYY-MM-DD day. */
const validateOptionalDate = (errors: ValidationErrors, field: string, value: string | undefined): void => {
  if (value && !isValidDayKey(value)) {
    errors[field] = 'validation.dateInvalid';
  }
};

const validateNonNegative = (errors: ValidationErrors, field: string, value: number | undefined): void => {
  if (value === undefined) {
    return;
  }

  if (!isFinite(value)) {
    errors[field] = 'validation.mustBeNumber';
  } else if (value < 0) {
    errors[field] = 'validation.cannotBeNegative';
  }
};

export const validateIdea = (idea: Idea): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, idea.title);
  validateOwner(errors, idea.ownerUpn);
  if (idea.sponsorUpn && !EMAIL_PATTERN.test(idea.sponsorUpn.trim())) {
    errors.sponsorUpn = 'validation.sponsorInvalid';
  }
  validateNonNegative(errors, 'estimatedValue', idea.estimatedValue);
  validateOptionalDate(errors, 'targetDate', idea.targetDate);
  return errors;
};

export const validateInitiative = (initiative: Initiative): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, initiative.title);
  validateOwner(errors, initiative.ownerUpn);
  if (!isFinite(initiative.progressPct) || initiative.progressPct < 0 || initiative.progressPct > 100) {
    errors.progressPct = 'validation.progressRange';
  }
  validateOptionalDate(errors, 'targetDate', initiative.targetDate);
  return errors;
};

export const validateProject = (project: Project): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, project.title);
  validateOwner(errors, project.ownerUpn);
  validateNonNegative(errors, 'budgetAmount', project.budgetAmount);
  validateNonNegative(errors, 'forecastAmount', project.forecastAmount);
  validateOptionalDate(errors, 'startDate', project.startDate);
  validateOptionalDate(errors, 'endDate', project.endDate);
  if (!errors.startDate && !errors.endDate && project.startDate && project.endDate && project.endDate < project.startDate) {
    errors.endDate = 'validation.endBeforeStart';
  }
  return errors;
};

export const validateAction = (action: ActionItem): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, action.title);
  validateOwner(errors, action.ownerUpn);
  validateOptionalDate(errors, 'dueDate', action.dueDate);
  validateOptionalDate(errors, 'completedDate', action.completedDate);
  return errors;
};

export const validateNote = (note: Note): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, note.title);
  return errors;
};

export const validateMeeting = (meeting: Meeting): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, meeting.title);
  validateOptionalDate(errors, 'meetingDate', meeting.meetingDate);
  return errors;
};

/** An email is optional here; when given it must look like one. */
const validateOptionalEmail = (errors: ValidationErrors, field: string, value: string | undefined, key: string): void => {
  if (value && value.trim().length > 0 && !EMAIL_PATTERN.test(value.trim())) {
    errors[field] = key;
  }
};

export const validateRisk = (risk: Risk): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, risk.title);
  validateOwner(errors, risk.ownerUpn);
  validateOptionalDate(errors, 'dueDate', risk.dueDate);
  return errors;
};

export const validateDecision = (decision: Decision): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, decision.title);
  validateOptionalEmail(errors, 'decidedBy', decision.decidedBy, 'validation.deciderInvalid');
  validateOptionalDate(errors, 'decisionDate', decision.decisionDate);
  return errors;
};

export const validateLesson = (lesson: Lesson): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, lesson.title);
  validateOptionalEmail(errors, 'ownerUpn', lesson.ownerUpn, 'validation.ownerInvalid');
  return errors;
};

export const validateReview = (review: Review): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, review.title);
  validateOwner(errors, review.ownerUpn);
  validateOptionalDate(errors, 'reviewDate', review.reviewDate);
  validateOptionalDate(errors, 'nextReviewDate', review.nextReviewDate);
  if (!errors.reviewDate && !errors.nextReviewDate && review.reviewDate && review.nextReviewDate && review.nextReviewDate < review.reviewDate) {
    errors.nextReviewDate = 'validation.nextBeforeReview';
  }
  return errors;
};

export const validateBudget = (budget: Budget): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, budget.title);
  validateOwner(errors, budget.ownerUpn);
  if (!isFinite(budget.fiscalYear) || Math.floor(budget.fiscalYear) !== budget.fiscalYear || budget.fiscalYear < 2000 || budget.fiscalYear > 2100) {
    errors.fiscalYear = 'validation.yearInvalid';
  }
  validateNonNegative(errors, 'plannedAmount', budget.plannedAmount);
  return errors;
};

export const validateCapex = (capex: CapexItem): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, capex.title);
  validateNonNegative(errors, 'amount', capex.amount);
  validateOptionalDate(errors, 'expenseDate', capex.expenseDate);
  validateOptionalEmail(errors, 'ownerUpn', capex.ownerUpn, 'validation.ownerInvalid');
  return errors;
};

export const validateOpex = (opex: OpexItem): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, opex.title);
  validateNonNegative(errors, 'amount', opex.amount);
  validateOptionalDate(errors, 'expenseDate', opex.expenseDate);
  validateOptionalEmail(errors, 'ownerUpn', opex.ownerUpn, 'validation.ownerInvalid');
  return errors;
};

export const validateVendor = (vendor: Vendor): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, vendor.title);
  validateOptionalEmail(errors, 'contactEmail', vendor.contactEmail, 'validation.contactInvalid');
  validateOptionalEmail(errors, 'ownerUpn', vendor.ownerUpn, 'validation.ownerInvalid');
  return errors;
};

export const validateContract = (contract: Contract): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, contract.title);
  validateOwner(errors, contract.ownerUpn);
  validateOptionalDate(errors, 'startDate', contract.startDate);
  validateOptionalDate(errors, 'endDate', contract.endDate);
  if (!errors.startDate && !errors.endDate && contract.startDate && contract.endDate && contract.endDate < contract.startDate) {
    errors.endDate = 'validation.endBeforeStart';
  }
  validateNonNegative(errors, 'annualValue', contract.annualValue);
  if (!isFinite(contract.noticeDays) || Math.floor(contract.noticeDays) !== contract.noticeDays || contract.noticeDays < 0 || contract.noticeDays > 365) {
    errors.noticeDays = 'validation.noticeDaysRange';
  }
  return errors;
};

export const validateIncident = (incident: Incident): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, incident.title);
  validateOptionalEmail(errors, 'reportedBy', incident.reportedBy, 'validation.ownerInvalid');
  validateOptionalEmail(errors, 'assignedTo', incident.assignedTo, 'validation.ownerInvalid');
  validateOptionalDate(errors, 'reportedOn', incident.reportedOn);
  validateOptionalDate(errors, 'resolvedOn', incident.resolvedOn);
  if (!errors.reportedOn && !errors.resolvedOn && incident.reportedOn && incident.resolvedOn && incident.resolvedOn < incident.reportedOn) {
    errors.resolvedOn = 'validation.resolvedBeforeReported';
  }
  return errors;
};

export const validateChange = (change: ChangeRequest): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, change.title);
  validateOwner(errors, change.ownerUpn);
  validateOptionalDate(errors, 'plannedDate', change.plannedDate);
  validateOptionalDate(errors, 'implementedDate', change.implementedDate);
  return errors;
};

export const validateInteraction = (interaction: Interaction): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, interaction.title);
  validateOptionalEmail(errors, 'contactEmail', interaction.contactEmail, 'validation.contactInvalid');
  validateOptionalEmail(errors, 'ownerUpn', interaction.ownerUpn, 'validation.ownerInvalid');
  validateOptionalDate(errors, 'interactionDate', interaction.interactionDate);
  validateOptionalDate(errors, 'followUpDate', interaction.followUpDate);
  return errors;
};

export const validateKpi = (kpi: Kpi): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, kpi.title);
  if (!isFinite(kpi.target)) {
    errors.target = 'validation.mustBeNumber';
  }
  if (!isFinite(kpi.currentValue)) {
    errors.currentValue = 'validation.mustBeNumber';
  }
  if (kpi.previousValue !== undefined && !isFinite(kpi.previousValue)) {
    errors.previousValue = 'validation.mustBeNumber';
  }
  validateOptionalDate(errors, 'measuredOn', kpi.measuredOn);
  validateOptionalEmail(errors, 'ownerUpn', kpi.ownerUpn, 'validation.ownerInvalid');
  return errors;
};

/** The person a skill or a training belongs to is required and must be an email. */
const validatePerson = (errors: ValidationErrors, person: string): void => {
  if (person.trim().length === 0) {
    errors.personUpn = 'validation.ownerRequired';
  } else if (!EMAIL_PATTERN.test(person.trim())) {
    errors.personUpn = 'validation.ownerInvalid';
  }
};

export const validateSkill = (skill: Skill): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, skill.title);
  validatePerson(errors, skill.personUpn);
  validateOptionalDate(errors, 'lastAssessed', skill.lastAssessed);
  validateOptionalDate(errors, 'certificationExpiry', skill.certificationExpiry);
  return errors;
};

export const validateTraining = (training: Training): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, training.title);
  validatePerson(errors, training.personUpn);
  validateOptionalDate(errors, 'startDate', training.startDate);
  validateOptionalDate(errors, 'dueDate', training.dueDate);
  validateOptionalDate(errors, 'completedDate', training.completedDate);
  if (!errors.startDate && !errors.dueDate && training.startDate && training.dueDate && training.dueDate < training.startDate) {
    errors.dueDate = 'validation.endBeforeStart';
  }
  validateNonNegative(errors, 'cost', training.cost);
  return errors;
};

export const validateArticle = (article: Article): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, article.title);
  validateOwner(errors, article.ownerUpn);
  validateOptionalDate(errors, 'publishedOn', article.publishedOn);
  validateOptionalDate(errors, 'reviewDate', article.reviewDate);
  return errors;
};
