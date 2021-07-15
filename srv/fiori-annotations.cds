using { ezfiori as ezf } from '../db/schema';

annotate ezf.AppData with @(
    UI: {
        SelectionFields: [ appId, AppName, BusinessCatalog, RoleNameCombined ],
        LineItem: [
            {Value: appId},
            {Value: AppName},
            {Value: RoleNameCombined}
        ]
    },
);