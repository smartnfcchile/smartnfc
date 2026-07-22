export interface SubscriberDashboardDto {
  id: string;
  name: string;
  whatsappMasked: string;
  status: string;
  createdAt: string;
  firstSubscribedAt: string;
  lastSubscribedAt: string | null;
  campaign: {
    id: string;
    name: string;
  };
  consentRecords: Array<{
    id: string;
    acceptedAt: string;
  }>;
  exportItems: Array<{
    id: string;
    batchId: string;
    consentRecordId: string;
    batch: {
      id: string;
      status: string;
    };
  }>;
}

export interface BatchDashboardDto {
  id: string;
  createdAt: string;
  status: string;
  campaignId: string | null;
  campaign: {
    name: string;
  } | null;
  createdByUser: {
    name: string;
  } | null;
  items: Array<{
    id: string;
    subscriber: {
      name: string;
      whatsappMasked: string;
    };
  }>;
}

export interface RemovalDashboardDto {
  id: string;
  createdAt: string;
  reason: string;
  completedAt: string | null;
  subscriber: {
    id: string;
    name: string;
    whatsappMasked: string;
    campaign: {
      name: string;
    };
  };
}
