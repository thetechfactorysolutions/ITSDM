import { ActionPriority } from '../models';

/**
 * Ready-made projects: the actions that usually follow, with the day each is due counted from the
 * project start. Texts are translated: `template.<id>.name`, `template.<id>.description` and
 * `template.<id>.task.<key>`. To add a template, add it here and its texts in the i18n files.
 */
export interface IProjectTemplateTask {
  key: string;
  /** Days after the start date. */
  dayOffset: number;
  priority: ActionPriority;
}

export interface IProjectTemplate {
  id: string;
  /** Days from the start to the planned end of the project. */
  durationDays: number;
  tasks: IProjectTemplateTask[];
}

const task = (key: string, dayOffset: number, priority: ActionPriority = ActionPriority.MEDIUM): IProjectTemplateTask => ({ key, dayOffset, priority });

export const PROJECT_TEMPLATES: IProjectTemplate[] = [
  {
    id: 'helpdesk',
    durationDays: 130,
    tasks: [
      task('vision', 0, ActionPriority.HIGH), task('visit', 10), task('survey', 14), task('layout', 30), task('booking', 40), task('budget', 45, ActionPriority.HIGH),
      task('approval', 55, ActionPriority.HIGH), task('build', 60), task('training', 90), task('pilot', 100), task('launch', 115, ActionPriority.HIGH), task('review', 130)
    ]
  },
  {
    id: 'app',
    durationDays: 60,
    tasks: [
      task('requirements', 0, ActionPriority.HIGH), task('data', 5), task('mockup', 10), task('build', 15), task('test', 30), task('permissions', 35),
      task('publish', 40, ActionPriority.HIGH), task('guide', 45), task('owner', 50), task('review', 60)
    ]
  },
  {
    id: 'renewal',
    durationDays: 90,
    tasks: [
      task('usage', 0), task('quotes', 7), task('compare', 21), task('negotiate', 30), task('approval', 45, ActionPriority.HIGH), task('sign', 60, ActionPriority.HIGH), task('records', 70)
    ]
  }
];
