import { getRedomiciliationInfrastructureContent } from './financeRedomiciliation.js';

export function getCompanyActivityInfrastructureContent(industryKey: string) {
  const content = getRedomiciliationInfrastructureContent(industryKey);
  const updatedItems = content.items.map((item) => {
    if (item.key !== 'mainOffice') {
      return item;
    }

    return {
      ...item,
      label: item.label.replace('Главный офис', 'Местный офис')
    };
  });

  return {
    ...content,
    items: updatedItems
  };
}