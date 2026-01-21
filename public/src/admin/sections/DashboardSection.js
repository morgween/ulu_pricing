import { BaseSection } from './BaseSection.js';

/**
 * Dashboard Section - displays summary of key configuration values
 */
export class DashboardSection extends BaseSection {
  constructor(documentRef, store) {
    super(documentRef, store, null); // No persist needed for read-only dashboard
  }

  /**
   * Render dashboard values from current configuration
   */
  render() {
    const config = this.config;

    // General Settings
    this.setText('dash-vat', this.formatPercent(config.vat));
    this.setText('dash-child-factor', config.children?.factor ?? 0.75);
    this.setText('dash-min-guests', config.events?.minimumGuests ?? 20);

    // Food Pricing - using correct paths from config.food.winery
    const foodPriceIncVAT = config.food?.winery?.price_incVAT ?? 0;
    const foodCost = config.food?.winery?.cost_exVAT ?? 0;

    this.setText('dash-food-price', this.formatCurrency(foodPriceIncVAT));
    this.setText('dash-food-cost', this.formatCurrency(foodCost));

    // Staffing
    const workerRate = config.staffing?.workerRate_exVAT ?? 0;
    const managerBonus = config.staffing?.managerBonus_exVAT ?? 0;
    const revenueComp = config.staffing?.revenueComponent_exVAT ?? 0;

    this.setText('dash-worker-rate', this.formatCurrency(workerRate));
    this.setText('dash-manager-bonus', this.formatCurrency(managerBonus));
    this.setText('dash-revenue-comp', this.formatCurrency(revenueComp));
  }

  /**
   * Set text content of element by ID
   */
  setText(id, value) {
    const element = this.$(id);
    if (element) {
      element.textContent = value;
    }
  }

  /**
   * Format number as currency (₪)
   */
  formatCurrency(value) {
    if (typeof value !== 'number' || !isFinite(value)) {
      return '—';
    }
    return `₪${value.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }

  /**
   * Format number as percentage
   */
  formatPercent(value) {
    if (typeof value !== 'number' || !isFinite(value)) {
      return '—';
    }
    return `${(value * 100).toFixed(0)}%`;
  }
}
