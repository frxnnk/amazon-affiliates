import "@clerk/shared/underscore";
import { customAlphabet, urlAlphabet } from "nanoid";
var generateSafeId = (defaultSize = 10) => customAlphabet(urlAlphabet, defaultSize)();
export {
  generateSafeId as g
};
