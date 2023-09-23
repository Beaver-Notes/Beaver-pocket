/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
import { expect } from "@playwright/test";
import { configs, test, Viewports } from "../../../../utils/test/playwright/index";
configs().forEach(({ title, screenshot, config }) => {
  test.describe(title('modal: custom rendering'), () => {
    const runVisualTests = async (page, screenshotModifier = '') => {
      await page.goto('/src/components/modal/test/custom', config);
      const ionModalDidPresent = await page.spyOnEvent('ionModalDidPresent');
      await page.click('#custom-modal');
      await ionModalDidPresent.next();
      await page.setIonViewport();
      await expect(page).toHaveScreenshot(screenshot(`modal-custom-present${screenshotModifier}`));
    };
    test('should not have visual regressions', async ({ page }) => {
      await runVisualTests(page);
    });
    test('should not have visual regressions with tablet viewport', async ({ page }) => {
      await page.setViewportSize(Viewports.tablet.portrait);
      await runVisualTests(page, '-tablet');
    });
  });
});
