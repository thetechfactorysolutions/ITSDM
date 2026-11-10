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
  matters: string;
  areas: string;
  links: string;
  entitlements: string;
  nps: string;
  serviceMonths: string;
  catalog: string;
  stock: string;
  genius: string;
  objectives: string;
  businessCases: string;
  weeklyReviews: string;
  purchaseOrders: string;
  purchases: string;
  purchaseRoles: string;
  favorites: string;
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
    /** A detractor not called within this many days of answering is flagged. */
    npsFollowUpDays: number;
    /** Monthly SLA below this percentage is flagged. */
    slaTarget: number;
  };
  people: {
    /** A certification that expires within this many days is flagged. */
    certificationWarningDays: number;
  };
  knowledge: {
    /** Days after publishing until an article should be read again. */
    reviewDays: number;
  };
  matters: {
    /** An inbox item that waits longer than this many days without being classified is flagged. */
    inboxStaleDays: number;
  };
  purchases: {
    /** An order that has used this share of its amount is flagged. */
    nearRatio: number;
  };
  entitlements: {
    /** Notice days given to a new warranty or licence. */
    defaultNoticeDays: number;
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
      notes: 'IT_22_Notes',
      matters: 'IT_23_Matters',
      areas: 'IT_24_Areas',
      links: 'IT_25_Links',
      entitlements: 'IT_26_Entitlements',
      nps: 'IT_27_NpsResponses',
      serviceMonths: 'IT_28_ServiceMonths',
      catalog: 'IT_29_Catalog',
      stock: 'IT_30_Stock',
      genius: 'IT_31_GeniusSessions',
      objectives: 'IT_32_Objectives',
      businessCases: 'IT_33_BusinessCases',
      weeklyReviews: 'IT_34_WeeklyReviews',
      purchaseOrders: 'IT_35_PurchaseOrders',
      purchases: 'IT_36_Purchases',
      purchaseRoles: 'IT_37_PurchaseRoles',
      favorites: 'IT_38_Favorites'
    }
  },
  service: {
    slaDays: { LOW: 14, MEDIUM: 7, HIGH: 3, CRITICAL: 1 },
    kpiTolerance: 0.1,
    npsFollowUpDays: 7,
    slaTarget: 95
  },
  people: {
    certificationWarningDays: 60
  },
  knowledge: {
    reviewDays: 180
  },
  matters: {
    inboxStaleDays: 3
  },
  purchases: {
    nearRatio: 0.9
  },
  entitlements: {
    defaultNoticeDays: 60
  },
  approvals: {
    overBudgetRatio: 0.1,
    highBudget: 100000,
    highSpend: 50000
  }
};
