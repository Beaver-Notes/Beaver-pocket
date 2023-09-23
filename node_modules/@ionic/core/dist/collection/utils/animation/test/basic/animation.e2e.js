/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
import { configs, test } from "../../../test/playwright/index";
configs({ modes: ['md'], directions: ['ltr'] }).forEach(({ title, config }) => {
  test.describe(title('animation: basic'), async () => {
    test(`should resolve using web animations`, async ({ page }) => {
      await page.goto('/src/utils/animation/test/basic', config);
      await testPage(page);
    });
    test(`should resolve using css animations`, async ({ page }) => {
      await page.goto('/src/utils/animation/test/basic?ionic:_forceCSSAnimations=true', config);
      await testPage(page);
    });
  });
});
const testPage = async (page) => {
  const ionAnimationFinished = await page.spyOnEvent('ionAnimationFinished');
  await page.click('.play');
  await ionAnimationFinished.next();
};
