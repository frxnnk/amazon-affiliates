import { c as createComponent, f as createAstro, a as renderComponent, b as renderTemplate } from "./astro/server_NRwpav8g.mjs";
import "piccolore";
import { $ as $$InternalUIComponentRenderer } from "./InternalUIComponentRenderer_4tbiGPM9.mjs";
const $$Astro = createAstro("https://amazon-affiliates.vercel.app");
const $$SignIn = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$SignIn;
  return renderTemplate`${renderComponent($$result, "InternalUIComponentRenderer", $$InternalUIComponentRenderer, { ...Astro2.props, "component": "sign-in" })}`;
}, "C:/Users/franc/OneDrive/Documentos/dev/amazon-affiliates/node_modules/@clerk/astro/components/interactive/SignIn.astro", void 0);
export {
  $$SignIn as $
};
