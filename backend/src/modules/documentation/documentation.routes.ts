import { Router } from "express";
import { 
  getDocumentations, 
  getDocumentationById, 
  createDocumentation, 
  updateDocumentation, 
  deleteDocumentation 
} from "./documentation.controller";
import { authMiddleware } from "../../shared/middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", getDocumentations);
router.get("/:id", getDocumentationById);
router.post("/", createDocumentation);
router.patch("/:id", updateDocumentation);
router.delete("/:id", deleteDocumentation);

export default router;
