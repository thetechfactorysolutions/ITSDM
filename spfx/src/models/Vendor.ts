export enum VendorStatus {
  ACTIVE = 'ACTIVE',
  UNDER_REVIEW = 'UNDER_REVIEW',
  INACTIVE = 'INACTIVE'
}

export enum VendorCategory {
  SOFTWARE = 'SOFTWARE',
  HARDWARE = 'HARDWARE',
  SERVICES = 'SERVICES',
  TELECOM = 'TELECOM',
  CLOUD = 'CLOUD',
  OTHER = 'OTHER'
}

export interface Vendor {
  id?: number;
  vendorId: string;
  /** The vendor's name. */
  title: string;
  description: string;
  status: VendorStatus;
  category: VendorCategory;
  contactName: string;
  contactEmail: string;
  website: string;
  /** Who manages the relationship on our side. */
  ownerUpn: string;
  created?: string;
  modified?: string;
  editor?: string;
}
