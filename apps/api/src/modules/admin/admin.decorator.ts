import { SetMetadata } from "@nestjs/common";

export const ADMIN_REQUIRED = "adminRequired";
export const RequireAdmin = () => SetMetadata(ADMIN_REQUIRED, true);