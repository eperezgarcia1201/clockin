export declare class CreateEmployeeDto {
    fullName: string;
    displayName?: string;
    email?: string;
    pin?: string;
    hourlyRate?: number;
    officeId?: string;
    groupId?: string;
    isManager?: boolean;
    isOwnerManager?: boolean;
    managerPermissions?: string[];
    isAdmin?: boolean;
    isTimeAdmin?: boolean;
    isReports?: boolean;
    isServer?: boolean;
    isKitchenManager?: boolean;
    disabled?: boolean;
}
