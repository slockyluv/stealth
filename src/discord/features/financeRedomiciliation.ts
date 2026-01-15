export type RedomiciliationInfrastructureContent = {
  title: string;
  description: string;
};

export function getRedomiciliationInfrastructureContent(industryKey: string): RedomiciliationInfrastructureContent {
  const infrastructureByIndustry = {
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
  } as const;

  const fallbackInfrastructure = infrastructureByIndustry.payment_system;
  const infrastructure =
    infrastructureByIndustry[industryKey as keyof typeof infrastructureByIndustry] ?? fallbackInfrastructure;

  return {
    title: infrastructure.title ?? fallbackInfrastructure.title,
    description: infrastructure.description ?? fallbackInfrastructure.description
  };
}
