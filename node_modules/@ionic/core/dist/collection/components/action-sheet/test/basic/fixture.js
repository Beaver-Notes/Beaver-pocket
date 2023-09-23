/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
import { expect } from "@playwright/test";
export class ActionSheetFixture {
  constructor(page, screenshot) {
    this.page = page;
    this.screenshotFn = screenshot;
  }
  async open(selector) {
    const ionActionSheetDidPresent = await this.page.spyOnEvent('ionActionSheetDidPresent');
    await this.page.locator(selector).click();
    await ionActionSheetDidPresent.next();
    this.actionSheet = this.page.locator('ion-action-sheet');
    await expect(this.actionSheet).toBeVisible();
  }
  async dismiss() {
    const ionActionSheetDidDismiss = await this.page.spyOnEvent('ionActionSheetDidDismiss');
    await this.actionSheet.evaluate((el) => el.dismiss());
    await ionActionSheetDidDismiss.next();
    await expect(this.actionSheet).not.toBeVisible();
  }
  async screenshot(modifier) {
    const { screenshotFn } = this;
    if (!screenshotFn) {
      throw new Error('A screenshot function is required to take a screenshot. Pass one in when creating ActionSheetFixture.');
    }
    await expect(this.actionSheet).toHaveScreenshot(screenshotFn(`action-sheet-${modifier}-diff`));
  }
}
