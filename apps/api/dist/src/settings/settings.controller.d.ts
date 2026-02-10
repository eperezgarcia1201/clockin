import type { RequestWithUser } from "../auth/auth.types";
import { SettingsService } from "./settings.service";
import { UpdateSettingsDto } from "./dto/update-settings.dto";
export declare class SettingsController {
    private readonly settings;
    constructor(settings: SettingsService);
    get(req: RequestWithUser): Promise<{}>;
    update(req: RequestWithUser, dto: UpdateSettingsDto): Promise<{}>;
}
