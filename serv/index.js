const logging = require('@sap/logging');
const express = require('express');

const app = express();
const SapCfAxios = require('sap-cf-axios').default;

const passport = require('passport');
const xsenv = require('@sap/xsenv');
const JWTStrategy = require('@sap/xssec').JWTStrategy;

const dFioriAppLibrary = SapCfAxios('FioriAppLibrary');
const dEzFiori = SapCfAxios('EzFiori');

const appContext = logging.createAppContext();
const services = xsenv.getServices({ uaa: 'EzFiori-xsuaa-service' });

app.use(logging.middleware({ appContext: appContext, logNetwork: true }));
app.use(express.json());

passport.use(new JWTStrategy(services.uaa));

app.use(passport.initialize());
app.use(passport.authenticate('JWT', { session: false }));

app.get('/loadFioriAppData', async function (req, res) {
    //var logger = req.loggingContext.getLogger('/Application/FioriAppLibrary');
    const authorization = req.headers.authorization;
    console.log("*****AUTHORIZATION HEADERS*****");
    console.log(authorization)
    console.log('Fetching data from Fiori Apps Data ...');
    let sUrl = req.query.Uri;
    try {
        sUrl = decodeURI(sUrl);
    } catch (e) { // catches a malformed URI
        console.error(e);
    }
    try {
        const response = await dFioriAppLibrary({
            method: 'GET',
            url: sUrl,
            params: {
                "$format": 'json'
            },
            headers: {
                "content-type": "application/json",
                "Authorization": authorization
            }
        });
        const oData = response.data;
        const aRecords = oData.d.results;
        const oResult = {};
        oResult.records = aRecords.length;
        res.send(oResult);
        for (var i = 0; i < aRecords.length; i++) {
            const oRecord = aRecords[i];
            delete oRecord.__metadata;
            oRecord.origId = oRecord.Id;
            delete oRecord.Id;
            try {
                // Get Related Apps
                const relatedAppUrl = '/Details(fioriId=\'' + oRecord.appId + '\',releaseId=\'S20OP\')/Related_Apps';
                const relatedResponse = await dFioriAppLibrary({
                    method: 'GET',
                    url: relatedAppUrl,
                    params: {
                        "$format": 'json'
                    },
                    headers: {
                        "content-type": "application/json",
                        "Authorization": authorization
                    }
                });
                const relatedOData = relatedResponse.data;
                const aRelatedRecords = relatedOData.d.results;
                for (var j = 0; j < aRelatedRecords.length; j++) {
                    const oRelatedRecord = aRelatedRecords[j];
                    const oRelRecord = {};
                    oRelRecord.origApp = oRelatedRecord.currentFioriId;
                    oRelRecord.appId = oRelatedRecord.FioriId;
                    oRelRecord.relationType = oRelatedRecord.relationType;
                    oRelRecord.appName = oRelatedRecord.AppName;
                    oRelRecord.currentReleaseId = oRelatedRecord.currentReleaseId;
                    oRelRecord.requiredReleaseId = oRelatedRecord.requiredReleaseId;
                    try {
                        await dEzFiori({
                            method: 'POST',
                            url: "/RelatedApps",
                            data: oRelRecord,
                            headers: {
                                "content-type": "application/json",
                            },
                        });
                    } catch (error) {
                        console.log('Updating Related Apps failed ...');
                        console.log(error);
                    }
                }
            } catch (error) {
                console.log('Related apps call failed ...');
                console.log(error);
            }
            try {
                await dEzFiori({
                    method: 'POST',
                    url: "/AppData",
                    data: oRecord,
                    headers: {
                        "content-type": "application/json",
                    },
                });
            } catch (error) {
                console.log('Request failed ...');
                console.log(error);
            }
        }
    } catch (error) {
        console.log('Request failed ...');
        console.log(error);
        const oReturn = {};
        oReturn.error = error;
        res.send(oReturn);
    }
});

app.get('/user', function (req, res) {
    var user = req.user;
    res.send(user.id);
});

app.get('/demo', function (req, res) {
    var logger = req.loggingContext.getLogger('/Application/Network');
    var tracer = req.loggingContext.getTracer(__filename);

    logger.info('Retrieving demo greeting ...');
    tracer.info('Processing GET request to /demo');

    res.send('Hello World');
});

app.get('/missingApps', async function (req, res) {
    let sPersona = req.query.persona.replace(/'/g, '');
    const aReturn = await getMissingRequestApps(sPersona, dEzFiori);
    res.send(JSON.stringify(aReturn));
});

app.get('/getFioriRequest', async function (req, res) {
    let sPersona = req.query.persona.replace(/'/g, '');
    const response = await getFullRequest(sPersona, dEzFiori);
    res.send(JSON.stringify(response));
});

app.post('/updateFioriRequest', async function (req, res) {
    const oRequest = req.body;
    const aReturn = await updateRequest(oRequest, dEzFiori, req.user.id);
    res.send(JSON.stringify(aReturn));
});

app.post('/postJSON', (req, res) => {
    const oData = req.body;
    oData.returnMessage = "I've done something";
    res.send(JSON.stringify(oData));
});

app.post('/deleteFioriRequest', async function (req, res) {
    let oData = req.body;
    const sPersona = oData.businessPersona;
    const response = await deleteFullRequest(sPersona, dEzFiori);
    let oResponse = {};
    oResponse.status = response.status;
    oResponse.statusText = response.statusText;
    oResponse.errorMessage = response.errorMessage;
    res.send(JSON.stringify(oResponse));
});

const port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log('EzFiori listening on port ' + port);
});

async function getRequest(sPersona, dEzFiori) {
    const oPersona = await getPersona(sPersona, dEzFiori);
    if (oPersona.errorMessage) {
        return oPersona;
    }
    const requestUrl = '/Requests?$filter=businessPersona_id eq ' + oPersona.id; // The GUID doesn't use quotes
    try {
        const response = await dEzFiori({
            method: 'GET',
            url: requestUrl,
            params: {
                "$format": 'json'
            },
            headers: {
                "content-type": "application/json"
            }
        });
        if (response.data.value.length > 0) {
            return response.data.value[0];
        } else {
            const oError = {};
            oError.errorMessage = 'The Request ID did not exist.';
            return oError;
        }
    } catch (error) {
        console.log('Getting Request failed ...');
        console.log(error);
        const oError = {};
        oError.errorMessage = 'There is no quest that exists.';
        return oError;
    }
}

async function addRequestApps(gRequest, aAddApps, dEzFiori, sUser) {
    const aExistingRequestApps = await getRequestedApps(gRequest, dEzFiori);
    for (var i = 0; i < aAddApps.length; i++) {
        // Check if app exist
        const sAppId = aAddApps[i];
        let bExists = false;
        for (var j = 0; j < aExistingRequestApps.length; j++) {
            const oApp = aExistingRequestApps[j];
            if (oApp.appId === sAppId) bExists = true;
        }
        if (!bExists) {
            // Add Record
            const response = await createRequestItem(gRequest, sAppId, dEzFiori, sUser);
        }
    }
}

async function deleteRequest(gRequestId, dEzFiori) {
    const oBody = {};
    oBody.id = gRequestId;
    const url = '/Requests(id=' + oBody.id + ')';
    try {
        const response = await dEzFiori({
            method: 'DELETE',
            url: url,
            headers: {
                "content-type": "application/json",
            },
        });
        return response;
    } catch (error) {
        console.log('Request delete failed ...');
        console.log(error);
        const oError = {};
        oError.errorMessage = 'Could not delete request.';
        return oError;
    }
}

async function deletePersona(gPersonaId, dEzFiori) {
    const oBody = {};
    oBody.id = gPersonaId;
    const url = '/Personas(id=' + oBody.id + ')';
    try {
        const response = await dEzFiori({
            method: 'DELETE',
            url: url,
            headers: {
                "content-type": "application/json",
            },
        });
        return response;
    } catch (error) {
        console.log('Persona delete failed ...');
        console.log(error);
        const oError = {};
        oError.errorMessage = 'Could not delete persona.';
        return oError;
    }
}

async function deleteRequestApps(gRequest, aDeleteApps, dEzFiori) {
    const aExistingRequestApps = await getRequestedApps(gRequest, dEzFiori);
    for (var i = 0; i < aDeleteApps.length; i++) {
        // Check if app exist
        const sAppId = aDeleteApps[i];
        let bExists = false;
        for (var j = 0; j < aExistingRequestApps.length; j++) {
            const oApp = aExistingRequestApps[j];
            if (oApp.appId === sAppId) bExists = true;
        }
        if (bExists) {
            // Delete Record
            const response = await deleteRequestItem(gRequest, sAppId, dEzFiori);
            return response;
        }
    }
}

async function getAppGUIDFromAppId(sAppId, dEzFiori) {
    const url = '/AppData?$filter=appId eq \'' + sAppId + '\'';
    try {
        const response = await dEzFiori({
            method: 'GET',
            url: url,
            params: {
                "$format": 'json'
            },
            headers: {
                "content-type": "application/json"
            }
        });
        if (response.data.value.length > 0) {
            return response.data.value[0].id;
        } else {
            const oError = {};
            oError.errorMessage = 'The persona did not exist.';
            return 0;
        }
    } catch (error) {
        console.log('Getting App GUID failed ...');
        console.log(error);
        return 0;
    }
}

async function getAppInfoFromAppGUID(gAppGUID, dEzFiori) {
    const url = '/AppData?$filter=id eq ' + gAppGUID;
    try {
        const response = await dEzFiori({
            method: 'GET',
            url: url,
            params: {
                "$format": 'json'
            },
            headers: {
                "content-type": "application/json"
            }
        });
        if (response.data.value.length > 0) {
            let oFullApp = response.data.value[0];
            let oAppInfo = {};
            oAppInfo.id = gAppGUID;
            oAppInfo.appId = oFullApp.appId;
            oAppInfo.AppName = oFullApp.AppName;
            oAppInfo.ApplicationType = oFullApp.ApplicationType;
            return oAppInfo;
        } else {
            const oError = {};
            oError.errorMessage = 'The App Info did not exist.';
            return oError;
        }
    } catch (error) {
        console.log('Getting App Id failed ...');
        console.log(error);
        const oError = {};
        oError.errorMessage = 'The App Info did not exist.';
        return oError;
    }
}

async function createRequestItem(gRequest, sAppId, dEzFiori, sUser) {
    const url = '/ReqItems';
    const oRequest = {};
    oRequest.createdBy = sUser;
    oRequest.parent_id = gRequest;
    oRequest.appId_id = await getAppGUIDFromAppId(sAppId, dEzFiori);
    if (oRequest.appId_id !== 0) {
        try {
            const response = await dEzFiori({
                method: 'POST',
                url: url,
                data: oRequest,
                headers: {
                    "content-type": "application/json",
                },
            });
            if (response.status == '201') {
                // Success
                return response.data;
            } else {
                response.errorMessage = 'Could not create request item';
                return response;
            }
        } catch (error) {
            console.log('Request Item create failed ...');
            console.log(error);
            const oError = {};
            oError.errorMessage = 'Could not create request item.';
            return oError;
        }
    } else {
        const oError = {};
        oError.errorMessage = 'Could not create request item.';
        return oError;
    }
}

async function deleteRequestItem(gRequest, sAppId, dEzFiori) {
    const oItem = await getRequestItem(gRequest, sAppId, dEzFiori);
    const url = '/ReqItems(pos=' + oItem.pos + ',parent_id=' + gRequest + ')';
    try {
        let response = await dEzFiori({
            method: 'DELETE',
            url: url,
            headers: {
                "content-type": "application/json",
            },
        });
        return response;
    } catch (error) {
        console.log('Request Item delete failed ...');
        console.log(error);
        const oError = {};
        oError.errorMessage = 'Could not delete request item.';
        return oError;
    }
}

async function getRequestItem(gRequest, sAppId, dEzFiori) {
    const url = '/ReqItems?$filter=parent_id eq ' + gRequest + ' and appId_id eq ' + await getAppGUIDFromAppId(sAppId, dEzFiori);
    try {
        const response = await dEzFiori({
            method: 'GET',
            url: url,
            headers: {
                "content-type": "application/json",
            },
        });
        if (response.data.value.length > 0) {
            return response.data.value[0];
        } else {
            const oError = {};
            oError.errorMessage = 'The Request Item did not exist.';
            return oError;
        }
    } catch (error) {
        console.log('Get Request Item failed ...');
        console.log(error);
        const oError = {};
        oError.errorMessage = 'Could not get Request Item.';
        return oError;
    }
}

async function updateRequest(oRequest, dEzFiori, sUser) {
    // Check if persona exist
    let oPersona = await getPersona(oRequest.persona.businessPersona, dEzFiori);
    if (oPersona.errorMessage) {
        // Create Persona
        oPersona = await createPersona(oRequest.persona, dEzFiori, sUser);
    }
    // Check if request exists
    let oIRequest = await getRequest(oPersona.businessPersona, dEzFiori);
    let gIRequest = oIRequest.id;
    if (oIRequest.errorMessage) {
        let oCRequest = {};
        oCRequest.businessPersona_id = oPersona.id;
        oCRequest.createdBy = sUser;
        gIRequest = await createRequest(oCRequest, dEzFiori, sUser);
    }
    if (oRequest.add) {
        await addRequestApps(gIRequest, oRequest.add, dEzFiori, sUser);
    }
    if (oRequest.delete) {
        await deleteRequestApps(gIRequest, oRequest.delete, dEzFiori);
    }
    return await getFullRequest(oPersona.businessPersona, dEzFiori);
}

async function createPersona(oPersona, dEzFiori, sUser) {
    const url = '/Personas';
    try {
        oPersona.createdBy = sUser;
        const response = await dEzFiori({
            method: 'POST',
            url: url,
            data: oPersona,
            headers: {
                "content-type": "application/json",
            },
        });
        if (response.status == '201') {
            // Success
            return await getPersona(oPersona.businessPersona, dEzFiori);
        } else {
            response.errorMessage = 'Call to create Persona failed.';
            return response;
        }
    } catch (error) {
        console.log('Persona Create Request failed ...');
        console.log(error);
        const oError = {};
        oError.errorMessage = 'Could not create Persona.';
        return oError;
    }
}

async function createRequest(oRequest, dEzFiori, sUser) {
    const url = '/Requests';
    try {
        oRequest.createdBy = sUser;
        const response = await dEzFiori({
            method: 'POST',
            url: url,
            data: oRequest,
            headers: {
                "content-type": "application/json",
            },
        });
        if (response.status == '201') {
            // Success
            return response.data.id;
        } else {
            response.errorMessage = 'Call to create Persona failed.';
            return 0;
        }
    } catch (error) {
        console.log('Create Request failed ...');
        console.log(error);
        const oError = {};
        oError.errorMessage = 'Could not create Request.';
        return oError;
    }
}

async function getPersona(sPersona, dEzFiori) {
    const personasUrl = '/Personas?$filter=businessPersona eq \'' + sPersona + '\'';
    const response = await dEzFiori({
        method: 'GET',
        url: personasUrl,
        params: {
            "$format": 'json'
        },
        headers: {
            "content-type": "application/json"
        }
    });
    if (response.data.value.length > 0) {
        return response.data.value[0];
    } else {
        const oError = {};
        oError.errorMessage = 'The persona did not exist.';
        return oError;
    }
}

async function deleteFullRequest(sPersona, dEzFiori) {
    let oPersona = await getPersona(sPersona, dEzFiori);
    if (!oPersona.errorMessage) {
        const oIRequest = await getRequest(sPersona, dEzFiori);
        if (!oIRequest.errorMessage) {
            const aRequestApps = await getRequestedApps(oIRequest.id, dEzFiori);
            for (var i = 0; i < aRequestApps.length; i++) {
                await deleteRequestItem(oIRequest.id, aRequestApps[i].appId, dEzFiori);
            }
            const response = await deleteRequest(oIRequest.id, dEzFiori);
            await deletePersona(oPersona.id, dEzFiori);
            return response;
        } else {
            return oIRequest;
        }
    } else { return oPersona; }
}

async function getFullRequest(sPersona, dEzFiori) {
    let oPersona = await getPersona(sPersona, dEzFiori);
    let oError = {};
    if (oPersona.errorMessage) {
        oError.errorMessage = oPersona.errorMessage;
        return oError;
    }
    const oIRequest = await getRequest(sPersona, dEzFiori);
    if (oIRequest.id === 0) {
        oError.errorMessage = 'The request did not exist';
        return oError;
    }
    const aRequestApps = await getRequestedApps(oIRequest.id, dEzFiori);
    const aMissingApps = await getMissingRequestApps(sPersona, dEzFiori);
    let oRequest = {};
    oRequest.persona = oPersona;
    oRequest.request = oIRequest;
    oRequest.apps = aRequestApps;
    oRequest.missing = aMissingApps;
    return oRequest;
}

async function getMissingRequestApps(sPersona, dEzFiori) {
    const oIRequest = await getRequest(sPersona, dEzFiori);
    const oError = {};
    if (oIRequest.errorMessage) {
        oError.errorMessage = 'Unable to get request id';
        return oError;
    } else {
        const aRequestApps = await getRequestedApps(oIRequest.id, dEzFiori);
        const aMissing = await getMissingApps(aRequestApps, dEzFiori);
        return aMissing;
    }
}

async function getMissingApps(aApps, dEzFiori) {
    const oMissing = {};
    const aReturn = [];
    for (let i = 0; i < aApps.length; i++) {
        // Get all Related Apps
        const sApp = aApps[i].appId;
        const aRelatedApps = await getRelatedApps(sApp, dEzFiori);
        for (let j = 0; j < aRelatedApps.length; j++) {
            oMissing[aRelatedApps[j].appId] = aRelatedApps[j];
        }
    }
    // Remove Apps on original list
    for (let i = 0; i < aApps.length; i++) {
        delete oMissing[aApps[i].appId];
    }
    for (var key in oMissing) {
        aReturn.push(oMissing[key]);
    }
    return aReturn;
}

async function getRelatedApps(sApp, dEzFiori) {
    // Pick up related apps
    const relatedAppUrl = '/RelatedApps?$filter=origApp eq \'' + sApp + '\'';
    let aRelatedApps = [];
    const relatedResponse = await dEzFiori({
        method: 'GET',
        url: relatedAppUrl,
        params: {
            "$format": 'json'
        },
        headers: {
            "content-type": "application/json"
        }
    });
    if (relatedResponse.status == '200') {
        aRelatedApps = relatedResponse.data.value;
        for (let i = 0; i < aRelatedApps.length; i++) {
            let oRelatedApp = aRelatedApps[i];
            delete oRelatedApp.createdAt;
            delete oRelatedApp.createdBy;
            delete oRelatedApp.modifiedBy;
            delete oRelatedApp.modifiedAt;
        }
    }
    return aRelatedApps;
}

async function getRequestedApps(gRequest, dEzFiori) {
    // Pick up related apps
    const url = '/ReqItems?$filter=parent_id eq ' + gRequest;
    const aResults = [];
    try {
        const response = await dEzFiori({
            method: 'GET',
            url: url,
            params: {
                "$format": 'json'
            },
            headers: {
                "content-type": "application/json"
            }
        });
        var aApps = response.data.value;
        for (var i = 0; i < aApps.length; i++) {
            const oAppInfo = await getAppInfoFromAppGUID(aApps[i].appId_id, dEzFiori);
            if (!oAppInfo.errorMessage) {
                aResults.push(oAppInfo);
            }
        }
        return aResults;
    } catch (error) {
        console.log('Requested App Request failed ...');
        console.log(error);
        const oError = {};
        oError.errorMessage = 'Could not get requested apps.';
        return aResults;
    }
}