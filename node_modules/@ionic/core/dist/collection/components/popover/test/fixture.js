/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
import { expect } from "@playwright/test";
export class PopoverFixture {
  constructor(page) {
    this.page = page;
  }
  async goto(url, config) {
    await this.page.goto(url, config);
  }
  async open(selector) {
    const { page } = this;
    const ionPopoverDidPresent = await page.spyOnEvent('ionPopoverDidPresent');
    await page.click(selector);
    await ionPopoverDidPresent.next();
  }
  async screenshot(modifier, screenshot) {
    const { page } = this;
    await expect(page).toHaveScreenshot(screenshot(`popover-${modifier}`));
  }
}
