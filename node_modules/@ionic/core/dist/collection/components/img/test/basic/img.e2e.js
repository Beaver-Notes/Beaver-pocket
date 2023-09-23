/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
import { expect } from "@playwright/test";
import { configs, test } from "../../../../utils/test/playwright/index";
configs({ modes: ['md'], directions: ['ltr'] }).forEach(({ title, config }) => {
  test.describe(title('img: basic'), () => {
    // TODO FW-3596
    test.describe.skip('image successfully loads', () => {
      let ionImgWillLoad;
      let ionImgDidLoad;
      test.beforeEach(async ({ page }) => {
        await page.route('**/*', (route) => {
          if (route.request().resourceType() === 'image') {
            return route.fulfill({
              status: 200,
              contentType: 'image/png',
              body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIwAAAABJRU5ErkJggg==', 'base64'),
            });
          }
          return route.continue();
        });
        /**
         * We render the img intentionally without providing a source,
         * to allow the event spies to be set-up before the events
         * can be emitted.
         *
         * Later we will assign an image source to load.
         */
        await page.setContent('<ion-img></ion-img>', config);
        ionImgDidLoad = await page.spyOnEvent('ionImgDidLoad');
        ionImgWillLoad = await page.spyOnEvent('ionImgWillLoad');
        const ionImg = page.locator('ion-img');
        await ionImg.evaluate((el) => {
          el.src = 'https://via.placeholder.com/150';
          return el;
        });
      });
      test('should emit ionImgWillLoad', async () => {
        await ionImgWillLoad.next();
        expect(ionImgWillLoad).toHaveReceivedEventTimes(1);
      });
      test('should emit ionImgDidLoad', async () => {
        await ionImgDidLoad.next();
        expect(ionImgWillLoad).toHaveReceivedEventTimes(1);
      });
    });
    test.describe('image fails to load', () => {
      let ionError;
      test.beforeEach(async ({ page }) => {
        await page.route('**/*', (route) => route.request().resourceType() === 'image' ? route.abort() : route.continue());
        /**
         * We render the img intentionally without providing a source,
         * to allow the event spies to be set-up before the events
         * can be emitted.
         *
         * Later we will assign an image source to load.
         */
        await page.setContent('<ion-img></ion-img>', config);
        ionError = await page.spyOnEvent('ionError');
        const ionImg = page.locator('ion-img');
        await ionImg.evaluate((el) => {
          el.src = 'https://via.placeholder.com/150';
          return el;
        });
      });
      test('should emit ionError', async () => {
        await ionError.next();
        expect(ionError).toHaveReceivedEventTimes(1);
      });
    });
  });
});
