import { OverrideStore } from './state/OverrideStore.js';
import { APIPersistor } from './persistence/APIPersistor.js';
import { LocalStoragePersistor } from './persistence/LocalStoragePersistor.js';
import { TabController } from './ui/TabController.js';
import { QuotaTable } from './ui/QuotaTable.js';
import { DashboardSection } from './sections/DashboardSection.js';
import { GeneralSection } from './sections/GeneralSection.js';
import { FoodSection } from './sections/FoodSection.js';
import { StaffingSection } from './sections/StaffingSection.js';
import { DrinksSection } from './sections/DrinksSection.js';
import { WineSection } from './sections/WineSection.js';
import { RevenueSection } from './sections/RevenueSection.js';
import { VenuesSection } from './sections/VenuesSection.js';
import { BrandingSection } from './sections/BrandingSection.js';
import { ImportExportSection } from './sections/ImportExportSection.js';
import { UsersSection } from './sections/UsersSection.js';
import { configAPI } from './api/ConfigAPI.js';

export class AdminApp {
  constructor(windowRef) {
    this.window = windowRef;
    this.document = windowRef.document;
    this.store = new OverrideStore(windowRef);

    // Use APIPersistor for live updates with localStorage fallback
    this.persistor = new APIPersistor(windowRef, this.store, {
      delay: 500,
      fallbackToLocalStorage: true
    });

    // Keep LocalStoragePersistor as backup
    this.localPersistor = new LocalStoragePersistor(windowRef, this.store);

    this.schedulePersist = this.persistor.schedule.bind(this.persistor);
    this.flushPersist = this.persistor.flush.bind(this.persistor);
    this.tabController = new TabController(this.document);
    this.quotaTable = new QuotaTable(this.document, this.store, this.schedulePersist);
    this.dashboard = new DashboardSection(this.document, this.store);
    this.sections = [
      new GeneralSection(this.document, this.store, this.schedulePersist),
      new FoodSection(this.document, this.store, this.schedulePersist),
      new StaffingSection(this.document, this.store, this.schedulePersist),
      new DrinksSection(this.document, this.store, this.schedulePersist),
      new WineSection(this.document, this.store, this.schedulePersist),
      new RevenueSection(this.document, this.store, this.schedulePersist),
      new VenuesSection(this.document, this.store, this.schedulePersist),
      new BrandingSection(this.document, this.store, this.schedulePersist)
    ];
    this.importExport = new ImportExportSection(
      this.document,
      this.store,
      this.schedulePersist,
      this.flushPersist,
      () => this.renderAll(),
      this.quotaTable
    );
    this.usersSection = new UsersSection(this.document);
  }

  async initialize() {
    // Load configuration from server
    try {
      const data = await this.persistor.load();
      if (data && data.config) {
        this.store.replaceConfig(data.config);
      }
      if (data && data.quotas) {
        this.store.replaceQuotas(data.quotas);
      }
    } catch (error) {
      console.warn('Failed to load from server, using default config:', error);
    }

    this.store.updateGlobals();
    this.tabController.initialize();
    this.quotaTable.bindAddButton();
    this.quotaTable.render();
    this.sections.forEach((section) => {
      if (typeof section.initialize === 'function') {
        section.initialize();
      }
    });
    this.importExport.initialize();
    this.usersSection.initialize();
    this.renderAll();
  }

  renderAll() {
    this.dashboard.render();
    this.quotaTable.render();
    this.sections.forEach((section) => {
      if (typeof section.render === 'function') {
        section.render();
      }
    });
  }
}
