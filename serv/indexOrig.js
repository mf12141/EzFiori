const logging = require('@sap/logging');
const express = require('express');
const FormData = require('form-data');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

const app = express();
const SapCfAxios = require('sap-cf-axios').default;

const passport = require('passport');
const xsenv = require('@sap/xsenv');
const JWTStrategy = require('@sap/xssec').JWTStrategy;
const json2xls = require('json2xls');

const dFioriAppLibrary = SapCfAxios('FioriAppLibrary');
const dEzFiori = SapCfAxios('EzFiori');
//const bpmworkflowruntime = SapCfAxios('bpmworkflowruntime');
//const bpmrulesruntime = SapCfAxios('bpmrulesruntime222');
//const mailService = SapCfAxios('PO_HTTPS');

const appContext = logging.createAppContext();
const services = xsenv.getServices({ uaa: 'EzFiori-xsuaa-service' });
var _this = this;

app.use(logging.middleware({ appContext: appContext, logNetwork: true }));
app.use(express.json());

passport.use(new JWTStrategy(services.uaa));

app.use(passport.initialize());
app.use(passport.authenticate('JWT', { session: false }));
const sendEmail = async (req, res) => {
    const authorization = req.headers.authorization;
    try {
        const csvWriter = createCsvWriter({
            path: './file.csv',
            header: [
                { id: 'name', title: 'NAME' },
                { id: 'lang', title: 'LANGUAGE' }
            ]
        });
        const records = [
            { name: 'Bob', lang: 'French, English' },
            { name: 'Mary', lang: 'English' }
        ];

        csvWriter.writeRecords(records)       // returns a promise
            .then(() => {
                console.log('The CSV file was written successfully');

                var payload = {

                    FROM_FIELD: "gregory.hawkins@gmail.com",
                    TO_FIELD: "gregory.hawkins@gmail.com",
                    CC_FIELD: "gregory.hawkins@gmail.com",
                    BCC_FIELD: "gregory.hawkins@gmail.com",
                    SUBJECT_FIELD: "Surcharged Test Mail",
                    MESSAGE_BODY: "Please find the atatched Result file with Auto approved items."
                };

                var emailData = new FormData();
                emailData.append("text", JSON.stringify([payload]));

                emailData.append('file', fs.createReadStream('./file.csv'));
                (async () => {

                    const formHeaders = emailData.getHeaders();

                    const response = await mailService({
                        method: 'POST',
                        url: "/RESTAdapter/SendEmailService",
                        data: emailData,

                        headers: {

                            "Authorization": authorization,
                            "Content-Type": formHeaders["content-type"]
                        },

                    });
                    res.send(response);
                })();
            });

        /*       });*/

    } catch (error) {

        console.log('Request failed ...');
        console.log(error);
        res.send(error.response.data);
    }
}
const handleRequest = async (req, res) => {
    // do the dummy request
    var logger = req.loggingContext.getLogger('/Application/Destination');
    const authorization = req.headers.authorization;
    console.log("*****AUTHORIZATION HEADERSS*****");
    console.log(authorization)
    try {
        var definitionId = "wfscapproval"; //Change to your workflow definition ID
        var uplData = {
            /*     context: {
                     Category: "FOOTBALL/SOCCER TRAINING",
                     ConditionType: "ZMMX",
                     Currency: "USD",
                     GrossFOB: 9.53,
                     Material: "TEST882987-800009",
                     PO: 9000000001,
                     POLine: 100,
                     Plant: 1088,
                     PurchaseOrderType: "ZS05",
                     PurchasingGroup: "GCH",
                     RequestorName: "T,Pimonporn",
                     SurchargeUnit: 0.1,
                     tempOutcome: "Auto Approved"
                 },*/
            "context": { "PO #": 6000005250, "PO line": 100, "Material": "CU5495-102", "Category": "WOMENS TRAINING", "Plant": 1025, "Gross FOB": 9.5, "Condition Type": "ZMMX", "Surcharge/unit": 0.1, "Currency": "USD", "tempOutcome": "Auto Approved", "Purchase Group": "GCH", "PurchaseOrderType": "ZP20" },
            definitionId: "wfscapproval"

        }
        var data = {
            definitionId: definitionId,
            context: uplData
        };
        console.log('Starting the request to bpmworkflowruntime destination ...');
        const response = await bpmworkflowruntime({
            method: 'POST',
            url: "/v1/workflow-instances",
            data: JSON.stringify(data),
            headers: {
                "content-type": "application/json",
                "Authorization": authorization,
                "xsrfHeaderName": "x-csrf-token"

                //"X-CSRF-Token": "f3f024853f1422f4-76XU5-D88QCX2mJ5Ppyef98mFS8"
            },

        });
        /*   console.log("RESPONSE GOT");
           var rKeys = [], rVals = [];
           var getKeys = function (obj) {
               var keys = [];
               for (var key in obj) {
   
                   rKeys.push(key);
                   rVals.push(obj[key]);
               }
               console.log(rKeys.join("----"));
               console.log(rVals.join("---"));
               return keys;
           }
           getKeys(response.data);*/

        res.send(response.data);
    } catch (error) {

        console.log('Request failed ...');
        console.log(error);
        res.reject(error);
    }
}
const getBusinessRules = async (req, res) => {
    // do the dummy request
    var logger = req.loggingContext.getLogger('/Application/Destination');
    const authorization = req.headers.authorization;
    console.log("*****AUTHORIZATION HEADERSS*****");
    console.log(authorization)
    try {
        var InputPayload = {
            // "__type__": "BR_Lookup_Object",
            // "inBusinessRule": sap.ushell.Container.getService("URLParsing").getHash(location.href).split("?")[0] //capturing app intent
            "RuleServiceId": "4113a0573bc8414b8e91a89cf1e738f0",
            "Vocabulary": [{
                "inputDO": {
                    "PurchasingGroup": "GCH"
                    //"SurchargeCondition": "ZMMX",
                    //"DocType": "ZS05"
                }
            }]
        };
        console.log('Starting the request to bpmrulesruntime destination ...');
        const response = await bpmrulesruntime({
            method: 'POST',

            url: "/rules-service/rest/v2/workingset-rule-services",
            data: JSON.stringify(InputPayload),
            headers: {
                "content-type": "application/json",
                "Authorization": authorization,

                "xsrfHeaderName": "x-csrf-token"
                // "X-CSRF-Token": "af71b8efe1b7fd72-kkrhUkUooM6QUOo63T0MOZaJbDQ"
            }

        });
        console.log("RESPONSE GOT");
        var rKeys = [], rVals = [];
        var getKeys = function (obj) {
            var keys = [];
            for (var key in obj) {

                rKeys.push(key);
                rVals.push(obj[key]);
            }
            console.log(rKeys.join("----"));
            console.log(rVals.join("---"));
            return keys;
        }
        getKeys(response.data);

        res.send(response.data);
    } catch (error) {

        console.log('Request failed ...');
        console.log(error);
        res.reject(error);
    }
}
const getSurcharges = async (req, res) => {
    // do the dummy request
    var logger = req.loggingContext.getLogger('/Application/Destination');
    const authorization = req.headers.authorization;
    console.log("*****AUTHORIZATION HEADER*****");
    console.log(authorization)
    try {
        console.log('Starting the request to nodeOdata destination ...');
        const response = await nodeOdata({
            method: 'GET',
            url: "/sap/opu/odata/sap/ZMMGW_PURCHASE_ORDER_SRV/ZCMM_PURCHASEORDER('6000003387')",
            params: {
                "$format": 'json'
            },
            headers: {
                "content-type": "application/json",
                "Authorization": authorization
            }
        });
        console.log("RESPONSE GOT");
        var rKeys = [], rVals = [];
        var getKeys = function (obj) {
            var keys = [];
            for (var key in obj) {

                rKeys.push(key);
                rVals.push(obj[key]);
            }
            return keys;
        }
        getKeys(response.data);

        res.send(response.data.d);
    } catch (error) {

        console.log('Request failed ...');
        console.log(error);
        res.reject(error);
    }
}
const validatePoData = async (req, res) => {
    res.send("File accepted.") //comment this line to check validations until result file is done
    console.log(req);
    console.log(req.body)
    const poDataReq = req.body;
    const authorization = req.headers.authorization;
    let uniqueList = []; var postData = [];
    const csrfRes = await nodeOdata({
        method: 'GET',
        url: "/sap/opu/odata/sap/ZMMGW_PURCHASE_ORDER_SRV/$metadata",

        headers: {
            "content-type": "application/json",
            "Authorization": authorization,
            "x-csrf-token": "fetch"
        }
    });
    var csrfToken = csrfRes.headers["x-csrf-token"];
    var cookies = '"';
    for (var ic = 0; ic < csrfRes.headers["set-cookie"].length; ic++) {
        cookies += csrfRes.headers["set-cookie"][ic] + ";";
    }
    Array.prototype.contains = function (item) {
        let filtered_item = this.filter((i) => {
            return i["PO #"] === item["PO #"] && i["PO line"] === item["PO line"] && i["Material"] === item["Material"] && i["Condition Type"] === item["Condition Type"] && i["Surcharge/unit"] === item["Surcharge/unit"]
        });
        return !!filtered_item.length;
    }
    var pushToUniqueList = function (item) {
        if (!uniqueList.contains(item)) uniqueList.push(item);
    }
    var sFilter = "";
    for (var i = 0; i < poDataReq.length; i++) {

        if (uniqueList.contains(poDataReq[i])) {
            (poDataReq[i]).tempOutcome = "It is a duplicate";

        } else {
            pushToUniqueList(poDataReq[i]);
            if (poDataReq[i]["Condition Type"] === "ZNTL" || poDataReq[i]["Condition Type"] === "ZDSR") {
                (poDataReq[i]).tempOutcome = "It is not a manual surcharge";
                continue;
            }

            if (sFilter.indexOf(poDataReq[i]["PO #"]) == -1) {
                if (sFilter === "") {
                    sFilter = "$filter=PurchaseOrder eq '" + poDataReq[i]["PO #"] + "'";
                } else {
                    sFilter = sFilter + " or PurchaseOrder eq '" + poDataReq[i]["PO #"] + "'";
                }
            }

        }

    }
    const url = "/sap/opu/odata/sap/ZMMGW_PURCHASE_ORDER_SRV/ZCMM_PURCHASEORDER?" + sFilter + "&$expand=to_PoItem%2Cto_PoItem%2Fto_prcdele";
    console.log("??===========URL IS============");
    console.log(url);
    try {
        console.log('Starting the request to nodeOdata destination ...');
        const response = await nodeOdata({
            method: 'GET',
            url: url,
            params: {
                "$format": 'json'
            },
            headers: {
                "content-type": "application/json",
                "Authorization": authorization
            }
        });
        console.log("RESPONSE GOT");
        var rKeys = [], rVals = [];
        var getKeys = function (obj) {
            var keys = [];
            for (var key in obj) {

                rKeys.push(key);
                rVals.push(obj[key]);
            }
            return keys;
        }

        console.log("RESPONSE IS::::");
        console.log(rKeys.join());
        console.log(rVals.join());
        getKeys(response.data.d);
        var poData = response.data.d.results;
        var poLineItems = [];
        var tempOutcome = '';
        var PurchasingGroup = '';
        var PurchaseOrderType = '';
        var Promo_Ind = "";
        var wfdata, wfRes, uplData;
        var definitionId = "wfscapproval"; //Change to your workflow definition ID
        var triggerWorkflow = function (poData) {
            /*   var uplData = {
   
                   "context": poData,
                   definitionId: "wfscapproval"
   
               }
               wfdata = {
                   definitionId: definitionId,
                   context: uplData
               };
               wfRes = await bpmworkflowruntime({
                   method: 'POST',
                   url: "/v1/workflow-instances",
                   data: JSON.stringify(wfdata),
                   headers: {
                       "content-type": "application/json",
                       "Authorization": authorization,
                       "xsrfHeaderName": "x-csrf-token"
   
                       //"X-CSRF-Token": "f3f024853f1422f4-76XU5-D88QCX2mJ5Ppyef98mFS8"
                   }
   
   
               });
               console.log(wfRes)*/
        };
        //sai
        var taskInstances = [];
        for (var i = 0; i < poDataReq.length; i++) {
            var calFOB = ((poDataReq[i]["Surcharge/unit"]) * (100)) / poDataReq[i]["Gross FOB"];
            poDataReq[i]["tempFOB"] = calFOB;
            if (poDataReq[i].tempOutcome != undefined) {
                continue;
            }
            poDataReq[i].tempOutcome = "";
            poDataReq[i]["Purchase Group"] = "";
            poDataReq[i].PurchaseOrderType = "";
            poDataReq[i].Promo_Ind = "";
            var prcDeleitm;
            for (var j = 0; j < poData.length; j++) {
                if (poDataReq[i]["PO #"] == poData[j].PurchaseOrder) {
                    poDataReq[i]["Purchase Group"] = poData[j].PurchasingGroup;
                    poDataReq[i]["Purchase Org"] = poData[j].PurchasingOrganization;
                    poDataReq[i]["Vendor"] = poData[j].Supplier;
                    poDataReq[i].PurchaseOrderType = poData[j].PurchaseOrderType;
                    poDataReq[i].Promo_Ind = poData[j].Promo_Ind;
                    poLineItems = [];
                    poLineItems = poData[j].to_PoItem.results;
                    for (var k = 0; k < poLineItems.length; k++) {

                        if (poDataReq[i]["PO line"] / 1 === poLineItems[k].PurchaseOrderItem / 1 && poDataReq[i]["Material"] === poLineItems[k].Material) {
                            var prcdele = poLineItems[k].to_prcdele.results;
                            prcDeleitm = "";
                            var pricingDocumentItem = prcdele[0].PricingDocumentItem;
                            for (var l = 0; l < prcdele.length; l++) {
                                if (poDataReq[i]["Condition Type"] === prcdele[l].ConditionType) {
                                    prcDeleitm = prcdele[l];
                                    break;
                                }
                            }
                            //approver business rules
                            var approver = "";
                            if (poDataReq[i]["Purchase Group"] != undefined && poDataReq[i].Promo_Ind != undefined && poDataReq[i].PurchaseOrderType != undefined && poDataReq[i]["Category"] != undefined) {
                                var InputAppPayload = {
                                    // "__type__": "BR_Lookup_Object",
                                    // "inBusinessRule": sap.ushell.Container.getService("URLParsing").getHash(location.href).split("?")[0] //capturing app intent
                                    "RuleServiceId": "233ae1d282da44c080312c21d2332cd2",
                                    "Vocabulary": [{
                                        "inputDO": {
                                            "PurchaseGroup": poDataReq[i]["Purchase Group"],
                                            "PromoOnlyIndicator": poDataReq[i].Promo_Ind,
                                            "DocType": poDataReq[i].PurchaseOrderType,
                                            "Category": poDataReq[i]["Category"]
                                            //  "PurchaseGroup": "GCH",
                                            // "PromoOnlyIndicator": "",
                                            // "DocType": "ZP20",
                                            // "Category":"WOMENS TRAINING"
                                        }
                                    }]

                                }
                                const brRulesAppResponse = await bpmrulesruntime({
                                    method: 'POST',

                                    url: "/rules-service/rest/v2/workingset-rule-services",
                                    data: JSON.stringify(InputAppPayload),
                                    headers: {
                                        "content-type": "application/json",
                                        "Authorization": authorization,

                                        "xsrfHeaderName": "x-csrf-token"
                                        // "X-CSRF-Token": "af71b8efe1b7fd72-kkrhUkUooM6QUOo63T0MOZaJbDQ"
                                    }

                                });
                                var brAppData = brRulesAppResponse.data;
                                console.log("br approver data");
                                console.log(InputAppPayload);
                                approver = brRulesAppResponse.data.Result[0].outputDO.ApproverEmail;
                            } else {
                                console.log("br approver input payload undefined");
                            }

                            if (approver == "") {
                                approver = "Saisankararao.Battula@nike.com,Pratyusha.panireddy@nike.com";
                            }
                            //end approver business rules
                            if (poDataReq[i]["Condition Type"] === "ZMSX" || poDataReq[i]["Condition Type"] === "ZVAX") {
                                poDataReq[i].tempOutcome = "Workflow";
                                var context;
                                if (prcDeleitm !== "") {
                                    context = {
                                        "Approver": approver,
                                        "PurchaseOrder": prcDeleitm.PurchaseOrder,
                                        "PurchaseOrderItem": prcDeleitm.PurchaseOrderItem,
                                        "PricingDocument": prcDeleitm.PricingDocument,
                                        "PricingDocumentItem": prcDeleitm.PricingDocumentItem,
                                        "PricingProcedureStep": prcDeleitm.PricingProcedureStep,
                                        "PricingProcedureCounter": prcDeleitm.PricingProcedureCounter,
                                        "ConditionType": prcDeleitm.ConditionType,
                                        "ConditionCalculationType": prcDeleitm.ConditionCalculationType,
                                        "ConditionRateValue": poDataReq[i]["Surcharge/unit"] + "",
                                        "ConditionCurrency": prcDeleitm.ConditionCurrency,
                                        "ConditionQuantityUnit": prcDeleitm.ConditionQuantityUnit,
                                        "ConditionOrigin": prcDeleitm.ConditionOrigin,
                                        "ConditionClass": prcDeleitm.ConditionClass,
                                        "Change_ID": "U",
                                        ...poDataReq[i]
                                    }
                                } else {
                                    context = {
                                        "Approver": approver,
                                        "PurchaseOrder": poDataReq[i]["PO #"] + "",
                                        "PurchaseOrderItem": poDataReq[i]["PO line"] + "",
                                        "ConditionType": poDataReq[i]["Condition Type"],
                                        "ConditionRateValue": Math.abs(poDataReq[i]["Surcharge/unit"]) + "",
                                        "ConditionCurrency": poDataReq[i].Currency,
                                        PricingDocumentItem: pricingDocumentItem,
                                        "Change_ID": "I",
                                        ...poDataReq[i]
                                    }
                                    poDataReq[i].tempOutcome = "Workflow Inserted AUTO";
                                }
                                var uplData = {

                                    "context": {
                                        ...context
                                    },
                                    definitionId: "wfscapproval"

                                }
                                wfdata = {
                                    definitionId: definitionId,
                                    context: uplData
                                };
                                wfRes = await bpmworkflowruntime({
                                    method: 'POST',
                                    url: "/v1/workflow-instances",
                                    data: JSON.stringify(wfdata),
                                    headers: {
                                        "content-type": "application/json",
                                        "Authorization": authorization,
                                        "xsrfHeaderName": "x-csrf-token"

                                        //"X-CSRF-Token": "f3f024853f1422f4-76XU5-D88QCX2mJ5Ppyef98mFS8"
                                    }

                                });
                                console.log(wfRes);
                                taskInstances.push(wfRes.data);
                                j = poData.length;
                                break;
                            } else if (!(poLineItems[k].PurchasingDocumentDeletionCode !== "L" && poLineItems[k].IsCompletelyDelivered !== true)) {
                                poDataReq[i].tempOutcome = "PO line not active in system";
                                j = poData.length;
                                break;
                            }
                            else if ((poLineItems[k].PO_Confirmation_Indicator === "X")) {
                                poDataReq[i].tempOutcome = "Subsequent documents already attached to PO line";
                                j = poData.length;
                                break;
                            }/* else {

                                if (prcDeleitm === undefined || prcDeleitm === "") {
                                    var poDataItem = {
                                        "PurchaseOrder": poDataReq[i]["PO #"] + "",
                                        "PurchaseOrderItem": poDataReq[i]["PO line"] + "",
                                        "ConditionType": poDataReq[i]["Condition Type"],
                                        "ConditionRateValue": Math.abs(poDataReq[i]["Surcharge/unit"]) + "",
                                        "ConditionCurrency": poDataReq[i].Currency,
                                        PricingDocumentItem: pricingDocumentItem,
                                        "Change_ID": "I"
                                    }
                                    var existingOrder = false;
                                    for (var pD = 0; pD < postData.length; pD++) {
                                        if (postData[pD].PurchaseOrder === poDataReq[i]["PO #"]) {
                                            existingOrder = true;
                                            postData[pD]["to_PoItem"].push({
                                                "PurchaseOrder": poDataReq[i]["PO #"] + "",
                                                "PurchaseOrderItem": poDataReq[i]["PO line"] + "",
                                                "to_prcdele": [poDataItem],
                                                "to_Itemnote": [

                                                ]
                                            })
                                            break;
                                        }
                                    }
                                    if (!existingOrder) {
                                        postData.push({
                                            "PurchaseOrder": poDataReq[i]["PO #"] + "",

                                            "to_PoItem": [
                                                {
                                                    "PurchaseOrder": poDataReq[i]["PO #"] + "",
                                                    "PurchaseOrderItem": poDataReq[i]["PO line"] + "",
                                                    "to_prcdele": [poDataItem],
                                                    "to_Itemnote": [

                                                    ]
                                                }
                                            ]
                                        });
                                    }

                                    poDataReq[i].tempOutcome = "Condition Type Inserted"
                                    j = poData.length;
                                    break;
                                }
                            }*/
                            /*else if (poLineItems[k]["gac_date"] == null) {
                               poDataReq[i].tempOutcome = "Invalid GAC Date";
                                j = poData.length;
                               break;
                           } else if (poLineItems[k]["gac_date"] !== null && (new Date(poLineItems[k]["gac_date"].split("(")[1].split(")")[0] / 1).getTime() - new Date().getTime()) / (1000 * 3600 * 24) < 21) {
                               poDataReq[i].tempOutcome = " PO line is less than 21 days to GAC";
                                j = poData.length;
                               break;
                           }*/
                            poDataReq[i].tempOutcome = "BR initiated";
                            //  that.validateBR(i);
                            var InputPayload = {
                                // "__type__": "BR_Lookup_Object",
                                // "inBusinessRule": sap.ushell.Container.getService("URLParsing").getHash(location.href).split("?")[0] //capturing app intent
                                "RuleServiceId": "4113a0573bc8414b8e91a89cf1e738f0",
                                "Vocabulary": [{
                                    "inputDO": {
                                        "PurchasingGroup": poDataReq[i]["Purchase Group"],
                                        "SurchargeCondition": poDataReq[i]["Condition Type"],
                                        "DocType": poDataReq[i].PurchaseOrderType
                                    }
                                }]

                            }
                            const brRulesResponse = await bpmrulesruntime({
                                method: 'POST',

                                url: "/rules-service/rest/v2/workingset-rule-services",
                                data: JSON.stringify(InputPayload),
                                headers: {
                                    "content-type": "application/json",
                                    "Authorization": authorization,

                                    "xsrfHeaderName": "x-csrf-token"
                                    // "X-CSRF-Token": "af71b8efe1b7fd72-kkrhUkUooM6QUOo63T0MOZaJbDQ"
                                }

                            });
                            var brData = brRulesResponse.data;
                            if (brData != undefined && brData.Result.length > 0) {
                                if (brData.Result[0].outputDO.FOBApprovalLimit == "NA" || brData.Result[0].outputDO.FOBApprovalLimit == "") {
                                    poDataReq[i].tempOutcome = "NA";
                                } else {

                                    if (brData.Result[0].outputDO.FOBApprovalLimit === "Need" || calFOB >= parseInt(brData.Result[0].outputDO.FOBApprovalLimit)) {
                                        poDataReq[i].tempOutcome = "Workflow Triggered";
                                        var context;
                                        if (prcDeleitm !== "") {
                                            context = {
                                                "Approver": approver,
                                                "PurchaseOrder": prcDeleitm.PurchaseOrder,
                                                "PurchaseOrderItem": prcDeleitm.PurchaseOrderItem,
                                                "PricingDocument": prcDeleitm.PricingDocument,
                                                "PricingDocumentItem": prcDeleitm.PricingDocumentItem,
                                                "PricingProcedureStep": prcDeleitm.PricingProcedureStep,
                                                "PricingProcedureCounter": prcDeleitm.PricingProcedureCounter,
                                                "ConditionType": prcDeleitm.ConditionType,
                                                "ConditionCalculationType": prcDeleitm.ConditionCalculationType,
                                                "ConditionRateValue": poDataReq[i]["Surcharge/unit"] + "",
                                                "ConditionCurrency": prcDeleitm.ConditionCurrency,
                                                "ConditionQuantityUnit": prcDeleitm.ConditionQuantityUnit,
                                                "ConditionOrigin": prcDeleitm.ConditionOrigin,
                                                "ConditionClass": prcDeleitm.ConditionClass,
                                                "Change_ID": "U",
                                                ...poDataReq[i]
                                            }
                                        } else {
                                            context = {
                                                "Approver": approver,
                                                "PurchaseOrder": poDataReq[i]["PO #"] + "",
                                                "PurchaseOrderItem": poDataReq[i]["PO line"] + "",
                                                "ConditionType": poDataReq[i]["Condition Type"],
                                                "ConditionRateValue": Math.abs(poDataReq[i]["Surcharge/unit"]) + "",
                                                "ConditionCurrency": poDataReq[i].Currency,
                                                PricingDocumentItem: pricingDocumentItem,
                                                "Change_ID": "I",
                                                ...poDataReq[i]
                                            }
                                            poDataReq[i].tempOutcome = "Workflow Inserted price";
                                        }
                                        var uplData = {
                                            //"context": poDataReq[i],
                                            "context": {
                                                ...context
                                            },
                                            definitionId: "wfscapproval"

                                        }
                                        wfdata = {
                                            definitionId: definitionId,
                                            context: uplData
                                        };
                                        wfRes = await bpmworkflowruntime({
                                            method: 'POST',
                                            url: "/v1/workflow-instances",
                                            data: JSON.stringify(wfdata),
                                            headers: {
                                                "content-type": "application/json",
                                                "Authorization": authorization,
                                                "xsrfHeaderName": "x-csrf-token"

                                                //"X-CSRF-Token": "f3f024853f1422f4-76XU5-D88QCX2mJ5Ppyef98mFS8"
                                            }

                                        });
                                        console.log(wfRes);
                                        taskInstances.push(wfRes.data);

                                    } else if (brData.Result[0].outputDO.FOBApprovalLimit === "Auto" || calFOB < parseInt(brData.Result[0].outputDO.FOBApprovalLimit)) {
                                        poDataReq[i].tempOutcome = "Auto Approved";
                                        var poItem = poLineItems[k];
                                        /*  var poDataItem= {
                                             "PurchaseOrder": prcDeleitm.PurchaseOrder,
                                             "CreatedByUser": "Ppanir",
                                             "to_PoItem": [
                                                 {
                                                     "PurchaseOrder":prcDeleitm.PurchaseOrder,
                                                     "PurchaseOrderItem": prcDeleitm.PurchaseOrderItem,
                                                     "to_prcdele": [*/
                                        var poDataItem = {
                                            "PurchaseOrder": prcDeleitm.PurchaseOrder,
                                            "PurchaseOrderItem": prcDeleitm.PurchaseOrderItem,
                                            "PricingDocument": prcDeleitm.PricingDocument,
                                            "PricingDocumentItem": prcDeleitm.PricingDocumentItem,
                                            "PricingProcedureStep": prcDeleitm.PricingProcedureStep,
                                            "PricingProcedureCounter": prcDeleitm.PricingProcedureCounter,
                                            "ConditionType": prcDeleitm.ConditionType,
                                            "ConditionCalculationType": prcDeleitm.ConditionCalculationType,
                                            "ConditionRateValue": poDataReq[i]["Surcharge/unit"] + "",
                                            "ConditionCurrency": prcDeleitm.ConditionCurrency,
                                            "ConditionQuantityUnit": prcDeleitm.ConditionQuantityUnit,
                                            "ConditionOrigin": prcDeleitm.ConditionOrigin,
                                            "ConditionClass": prcDeleitm.ConditionClass,
                                            "Change_ID": "U"
                                        }
                                        /*    ],
                                            "to_Itemnote": [

                                            ]
                                        }
                                    ]
                                };*/

                                        var existingOrder = false;
                                        for (var pD = 0; pD < postData.length; pD++) {
                                            if (postData[pD].PurchaseOrder === prcDeleitm.PurchaseOrder) {
                                                existingOrder = true;
                                                postData[pD]["to_PoItem"].push({
                                                    "PurchaseOrder": prcDeleitm.PurchaseOrder,
                                                    "PurchaseOrderItem": prcDeleitm.PurchaseOrderItem,
                                                    "to_prcdele": [poDataItem],
                                                    "to_Itemnote": [

                                                    ]
                                                })
                                                break;
                                            }
                                        }
                                        if (!existingOrder) {
                                            postData.push({
                                                "PurchaseOrder": prcDeleitm.PurchaseOrder,

                                                "to_PoItem": [
                                                    {
                                                        "PurchaseOrder": prcDeleitm.PurchaseOrder,
                                                        "PurchaseOrderItem": prcDeleitm.PurchaseOrderItem,
                                                        "to_prcdele": [poDataItem],
                                                        "to_Itemnote": [

                                                        ]
                                                    }
                                                ]
                                            });
                                        }

                                        /*const responsePost = await nodeOdata({
                                            method: 'POST',
                                            url: "/sap/opu/odata/sap/ZMMGW_PURCHASE_ORDER_SRV/ZCMM_PURCHASEORDER",
                                            data: postData,
                                            headers: {
                                                "content-type": "application/json",
                                                "Authorization": authorization,
                                                "x-csrf-token": csrfToken,
                                                "Cookie": cookies
                                            }
                                        });
                                        console.log("SUCCESSFULLY POSTED TO ODATA:", responsePost);*/
                                        /*  var uplData = {
  
                                              "context": poDataReq[i],
                                              definitionId: "wfscapproval"
  
                                          }
                                          wfdata = {
                                              definitionId: definitionId,
                                              context: uplData
                                          };
                                          wfRes = await bpmworkflowruntime({
                                              method: 'POST',
                                              url: "/v1/workflow-instances",
                                              data: JSON.stringify(wfdata),
                                              headers: {
                                                  "content-type": "application/json",
                                                  "Authorization": authorization,
                                                  "xsrfHeaderName": "x-csrf-token"
  
                                                  //"X-CSRF-Token": "f3f024853f1422f4-76XU5-D88QCX2mJ5Ppyef98mFS8"
                                              }
  
                                          });
                                          console.log(wfRes);
                                          taskInstances.push(wfRes.data);*/
                                    }
                                }

                            } else {
                                poDataReq[i].tempOutcome = "Do Not Process";
                                poDataReq[i].tempOutcome = "Condition Type is not allowed to mass update";
                            }

                            j = poData.length;
                            break;
                        } else if (k == poLineItems.length - 1) {
                            poDataReq[i].tempOutcome = 'PO Line item or Material not valid';
                        }
                    }
                    break;
                } else if (j == poData.length - 1 && poDataReq[i].tempOutcome === undefined) {
                    poDataReq[i].tempOutcome = 'PO is not valid';
                }
            }

        }
        //sai  - trigger wf3day

        var definitionId3 = "surchargeresults"; //Change to your workflow definition ID
        var taskData = {
            "taskInstances": { "taskInstance": taskInstances },
            definitionId: "surchargeresults"
        }
        var wf3data = {
            definitionId: definitionId3,
            context: taskData
        };
        wfRes3 = await bpmworkflowruntime({
            method: 'POST',
            url: "/v1/workflow-instances",
            data: JSON.stringify(wf3data),
            headers: {
                "content-type": "application/json",
                "Authorization": authorization,
                "xsrfHeaderName": "x-csrf-token"
            }

        });
        console.log(wfRes3)
        for (i = 0; i < poDataReq.length; i++) {
            poDataReq[i]["% of FOB"] = poDataReq[i].tempFOB;
            delete poDataReq[i].tempFOB;
            poDataReq[i].Outcome = poDataReq[i].tempOutcome;
            delete poDataReq[i].tempOutcome;
        }
        var xls = json2xls(poDataReq);

        fs.writeFileSync('./surcharges.xlsx', xls, 'binary');
        /*   const csvWriter = createCsvWriter({
                path: './file.csv',
                header: [
                    { id: 'PO #', title: 'PO #' },
                    { id: 'PO line', title: 'PO line' },
                    { id: 'Material', title: 'Material' },
                    { id: 'Category', title: 'Category' },
                    { id: 'Plant', title: 'Plant' },
                    { id: 'Gross FOB', title: 'Gross FOB' },
                    { id: 'Condition Type', title: 'Condition Type' },
                    { id: 'Surcharge/unit', title: 'Surcharge/unit' },
                    { id: 'Currency', title: 'Currency' },
                    { id: 'Purchase Group', title: 'Purchase Group' },
                    { id: 'Purchase Org', title: 'Purchase Org' },
                    { id: 'Vendor', title: 'Vendor' },
                    { id: '% of FOB', title: '% of FOB' },
                    { id: 'tempOutcome', title: 'tempOutcome' }
                ]
            });
            const records = [
                { name: 'Bob', lang: 'French, English' },
                { name: 'Mary', lang: 'English' }
            ];
    
            csvWriter.writeRecords(poDataReq)       // returns a promise
                .then(() => {*/

        console.log('The CSV file was written successfully');

        var payload = {

            FROM_FIELD: "Lst-surcharge.updates@nike.com",
            TO_FIELD: req.user.id,
            CC_FIELD: "saisankararao.battula@nike.com",
            BCC_FIELD: "Pratyusha.Panireddy@nike.com",
            SUBJECT_FIELD: "Surcharges Auto Approved Result",
            //"Surcharges Test Mail " + new Date(),
            MESSAGE_BODY: "Please find the atatched Result file with Auto approved items."
        };

        var emailData = new FormData();
        emailData.append("text", JSON.stringify([payload]));

        emailData.append('surcharges', fs.createReadStream('./surcharges.xlsx'));
        (async () => {

            const formHeaders = emailData.getHeaders();

            const response = await mailService({
                method: 'POST',
                url: "/RESTAdapter/SendEmailService",
                data: emailData,

                headers: {

                    "Authorization": authorization,
                    "Content-Type": formHeaders["content-type"]
                },

            });
            // res.send(response);
        })();
        // });
        //  res.send(poDataReq); //uncomment this line for validations
        console.log("CONTINUTE-----")
        for (var pD = 0; pD < postData.length; pD++) {
            const responsePost = await nodeOdata({
                method: 'POST',
                url: "/sap/opu/odata/sap/ZMMGW_PURCHASE_ORDER_SRV/ZCMM_PURCHASEORDER",
                data: postData[pD],
                headers: {
                    "content-type": "application/json",
                    "Authorization": authorization,
                    "x-csrf-token": csrfToken,
                    "Cookie": cookies
                }
            });
            console.log("SUCCESSFULLY POSTED TO ODATA:", responsePost);
        }
    } catch (error) {

        console.log('Request failed ...');
        console.log(error);
        res.reject(error);
    }
}
const start3DayWF = async (req, res) => {
    // do the dummy request
    var logger = req.loggingContext.getLogger('/Application/Destination');
    const authorization = req.headers.authorization;
    console.log("*****AUTHORIZATION HEADERSS*****");
    console.log(authorization)
    try {
        var definitionId = "surchargeresults"; //Change to your workflow definition ID
        var taskData = {
            "taskInstances": { "taskInstance": "77dd182d-a388-11eb-b2c4-eeee0a9e3016" },
            definitionId: "surchargeresults"
        }
        var data = {
            definitionId: definitionId,
            context: taskData
        };
        console.log('Starting the request to bpmworkflowruntime destination ...');
        const response = await bpmworkflowruntime({
            method: 'POST',
            url: "/v1/workflow-instances",
            data: JSON.stringify(data),
            headers: {
                "content-type": "application/json",
                "Authorization": authorization,
                "xsrfHeaderName": "x-csrf-token"

                //"X-CSRF-Token": "f3f024853f1422f4-76XU5-D88QCX2mJ5Ppyef98mFS8"
            },
        });
        res.send(response.data);
    } catch (error) {

        console.log('Request failed ...');
        console.log(error);
        res.reject(error);
    }
}

const getWFContext = async (req, res) => {
    // do the dummy request
    var logger = req.loggingContext.getLogger('/Application/Destination');
    const authorization = req.headers.authorization;
    console.log("*****AUTHORIZATION HEADERSS*****");
    console.log(authorization)
    try {

        var wfInstanceId = "77dd182d-a388-11eb-b2c4-eeee0a9e3016"; //Change to your workflow definition ID
        console.log('Starting the request to bpmworkflowruntime destination ...');
        const response = await bpmworkflowruntime({
            method: 'GET',
            url: "/v1/workflow-instances/" + wfInstanceId + "/context",
            headers: {
                "content-type": "application/json",
                "Authorization": authorization,
                "xsrfHeaderName": "x-csrf-token"
            },
        });
        res.send(response.data);
    } catch (error) {
        console.log('Request failed ...');
        console.log(error);
        res.reject(error);
    }
}

const wf3Daydata = async (req, res) => {
    console.log(req);
    console.log(req.body)
    const wfInstances = req.body.taskInstance;
    const authorization = req.headers.authorization;
    var wfStatus = "";
    var wfID = "";
    //  res.send(wfInstances);
    // console.log(req);
    // console.log(req.body)
    //const wfInstances = req.body;
    //  const authorization = req.headers.authorization;
    var resData = [];
    for (var i = 0; i < wfInstances.length; i++) {
        //for (var i = 0; i < 1; i++) {
        var resContext = {};
        var resStatus = {};
        var resFinal = {};
        var resExcelData = {};
        try {

            // var wfInstanceId = "77dd182d-a388-11eb-b2c4-eeee0a9e3016"; //Change to your workflow definition ID
            console.log('Starting the request to wf3day get wf api ...');
            const response = await bpmworkflowruntime({
                method: 'GET',
                // url: "/v1/workflow-instances/" + wfInstanceId + "/context",
                url: "/v1/workflow-instances/" + wfInstances[i].id + "/context",
                headers: {
                    "content-type": "application/json",
                    "Authorization": authorization,
                    "xsrfHeaderName": "x-csrf-token"
                },
            });
            // res.send(response.data);
            resContext = response.data.context;
            //  resData.push(response.data.context);
            console.log("wf context from 3day");

        } catch (error) {
            console.log('Request failed ...');
            console.log(error);
            res.reject(error);
        }
        console.log(resData);

        ///v1/workflow-instances/{workflowInstanceId}

        try {

            // var wfInstanceId = "77dd182d-a388-11eb-b2c4-eeee0a9e3016"; //Change to your workflow definition ID
            console.log('Starting the request to wf3day get wf api ...');
            const responseStat = await bpmworkflowruntime({
                method: 'GET',
                // url: "/v1/workflow-instances/" + wfInstanceId + "/context",
                url: "/v1/workflow-instances/" + wfInstances[i].id,
                headers: {
                    "content-type": "application/json",
                    "Authorization": authorization,
                    "xsrfHeaderName": "x-csrf-token"
                },
            });
            // res.send(response.data);
            // resDataArr.WFid = responseStat.data.id;
            // resDataArr.Status = responseStat.data.status;
            resStatus = responseStat.data;
            resFinal = { ...resContext, ...resStatus }
            resExcelData = {
                "PO #": resFinal.PurchaseOrder,
                "PO line": resFinal.PurchaseOrderItem,
                "Material": resFinal.Material,
                "Category": resFinal.Category,
                "Plant": resFinal.Plant,
                "Gross FOB": resFinal["Gross FOB"],
                "Condition Type": resFinal.ConditionType,
                "Surcharge/unit": resFinal["Surcharge/unit"],
                "Currency": resFinal.Currency,
                "Purchase Group": resFinal["Purchase Group"],
                // "PurchaseOrderType": resFinal.PurchaseOrderType,
                //  "Promo_Ind": "", not required
                "Purchase Org": resFinal["Purchase Org"],
                "Vendor": resFinal.Vendor,
                "% of FOB": resFinal.tempFOB,
                "Outcome": "Workflow Status",
                "Approver": resFinal.Approver,
                "WF ID": resFinal.id,
                "WF Status": resFinal.status
            }
            resData.push(resExcelData);
            console.log("wf status from 3day");
            console.log(resData);
        } catch (error) {
            console.log('Request failed ...');
            console.log(error);
            res.reject(error);
        }
    }
    // res.send(wfInstances);
    //excel export email
    console.log("excel data for 3 days");
    console.log(resData);
    var xls3 = json2xls(resData);
    fs.writeFileSync('./3DaySurcharges.xlsx', xls3, 'binary');
    var payload3 = {

        FROM_FIELD: "Lst-surcharge.updates@nike.com",
        TO_FIELD: req.user.id,
        CC_FIELD: "saisankararao.battula@nike.com",
        BCC_FIELD: "Pratyusha.Panireddy@nike.com",
        SUBJECT_FIELD: "Surcharges 3 Days Result",
        MESSAGE_BODY: "Please check the 3 day Result file attached to this email."
    };

    var emailData3 = new FormData();
    emailData3.append("text", JSON.stringify([payload3]));
    emailData3.append('3DaySurcharges', fs.createReadStream('./3DaySurcharges.xlsx'));
    (async () => {

        const formHeaders = emailData3.getHeaders();

        const response = await mailService({
            method: 'POST',
            url: "/RESTAdapter/SendEmailService",
            data: emailData3,

            headers: {

                "Authorization": authorization,
                "Content-Type": formHeaders["content-type"]
            },

        });
        // res.send(response);
    })();

}

app.get('/sendmail', sendEmail);
app.get('/workflow', handleRequest);
app.get('/businessRules', getBusinessRules);
app.get('/surcharges', getSurcharges);
app.get('/3DayWF', start3DayWF);
app.get('/wfContext', getWFContext);
app.post('/wf3Daydata', wf3Daydata);
app.post('/validatePOData', validatePoData);

app.get('/loadFioriAppData', async function (req, res) {
    var logger = req.loggingContext.getLogger('/Application/FioriAppLibrary');
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
                        const response3 = await dEzFiori({
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
                const response2 = await dEzFiori({
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

app.get('/demo', function (req, res) {
    var logger = req.loggingContext.getLogger('/Application/Network');
    var tracer = req.loggingContext.getTracer(__filename);

    logger.info('Retrieving demo greeting ...');
    tracer.info('Processing GET request to /demo');

    res.send('Hello World');
});

app.post('/postJSON', (req, res) => {
    const oData = req.body;
    oData.returnMessage = "I've done something";
    res.send(JSON.stringify(oData));
})

const port = process.env.PORT || 3000;;
app.listen(port, function () {
    console.log('myapp listening on port ' + port);
});