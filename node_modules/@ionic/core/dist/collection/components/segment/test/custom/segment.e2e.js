/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
import { expect } from "@playwright/test";
import { configs, test } from "../../../../utils/test/playwright/index";
configs({ directions: ['ltr'] }).forEach(({ title, screenshot, config }) => {
  test.describe(title('segment: custom'), () => {
    test('should not have visual regressions', async ({ page }) => {
      await page.goto('/src/components/segment/test/custom', config);
      await page.setIonViewport();
      await expect(page).toHaveScreenshot(screenshot(`segment-custom`));
    });
  });
});
