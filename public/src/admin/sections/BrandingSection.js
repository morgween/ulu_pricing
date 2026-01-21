import { BaseSection } from './BaseSection.js';

export class BrandingSection extends BaseSection {
  initialize() {
    this.render();
  }

  render() {
    const branding = this.ensure(['branding'], {});

    this.bindText('branding_logo_url', {
      get: () => branding.logoUrl || '',
      set: (value) => {
        branding.logoUrl = value;
      }
    });

    this.bindTextarea('branding_logo_dataurl', {
      get: () => branding.logoDataUrl || '',
      set: (value) => {
        branding.logoDataUrl = value;
      }
    });

    this.bindNumber('branding_logo_width', {
      get: () => Number.isFinite(branding.logoWidthPt) ? branding.logoWidthPt : 120,
      set: (value) => {
        branding.logoWidthPt = value;
      },
      fallback: 120,
      format: (value) => value
    });

    this.bindNumber('branding_logo_height', {
      get: () => Number.isFinite(branding.logoHeightPt) ? branding.logoHeightPt : 40,
      set: (value) => {
        branding.logoHeightPt = value;
      },
      fallback: 40,
      format: (value) => value
    });

    this.bindText('branding_font_url', {
      get: () => branding.fontUrl || '',
      set: (value) => {
        branding.fontUrl = value;
      }
    });

    this.bindTextarea('branding_font_dataurl', {
      get: () => branding.fontDataUrl || '',
      set: (value) => {
        branding.fontDataUrl = value;
      }
    });

    this.bindTextarea('branding_footer_lines', {
      get: () => Array.isArray(branding.footerLines) ? branding.footerLines.join('\n') : '',
      set: (value) => {
        branding.footerLines = value.split('\n');
      }
    });
  }
}
