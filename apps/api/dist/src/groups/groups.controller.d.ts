import type { RequestWithUser } from "../auth/auth.types";
import { CreateGroupDto } from "./dto/create-group.dto";
import { GroupsService } from "./groups.service";
export declare class GroupsController {
    private readonly groups;
    constructor(groups: GroupsService);
    list(req: RequestWithUser): Promise<{
        groups: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            officeId: string | null;
        }[];
    }>;
    create(req: RequestWithUser, dto: CreateGroupDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        officeId: string | null;
    }>;
}
