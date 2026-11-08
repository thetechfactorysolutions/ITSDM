import { ActionItem, Idea, Initiative, Project } from '../models';
import { isValidDayKey } from './dates';

/** Error message per field name; a missing key means the field is valid. */
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
    errors.title = 'Title is required.';
  } else if (trimmed.length > MAX_TITLE_LENGTH) {
    errors.title = `Title cannot be longer than ${MAX_TITLE_LENGTH} characters.`;
  }
};

const validateOwner = (errors: ValidationErrors, owner: string): void => {
  if (owner.trim().length === 0) {
    errors.ownerUpn = 'Owner is required.';
  } else if (!EMAIL_PATTERN.test(owner.trim())) {
    errors.ownerUpn = 'Owner must be a valid user (email).';
  }
};

/** An empty date is allowed; a filled one must be a real YYYY-MM-DD day. */
const validateOptionalDate = (errors: ValidationErrors, field: string, value: string | undefined): void => {
  if (value && !isValidDayKey(value)) {
    errors[field] = 'Enter a valid date (YYYY-MM-DD).';
  }
};

const validateNonNegative = (errors: ValidationErrors, field: string, label: string, value: number | undefined): void => {
  if (value === undefined) {
    return;
  }

  if (!isFinite(value)) {
    errors[field] = `${label} must be a number.`;
  } else if (value < 0) {
    errors[field] = `${label} cannot be negative.`;
  }
};

export const validateIdea = (idea: Idea): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, idea.title);
  validateOwner(errors, idea.ownerUpn);
  if (idea.sponsorUpn && !EMAIL_PATTERN.test(idea.sponsorUpn.trim())) {
    errors.sponsorUpn = 'Sponsor must be a valid user (email).';
  }
  validateNonNegative(errors, 'estimatedValue', 'Estimated value', idea.estimatedValue);
  validateOptionalDate(errors, 'targetDate', idea.targetDate);
  return errors;
};

export const validateInitiative = (initiative: Initiative): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, initiative.title);
  validateOwner(errors, initiative.ownerUpn);
  if (!isFinite(initiative.progressPct) || initiative.progressPct < 0 || initiative.progressPct > 100) {
    errors.progressPct = 'Progress must be between 0 and 100.';
  }
  validateOptionalDate(errors, 'targetDate', initiative.targetDate);
  return errors;
};

export const validateProject = (project: Project): ValidationErrors => {
  const errors: ValidationErrors = {};
  validateTitle(errors, project.title);
  validateOwner(errors, project.ownerUpn);
  validateNonNegative(errors, 'budgetAmount', 'Budget', project.budgetAmount);
  validateNonNegative(errors, 'forecastAmount', 'Forecast', project.forecastAmount);
  validateOptionalDate(errors, 'startDate', project.startDate);
  validateOptionalDate(errors, 'endDate', project.endDate);
  if (!errors.startDate && !errors.endDate && project.startDate && project.endDate && project.endDate < project.startDate) {
    errors.endDate = 'End date cannot be before the start date.';
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
