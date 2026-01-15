export function buildRedomiciliationJurisdictionContent(industryKey: string): string {
  const infrastructureByIndustry: Record<string, { title: string; description: string }> = {
    payment_system: {
      title: '**Строительство инфраструктуры**',
      description: '> *Вам необходимо построить инфраструктуру, требуемую для старта деятельности вашей компании.*'
    },
    investment_exchange: {
      title: '**Строительство инфраструктуры**',
      description: '> *Вам необходимо построить инфраструктуру, требуемую для старта деятельности вашей компании.*'
    },
    crypto_exchange: {
      title: '**Строительство инфраструктуры**',
      description: '> *Вам необходимо построить инфраструктуру, требуемую для старта деятельности вашей компании.*'
    },
    construction: {
      title: '**Строительная техника**',
      description: '> *Вам необходимо закупить строительную технику, требуемую для старта деятельности вашей компании.*'
    },
    manufacturing: {
      title: '**Строительство инфраструктуры**',
      description: '> *Вам необходимо построить инфраструктуру, требуемую для старта деятельности вашей компании.*'
    }
  };

  const infrastructure = infrastructureByIndustry[industryKey] ?? infrastructureByIndustry.payment_system;

  return [
    '**Смена юрисдикции**',
    '> *Напишите подробную новость о редомициляции Вашей компании в другую страны и смене юрисдикции.*',
    infrastructure.title,
    infrastructure.description
  ].join('\n');
}