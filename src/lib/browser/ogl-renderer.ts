import { Renderer } from "ogl";

type RendererOptions = ConstructorParameters<typeof Renderer>[0];
type RendererFactory = (options?: RendererOptions) => Renderer;

export function createOglRenderer(
  source: string,
  options?: RendererOptions,
  factory: RendererFactory = (rendererOptions) => new Renderer(rendererOptions),
) {
  try {
    return factory(options);
  } catch (error) {
    console.error(`${source} disabled: WebGL initialization failed`, error);
    return null;
  }
}
