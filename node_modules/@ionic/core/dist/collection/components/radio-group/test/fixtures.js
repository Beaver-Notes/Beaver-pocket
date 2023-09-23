/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
import { expect } from "@playwright/test";
export class RadioFixture {
  constructor(page) {
    this.page = page;
  }
  async checkRadio(method, selector = 'ion-radio') {
    const { page } = this;
    const radio = (this.radio = page.locator(selector));
    if (method === 'keyboard') {
      await radio.focus();
      await page.keyboard.press('Space');
    }
    else {
      await radio.click();
    }
    await page.waitForChanges();
    return radio;
  }
  async expectChecked(state) {
    const { radio } = this;
    if (state) {
      await expect(radio).toHaveClass(/radio-checked/);
    }
    else {
      await expect(radio).not.toHaveClass(/radio-checked/);
    }
  }
}
