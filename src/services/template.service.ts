import {
  Template,
  TemplateType,
  ChannelType,
  TemplateVariable,
} from "../types/template.types";
import { emailTemplates } from "./templates/emailTemplates";
import { mnsWhatsappTemplates } from "./templates/waTemplates";

const templates: Map<string, Template> = new Map();

// Gabungkan semua template (email + WA)
const allTemplates = [...emailTemplates, ...mnsWhatsappTemplates];
allTemplates.forEach((tpl) => templates.set(tpl.id, tpl));

export class TemplateService {
  static getAllTemplates(): Template[] {
    return Array.from(templates.values());
  }

  static getTemplateById(id: string): Template | undefined {
    return templates.get(id);
  }

  static getTemplatesByChannel(channel: ChannelType): Template[] {
    return Array.from(templates.values()).filter(
      (t) => t.channel === channel || t.channel === ChannelType.BOTH
    );
  }

  // ✅ Tambahkan kembali untuk perbaiki template.controller.ts
  static getTemplatesByType(type: TemplateType): Template[] {
    return Array.from(templates.values()).filter((t) => t.type === type);
  }

  static createTemplate(
    template: Omit<Template, "createdAt" | "updatedAt">
  ): Template {
    const newTemplate: Template = {
      ...template,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    templates.set(template.id, newTemplate);
    return newTemplate;
  }

  static updateTemplate(
    id: string,
    updates: Partial<Template>
  ): Template | null {
    const existing = templates.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    templates.set(id, updated);
    return updated;
  }

  static deleteTemplate(id: string): boolean {
    return templates.delete(id);
  }

  static renderTemplate(
    template: Template,
    variables: TemplateVariable
  ): { subject?: string; body: string } {
    let renderedSubject = template.subject || "";
    let renderedBody = template.body;

    Object.keys(variables).forEach((key) => {
      const value = variables[key];
      const regex = new RegExp(`{{${key}}}`, "g");
      renderedSubject = renderedSubject.replace(regex, String(value));
      renderedBody = renderedBody.replace(regex, String(value));
    });

    return {
      subject: template.subject ? renderedSubject : undefined,
      body: renderedBody,
    };
  }
}
