import errorHandler from "./error.handler.js";
import { EAvailableTemplates, type TTemplate } from "./dto/templates.dto.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

class TemplatesService {
  /**
   * Get template
   * @param {string} name - Template name
   * @returns {Promise<TTemplate>} Template
   */
  async getTemplate(name: EAvailableTemplates): Promise<TTemplate> {
    try {
      const templatePath = join(
        process.cwd(),
        "src",
        "lib",
        "templates",
        `${name}.json`,
      );
      const template = readFileSync(templatePath, "utf8");
      if (!template) {
        throw errorHandler.httpError(404, `Template ${name} not found`);
      }
      return JSON.parse(template) as TTemplate;
    } catch (error) {
      throw errorHandler.httpError(500, `Template ${name} not found: ${error}`);
    }
  }
}

export default new TemplatesService();
