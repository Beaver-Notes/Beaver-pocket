/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
import { configs, test } from "../../../test/playwright/index";
configs({ modes: ['ios'], directions: ['ltr'] }).forEach(({ title, config }) => {
  test.describe(title('animation: animationbuilder'), async () => {
    test('backwards-compatibility animation', async ({ page }) => {
      await page.goto('/src/utils/animation/test/animationbuilder', config);
      await testNavigation(page);
    });
    test('ios-transition web', async ({ page }) => {
      await page.goto('/src/utils/animation/test/animationbuilder', config);
      await testNavigation(page);
    });
    test('ios-transition css', async ({ page }) => {
      await page.goto('/src/utils/animation/test/animationbuilder?ionic:_forceCSSAnimations=true', config);
      await testNavigation(page);
    });
  });
});
const testNavigation = async (page) => {
  const ionRouteDidChange = await page.spyOnEvent('ionRouteDidChange');
  await page.click('page-root ion-button.next');
  await ionRouteDidChange.next();
  page.click('page-one ion-button.next');
  await ionRouteDidChange.next();
  page.click('page-two ion-button.next');
  await ionRouteDidChange.next();
  page.click('page-three ion-back-button');
  await ionRouteDidChange.next();
  page.click('page-two ion-back-button');
  await ionRouteDidChange.next();
  page.click('page-one ion-back-button');
  await ionRouteDidChange.next();
};
