export function buildRedomiciliationJurisdictionContent(industryKey: string): string {
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
  const infrastructureTitle = infrastructure.title ?? fallbackInfrastructure.title;
  const infrastructureDescription = infrastructure.description ?? fallbackInfrastructure.description;

  return [
    '**Смена юрисдикции**',
    '> *Напишите подробную новость о редомициляции Вашей компании в другую страны и смене юрисдикции.*',
    '```Вы приступили к выполнению действия. Вам необходимо написать подробную новость о том, что ваша компания переехала и сменила страну юрисдикции. Текст должен быть красиво стилистически оформлен и содержать прикрепленную картинку, соответствующую тематике.```',
    infrastructureTitle,
    infrastructureDescription
  ].join('\n');
}
