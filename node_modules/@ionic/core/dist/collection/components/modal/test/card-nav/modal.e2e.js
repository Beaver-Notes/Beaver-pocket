/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
import { expect } from "@playwright/test";
import { configs, test, dragElementBy } from "../../../../utils/test/playwright/index";
import { CardModalPage } from "../fixtures";
/**
 * This test only verifies that the gesture activates inside of a modal.
 */
configs({ modes: ['ios'], directions: ['ltr'] }).forEach(({ title, config }) => {
  test.describe(title('card modal - nav'), () => {
    let cardModalPage;
    test.beforeEach(async ({ page }) => {
      cardModalPage = new CardModalPage(page);
      await cardModalPage.navigate('/src/components/modal/test/card-nav?ionic:_testing=false', config);
    });
    test('it should swipe to go back', async ({ page }) => {
      await cardModalPage.openModalByTrigger('#open-modal');
      const nav = page.locator('ion-nav');
      const ionNavDidChange = await nav.spyOnEvent('ionNavDidChange');
      await page.click('#go-page-two');
      await ionNavDidChange.next();
      const pageOne = page.locator('page-one');
      await expect(pageOne).toHaveClass(/ion-page-hidden/);
      const content = page.locator('.page-two-content');
      await dragElementBy(content, page, 370, 0, 10);
      await ionNavDidChange.next();
    });
    test('should swipe to close', async ({ page }) => {
      await cardModalPage.openModalByTrigger('#open-modal');
      const nav = page.locator('ion-nav');
      const ionNavDidChange = await nav.spyOnEvent('ionNavDidChange');
      await page.click('#go-page-two');
      await ionNavDidChange.next();
      await cardModalPage.swipeToCloseModal('ion-modal ion-content.page-two-content', true, 270);
    });
  });
});
