// src/controllers/template.controller.ts
import { Request, Response } from "express";
import { TemplateService } from "../services/template.service";
import { ChannelType, TemplateType } from "../types/template.types";
import logger from "../utils/logger";
import ResponseHelper from "../utils/api-response.helper";

export const getAllTemplates = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { channel, type } = req.query;

    let templates;

    if (
      channel &&
      Object.values(ChannelType).includes(channel as ChannelType)
    ) {
      templates = TemplateService.getTemplatesByChannel(channel as ChannelType);
    } else if (
      type &&
      Object.values(TemplateType).includes(type as TemplateType)
    ) {
      templates = TemplateService.getTemplatesByType(type as TemplateType);
    } else {
      templates = TemplateService.getAllTemplates();
    }

    ResponseHelper.success(res, templates);
  } catch (error) {
    logger.error("Error getting templates:", error);
    ResponseHelper.error(res, "Failed to get templates");
  }
};

export const getTemplateById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const template = TemplateService.getTemplateById(id);

    if (!template) {
      res.status(404).json({
        success: false,
        message: `Template with ID '${id}' not found`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      template,
    });
  } catch (error) {
    logger.error("Error getting template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get template",
    });
  }
};

/**
 * Get template variable requirements
 * GET /api/templates/:id/requirements
 */
export const getTemplateRequirements = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const template = TemplateService.getTemplateById(id);

    if (!template) {
      res.status(404).json({
        success: false,
        message: `Template with ID '${id}' not found`,
      });
      return;
    }

    const requirements = TemplateService.getTemplateRequirements(id);

    res.status(200).json({
      success: true,
      templateId: id,
      templateName: template.name,
      channels: template.channels,
      requirements: requirements || [],
      variableCount: template.variables.length,
      variables: template.variables,
    });
  } catch (error) {
    logger.error("Error getting template requirements:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get template requirements",
    });
  }
};

/**
 * Validate variables against template requirements
 * POST /api/templates/:id/validate
 * Body: { variables: { name: "John", email: "john@example.com" } }
 */
export const validateTemplateVariables = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { variables } = req.body;

    if (!variables || typeof variables !== "object") {
      res.status(400).json({
        success: false,
        message: "Variables object is required",
      });
      return;
    }

    const template = TemplateService.getTemplateById(id);

    if (!template) {
      res.status(404).json({
        success: false,
        message: `Template with ID '${id}' not found`,
      });
      return;
    }

    const validation = TemplateService.validateVariables(id, variables);

    if (validation.valid) {
      res.status(200).json({
        success: true,
        message: "All variables are valid",
        validation: {
          valid: true,
          providedVariables: Object.keys(variables),
          requiredVariables: template.variables,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Variable validation failed",
        validation: {
          valid: false,
          errors: validation.errors,
          missing: validation.missing,
          providedVariables: Object.keys(variables),
          requiredVariables: template.variables,
        },
      });
    }
  } catch (error) {
    logger.error("Error validating template variables:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate template variables",
    });
  }
};

export const createTemplate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      id,
      name,
      type,
      channels,
      subject,
      body,
      variables,
      variableRequirements,
    } = req.body;

    if (!id || !name || !type || !channels || !body) {
      res.status(400).json({
        success: false,
        message: "Missing required fields: id, name, type, channels, body",
      });
      return;
    }

    if (!Array.isArray(channels) || channels.length === 0) {
      res.status(400).json({
        success: false,
        message:
          'Channels must be a non-empty array. Example: ["email"], ["whatsapp"], or ["email", "whatsapp"]',
      });
      return;
    }

    // Check if template ID already exists
    if (TemplateService.getTemplateById(id)) {
      res.status(409).json({
        success: false,
        message: `Template with ID '${id}' already exists`,
      });
      return;
    }

    const template = TemplateService.createTemplate({
      id,
      name,
      type,
      channels,
      subject,
      body,
      variables: variables || [],
      variableRequirements: variableRequirements || [],
    });

    logger.info("Template created", { templateId: id, name });

    res.status(201).json({
      success: true,
      message: "Template created successfully",
      template,
    });
  } catch (error) {
    logger.error("Error creating template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create template",
    });
  }
};

export const updateTemplate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const template = TemplateService.updateTemplate(id, updates);

    if (!template) {
      res.status(404).json({
        success: false,
        message: `Template with ID '${id}' not found`,
      });
      return;
    }

    logger.info("Template updated", { templateId: id });

    res.status(200).json({
      success: true,
      message: "Template updated successfully",
      template,
    });
  } catch (error) {
    logger.error("Error updating template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update template",
    });
  }
};

export const deleteTemplate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = TemplateService.deleteTemplate(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: `Template with ID '${id}' not found`,
      });
      return;
    }

    logger.info("Template deleted", { templateId: id });

    res.status(200).json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting template:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete template",
    });
  }
};
