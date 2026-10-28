import React from 'react';
import { CommercialTeam } from '@/components/leads/CommercialTeam';
import { OrderToCash } from '@/components/leads/OrderToCash';
import { ProfessionalServicesTab } from '@/components/leads/tabs/professional-services-tab';
import { ProjectPlansTab } from '@/components/leads/tabs/project-plans-tab';

export type DeliveryTabKey = 'team' | 'orders' | 'professional services' | 'projects';

interface DeliveryWorkspaceTabProps {
  activeTab: DeliveryTabKey;
  leadId: string | number;
}

export function DeliveryWorkspaceTab({ activeTab, leadId }: DeliveryWorkspaceTabProps) {
  const numericId = Number(leadId);

  return (
    <div className="space-y-6">
      {activeTab === 'team' && <CommercialTeam leadId={leadId} />}
      {activeTab === 'orders' && <OrderToCash leadId={leadId} />}
      {activeTab === 'professional services' && <ProfessionalServicesTab leadId={numericId} />}
      {activeTab === 'projects' && <ProjectPlansTab leadId={numericId} />}
    </div>
  );
}
