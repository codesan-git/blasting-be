import { Request, Response } from "express";
import { TemplateService } from "../services/template.service";
import { ChannelType, TemplateType } from "../types/template.types";
import logger from "../utils/logger";

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

    res.status(200).json({
      success: true,
      count: templates.length,
      templates,
    });
  } catch (error) {
    logger.error("Error getting templates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get templates",
    });
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

export const createTemplate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id, name, type, channel, subject, body, variables } = req.body;

    if (!id || !name || !type || !channel || !body) {
      res.status(400).json({
        success: false,
        message: "Missing required fields: id, name, type, channel, body",
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
      channel,
      subject,
      body,
      variables: variables || [],
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
