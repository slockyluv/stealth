import type { RedomiciliationInfrastructureItemKey } from '../../services/redomiciliationService.js';

export type RedomiciliationInfrastructureItem = {
  key: RedomiciliationInfrastructureItemKey;
  label: string;
  actionLabel: string;
  doneLabel: string;
};

export type RedomiciliationInfrastructureContent = {
  title: string;
  description: string;
  actionHeader: string;
  items: RedomiciliationInfrastructureItem[];
};

export function getRedomiciliationInfrastructureContent(industryKey: string): RedomiciliationInfrastructureContent {
  const infrastructureByIndustry: Record<string, RedomiciliationInfrastructureContent> = {
    payment_system: {
      title: '**Строительство инфраструктуры**',
      description: '> *Вам необходимо построить инфраструктуру, требуемую для старта деятельности вашей компании.*',
      actionHeader: 'Необходимая инфраструктура',
      items: [
        {
          key: 'mainOffice',
          label: 'Главный офис компании',
          actionLabel: 'Построить',
          doneLabel: 'Построено'
        },
        {
          key: 'serverInfrastructure',
          label: 'Серверная инфраструктура',
          actionLabel: 'Построить',
          doneLabel: 'Построено'
        }
      ]
    },
    investment_exchange: {
      title: '**Строительство инфраструктуры**',
      description: '> *Вам необходимо построить инфраструктуру, требуемую для старта деятельности вашей компании.*',
      actionHeader: 'Необходимая инфраструктура',
      items: [
        {
          key: 'mainOffice',
          label: 'Главный офис компании',
          actionLabel: 'Построить',
          doneLabel: 'Построено'
        },
        {
          key: 'serverInfrastructure',
          label: 'Серверная инфраструктура',
          actionLabel: 'Построить',
          doneLabel: 'Построено'
        }
      ]
    },
    crypto_exchange: {
      title: '**Строительство инфраструктуры**',
      description: '> *Вам необходимо построить инфраструктуру, требуемую для старта деятельности вашей компании.*',
      actionHeader: 'Необходимая инфраструктура',
      items: [
        {
          key: 'mainOffice',
          label: 'Главный офис компании',
          actionLabel: 'Построить',
          doneLabel: 'Построено'
        },
        {
          key: 'serverInfrastructure',
          label: 'Серверная инфраструктура',
          actionLabel: 'Построить',
          doneLabel: 'Построено'
        }
      ]
    },
    construction: {
      title: '**Строительная техника**',
      description: '> *Вам необходимо закупить строительную технику, требуемую для старта деятельности вашей компании.*',
      actionHeader: 'Необходимая техника',
      items: [
        {
          key: 'mainEquipment',
          label: 'Основная техника',
          actionLabel: 'Закупить',
          doneLabel: 'Закуплено'
        },
        {
          key: 'supportEquipment',
          label: 'Вспомогательная техника',
          actionLabel: 'Закупить',
          doneLabel: 'Закуплено'
        }
      ]
    },
    manufacturing: {
      title: '**Строительство инфраструктуры**',
      description: '> *Вам необходимо построить инфраструктуру, требуемую для старта деятельности вашей компании.*',
      actionHeader: 'Необходимая инфраструктура',
      items: [
        {
          key: 'mainOffice',
          label: 'Главный офис компании',
          actionLabel: 'Построить',
          doneLabel: 'Построено'
        },
        {
          key: 'productionInfrastructure',
          label: 'Производственная инфраструктура',
          actionLabel: 'Построить',
          doneLabel: 'Построено'
        }
      ]
    }
  } as const satisfies Record<string, RedomiciliationInfrastructureContent>;

  const fallbackInfrastructure = infrastructureByIndustry.payment_system;
  const infrastructure =
    infrastructureByIndustry[industryKey as keyof typeof infrastructureByIndustry] ?? fallbackInfrastructure;

  return {
    title: infrastructure.title,
    description: infrastructure.description,
    actionHeader: infrastructure.actionHeader,
    items: infrastructure.items
  };
}