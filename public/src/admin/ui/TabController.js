import { queryAll } from '../../utils/dom.js';

export class TabController {
  constructor(documentRef) {
    this.document = documentRef;
  }

  initialize() {
    const tabs = queryAll(this.document, '.tab');
    const pages = queryAll(this.document, '.page');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const pageId = tab.getAttribute('data-page');
        tabs.forEach((candidate) => {
          candidate.classList.toggle('active', candidate === tab);
        });
        pages.forEach((section) => {
          const matches = section.id === `page-${pageId}`;
          section.classList.toggle('active', matches);
        });
      });
    });
  }
}
