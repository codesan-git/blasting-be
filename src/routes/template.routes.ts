// src/routes/template.routes.ts
import { Router } from "express";
import {
  getAllTemplates,
  getTemplateById,
  getTemplateRequirements,
  validateTemplateVariables,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../controllers/template.controller";

const router = Router();

// Get all templates
router.get("/", getAllTemplates);

// Get template by ID
router.get("/:id", getTemplateById);

// Get template variable requirements
router.get("/:id/requirements", getTemplateRequirements);

// Validate variables against template
router.post("/:id/validate", validateTemplateVariables);

// Create template
router.post("/", createTemplate);

// Update template
router.put("/:id", updateTemplate);

// Delete template
router.delete("/:id", deleteTemplate);

export default router;
