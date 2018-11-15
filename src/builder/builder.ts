import { BuilderResult } from "./builder-result";

export interface Builder {
  /**
   * Build the module.
   * @param moduleName the module's name.
   * @param targetModuleName the module name that is being build (so moduleName may be it or a dependency of it).
   * @param extraCommands extra args received by ngdeps.
   */
  build(moduleName: string, targetModuleName: string, extraCommands: string): Promise<BuilderResult>;

  /**
   * Stop building the module.
   */
  stop(): Promise<void>;
}