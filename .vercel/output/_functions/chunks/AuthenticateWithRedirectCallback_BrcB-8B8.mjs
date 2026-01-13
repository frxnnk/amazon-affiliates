import { c as createComponent, f as createAstro, b as renderTemplate, g as defineScriptVars, e as addAttribute, m as maybeRenderHead } from "./astro/server_NRwpav8g.mjs";
import "piccolore";
import "clsx";
import { g as generateSafeId } from "./index_D3GXOACt.mjs";
var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Astro = createAstro("https://amazon-affiliates.vercel.app");
const $$AuthenticateWithRedirectCallback = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$AuthenticateWithRedirectCallback;
  const safeId = generateSafeId();
  const functionName = "handleRedirectCallback";
  return renderTemplate(_a || (_a = __template(["", "<div", "></div> <script>(function(){", "\n  /**\n   * Store the id and the props for the Astro component in order to invoice the correct Clerk function once clerk is loaded.\n   * The above is handled by `invokeClerkAstroJSFunctions`.\n   *\n   * TODO: This should be moved to a separate file once we implement more control components.\n   */\n  const setOrCreatePropMap = ({ functionName, id, props }) => {\n    if (!window.__astro_clerk_function_props) {\n      window.__astro_clerk_function_props = new Map();\n    }\n\n    if (!window.__astro_clerk_function_props.has(functionName)) {\n      const _ = new Map();\n      _.set(id, props);\n      window.__astro_clerk_function_props.set(functionName, _);\n    }\n\n    window.__astro_clerk_function_props.get(functionName)?.set(id, props);\n  };\n\n  setOrCreatePropMap({\n    functionName,\n    id: safeId,\n    props,\n  });\n})();<\/script>"], ["", "<div", "></div> <script>(function(){", "\n  /**\n   * Store the id and the props for the Astro component in order to invoice the correct Clerk function once clerk is loaded.\n   * The above is handled by \\`invokeClerkAstroJSFunctions\\`.\n   *\n   * TODO: This should be moved to a separate file once we implement more control components.\n   */\n  const setOrCreatePropMap = ({ functionName, id, props }) => {\n    if (!window.__astro_clerk_function_props) {\n      window.__astro_clerk_function_props = new Map();\n    }\n\n    if (!window.__astro_clerk_function_props.has(functionName)) {\n      const _ = new Map();\n      _.set(id, props);\n      window.__astro_clerk_function_props.set(functionName, _);\n    }\n\n    window.__astro_clerk_function_props.get(functionName)?.set(id, props);\n  };\n\n  setOrCreatePropMap({\n    functionName,\n    id: safeId,\n    props,\n  });\n})();<\/script>"])), maybeRenderHead(), addAttribute(`clerk-${functionName}-${safeId}`, "data-clerk-function-id"), defineScriptVars({ props: Astro2.props, functionName, safeId }));
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/node_modules/@clerk/astro/components/control/AuthenticateWithRedirectCallback.astro", void 0);
export {
  $$AuthenticateWithRedirectCallback as $
};
