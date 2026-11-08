export interface ISharePointListMap {
  ideas: string;
  initiatives: string;
  projects: string;
  actions: string;
  kpis: string;
  budgets: string;
  capex: string;
  opex: string;
  vendors: string;
  contracts: string;
  risks: string;
  decisions: string;
  incidents: string;
  interactions: string;
  changeRequests: string;
  teamSkills: string;
  trainingPlans: string;
  knowledgeBase: string;
  reviews: string;
  lessonsLearned: string;
  meetings: string;
  notes: string;
}

export interface IAppConfig {
  appName: string;
  tagline: string;
  sharePoint: {
    listNames: ISharePointListMap;
  };
  service: {
    /** Days allowed to resolve an incident, by severity, counted from the day it was reported. */
    slaDays: Record<string, number>;
    /** A KPI within this ratio of its target is "at risk" instead of "off target". */
    kpiTolerance: number;
  };
  approvals: {
    /** A project whose forecast exceeds its budget by more than this ratio needs approval. */
    overBudgetRatio: number;
    /** A project with at least this budget needs approval to become active. */
    highBudget: number;
    /** A CAPEX or OPEX commitment, or a contract, of at least this amount needs approval. */
    highSpend: number;
  };
}

export const AppConfig: IAppConfig = {
  appName: 'IT Management Hub',
  tagline: 'Operate · Improve · Innovate',
  sharePoint: {
    listNames: {
      ideas: 'IT_01_Ideas',
      initiatives: 'IT_02_Initiatives',
      projects: 'IT_03_Projects',
      actions: 'IT_04_Actions',
      kpis: 'IT_05_KPIs',
      budgets: 'IT_06_Budgets',
      capex: 'IT_07_CAPEX',
      opex: 'IT_08_OPEX',
      vendors: 'IT_09_Vendors',
      contracts: 'IT_10_Contracts',
      risks: 'IT_11_Risks',
      decisions: 'IT_12_Decisions',
      incidents: 'IT_13_Incidents',
      interactions: 'IT_14_Interactions',
      changeRequests: 'IT_15_ChangeRequests',
      teamSkills: 'IT_16_TeamSkills',
      trainingPlans: 'IT_17_TrainingPlans',
      knowledgeBase: 'IT_18_KnowledgeBase',
      reviews: 'IT_19_Reviews',
      lessonsLearned: 'IT_20_LessonsLearned',
      meetings: 'IT_21_Meetings',
      notes: 'IT_22_Notes'
    }
  },
  service: {
    slaDays: { LOW: 14, MEDIUM: 7, HIGH: 3, CRITICAL: 1 },
    kpiTolerance: 0.1
  },
  approvals: {
    overBudgetRatio: 0.1,
    highBudget: 100000,
    highSpend: 50000
  }
};
