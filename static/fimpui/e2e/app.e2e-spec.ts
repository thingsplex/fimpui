import { FimpuiPage } from './app.po';

describe('thingsplex App', function() {
  let page: FimpuiPage;

  beforeEach(() => {
    page = new FimpuiPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
