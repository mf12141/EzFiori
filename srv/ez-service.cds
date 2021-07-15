using {ezfiori as ezf} from '../db/schema';

service EzFioriService @(path : '/EzFiori') {
    entity AppData  as
        projection on ezf.AppData;

    entity Requests as 
        projection on ezf.Requests;

    entity ReqItems as
        projection on ezf.ReqItems;

    entity Personas as
        projection on ezf.Personas;

    entity Teams as
        projection on ezf.Teams;

    entity RelatedApps as
        projection on ezf.RelatedApps;

    action submitApp(appId : AppData.appId);
}
