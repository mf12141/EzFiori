using { managed, sap } from '@sap/cds/common';
namespace ezfiori;
entity AppData:managed{
    key id: UUID;
    origId                           : String(36) @title:'Original ID';
    productInstanceBE                : String(1000);
    releaseGroupText                 : String(200);
    appId                            : String(500) @title: 'appID';
    releaseId                        : String(30);
    releaseName                      : String(200);
    otherReleases                    : String(5000);
    AppNameAll                       : String(5000);
    RoleNameCombined                 : String(5000);
    SolutionsCapabilityCombined      : String(5000);
    SolutionsCapabilityIDCombined    : String(5000);
    availabilityInFaaSCombined       : String(5000);
    LobCombined                      : String(5000);
    IndustryCombined                 : String(5000);
    PCDCombined                      : String(5000);
    ACHCombined                      : String(5000);
    ACHLevel2Combined                : String(5000);
    DatabaseCombined                 : String(5000);
    PrimaryPVOfficialNameCombined    : String(5000);
    PVFrontendCombined               : String(5000);
    PVBackendCombined                : String(5000);
    AppTypeCombined                  : String(5000);
    TechnicalCatalogNameCombined     : String(5000);
    BusinessCatalogNameCombined      : LargeString;
    FrontendSCVCombined              : String(5000);
    HANASCVCombined                  : String(5000);
    BackendSCVCombined               : String(5000);
    releaseGroupTextCombined         : String(5000);
    PortfolioCategoryCombined        : String(5000);
    ProductCategoryDetails           : String(5000);
    RoleDescription                  : String(5000);
    BusinessCatalog                  : String(5000);
    TechnicalCatalog                 : String(500);
    FitAnalysisACH                   : String(100);
    PVBackend                        : String(1000);
    PVFrontend                       : String(1000);
    AppTypeLevel                     : String(10);
    productInstanceHANA              : String(1000);
    ApplicationComponentText         : String(1000);
    FormFactors                      : String(100);
    PortfolioCategoryIV              : String(1000);
    PortfolioCategoryImp             : String(1000);
    AppName                          : String(5000);
    ApplicationType                  : String(500);
    BSPName                          : String(50);
    BSPApplicationURL                : String(300);
    NewRoleName                      : String(500);
    RoleName                         : String(500);
    GTMLoBName                       : String(500);
    ProductCategory                  : String(500);
    ApplicationComponent             : String(500);
    Database                         : String(500);
    BackendSoftwareComponentVersions : String(500);
    FrontendSoftwareComponent        : String(500);
    HANASoftwareComponentVersions    : String(500);
    RoleCombinedToolTipDescription   : String(5000);
    BusinessRoleOAMName              : String(5000);
    InnovationsCombined              : String(5000);
    IntentsCombined                  : String(5000);
    BSPNameCombined                  : String(5000);
    ODataServicesCombined            : String(5000);
    WebDynproComponentNameCombined   : String(5000);
    TCodesCombined                   : String(5000);
    RoleNameCombinedOnlyName         : String(5000);
    BusinessGroupNameCombined        : String(5000);
    BusinessGroupDescriptionCombined : String(5000);
    BExQueryNameCombined             : String(5000);
    BExQueryDescriptionCombined      : String(5000);
    SAPUI5ComponentIdCombined        : String(5000);
    BusinessRoleNameCombined         : String(5000);
    BusinessRoleDescriptionCombined  : String(5000);
    FitAnalysisACHCombined           : String(5000);
    FormFactorsCombined              : String(5000);
    UITechnologyCombined             : String(5000);
    AppNameCombined                  : String(5000);
    productInstanceUI                : String(1000);
    ScopeItemID                      : String(5000);
    HighlightedAppsCombined          : String(5000);
    HighlightAppsSorterL1            : String(10);
    HighlightAppsSorterL2            : String(10);
    ScopeItemDetailsCombined         : String(5000);
    SolutionsCapabilityGUIDCombined  : String(5000);
    ScopeItemGroupCombined           : String(5000);
    ODataV4ServiceGroupsCombined     : String(5000);
    AppLauncherTitleCombined         : String;
    HighlightApps                    : String(500);
    BCMultiLanguageCombined          : LargeString;
    BRMultiLanguageCombined          : LargeString;
    BGMultiLanguageCombined          : LargeString;
    TileMultiLanguageCombined        : LargeString;
    TCMultiLanguageCombined          : LargeString;
}
entity Requests:managed{
    key id: UUID;
    items: Composition of many ReqItems on items.parent = $self;
    businessPersona: Association to Personas;
}
entity ReqItems:managed{
    key pos: UUID;
    key parent: Association to Requests;
    appId: Association to AppData;
}
entity Personas:managed{
    key id: UUID;
    businessPersona: String(100);
    team: Association to Teams;
    description: String(5000);
}
entity Teams:managed {
    key id: UUID;
    teamName: String(100);
    functionalArea: String(100);
}

entity Navigations:managed {
    key appId: Association to AppData;
    key navAppId: Association to AppData;
    semanticObject: String(100);
    action: String(100);
    parameters: String(5000);
}

entity RelatedApps:managed {
    key id: UUID;
    origApp: String(100);
    appId: String(100);
    relationType: String(100);
    appName: String(500);
    currentReleaseId: String(100);
    requiredReleaseId: String(100);
}