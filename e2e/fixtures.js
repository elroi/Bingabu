import { test as base, expect } from "@playwright/test";
import { blockGoogleFonts } from "./helpers.js";

const test = base.extend({
  context: async ({ context }, use) => {
    await blockGoogleFonts(context);
    await use(context);
  },
});

export { test, expect };
