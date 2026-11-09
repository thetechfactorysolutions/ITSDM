import { IProjectTemplate } from '../config/projectTemplates';
import { ActionItem, ActionStatus, Project, ProjectRiskLevel, ProjectStatus } from '../models';
import { addDays, isValidDayKey, toDayKey } from './dates';
import { generateBusinessId } from './ids';

export interface IPlanOptions {
  title: string;
  ownerUpn: string;
  /** First day of the project, YYYY-MM-DD. Today when empty or invalid. */
  startDay: string;
  /** Looks up a translated text by key. */
  translate: (key: string) => string;
  now?: Date;
}

export interface IProjectPlan {
  project: Project;
  actions: ActionItem[];
}

/**
 * The project and the actions a template creates: the project in Planning with its dates, and
 * one open action per task, due the task's offset after the start and linked to the project.
 * Pure: nothing is saved here.
 */
export const planFromTemplate = (template: IProjectTemplate, options: IPlanOptions): IProjectPlan => {
  const now = options.now ?? new Date();
  const start = isValidDayKey(options.startDay) ? options.startDay : toDayKey(now);
  const projectId = generateBusinessId('PROJ', now);

  const project: Project = {
    projectId,
    initiativeId: '',
    title: options.title.trim(),
    description: options.translate(`template.${template.id}.description`),
    status: ProjectStatus.PLANNING,
    ownerUpn: options.ownerUpn,
    startDate: start,
    endDate: addDays(start, template.durationDays),
    budgetAmount: 0,
    forecastAmount: 0,
    riskLevel: ProjectRiskLevel.LOW
  };

  const actions: ActionItem[] = template.tasks.map(task => ({
    actionId: generateBusinessId('ACT', now),
    projectId,
    initiativeId: '',
    title: options.translate(`template.${template.id}.task.${task.key}`),
    description: '',
    status: ActionStatus.OPEN,
    priority: task.priority,
    ownerUpn: options.ownerUpn,
    dueDate: addDays(start, task.dayOffset)
  }));

  return { project, actions };
};
