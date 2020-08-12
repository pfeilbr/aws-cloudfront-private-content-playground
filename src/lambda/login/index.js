// login handler
"use strict";

const AWS = require("aws-sdk");
const secretsmanager = new AWS.SecretsManager();
const lambda = new AWS.Lambda();
const fs = require("fs");
const querystring = require("querystring");
const log = (o) => console.log(JSON.stringify(o));

// TODO: pull this from parameter store
const DomainName = "allthecloudbits.com";
const DecodeVerifyJwtFunctionName =
  "dev-private-website-DecodeVerifyJwtFunction-1XBZMCJD1VEW2";

// cache expensive operation of loading users from secrets manager
let cloudFrontKeyPair = null;

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

const loadCloudFrontKeyPairFromSecretsManager = async () => {
  cloudFrontKeyPair = {};
  // const secretIds = [
  //   "${CloudFrontKeyPairIdSecret}",
  //   "${CloudFrontKeyPairPrivateKeySecret}",
  //   "${CloudFrontKeyPairPublicKeySecret}",
  // ];

  // TODO: fetch these from SSM parameter store. create param store entries via cfn template
  const secretIds = [
    "arn:aws:secretsmanager:us-east-1:529276214230:secret:CloudFrontKeyPairIdSecret-lfzwrQaKsy60-CQbj19",
    "arn:aws:secretsmanager:us-east-1:529276214230:secret:CloudFrontKeyPairPrivateKey-ZKKK3iPjSm4m-iwRpkz",
    "arn:aws:secretsmanager:us-east-1:529276214230:secret:CloudFrontKeyPairPublicKeyS-jdx744eRC2gl-ordhR0",
  ];
  const secretIdNames = [
    "cloudFrontKeyPairIdSecret",
    "cloudFrontKeyPairPrivateKeySecret",
    "cloudFrontKeyPairPublicKeySecret",
  ];

  await asyncForEach(secretIds, async (SecretId, idx) => {
    const resp = await secretsmanager.getSecretValue({ SecretId }).promise();
    log({ resp });
    cloudFrontKeyPair[secretIdNames[idx]] = resp.SecretString;
  });
  log({ cloudFrontKeyPair });
};

const getSignedCookies = async () => {
  const cloudFront = new AWS.CloudFront.Signer(
    cloudFrontKeyPair.cloudFrontKeyPairIdSecret,
    cloudFrontKeyPair.cloudFrontKeyPairPrivateKeySecret
  );

  const policy = JSON.stringify({
    Statement: [
      {
        Resource: `http*://${DomainName}/*`,
        Condition: {
          DateLessThan: {
            "AWS:EpochTime":
              Math.floor(new Date().getTime() / 1000) + 60 * 60 * 1, // Current Time in UTC + time in seconds, (60 * 60 * 1 = 1 hour)
          },
        },
      },
    ],
  });

  return new Promise((resolve, reject) => {
    cloudFront.getSignedCookie(
      {
        policy,
      },
      (err, resp) => {
        if (err) {
          console.error(`cloudFront.getSignedCookie failed`);
          console.error(err);
          return reject(err);
        }
        log({ resp });
        return resolve(resp);
      }
    );
  });
};

const forbiddenResponse = () => ({
  status: "403",
  statusDescription: "Forbidden",
  body: "Forbidden",
  headers: {},
});

const getSignedCookies302RedirectResponse = (location) => {
  // cache because expensive (time) operation
  if (cloudFrontKeyPair === null) {
    await loadCloudFrontKeyPairFromSecretsManager();
  }

  const signedCookies = await getSignedCookies();
  log({ signedCookies });

  const respHeaders = {};
  respHeaders["set-cookie"] = [];
  const cloudFrontSignedCookieHeaderKeys = [
    "CloudFront-Key-Pair-Id",
    "CloudFront-Policy",
    "CloudFront-Signature",
  ];
  cloudFrontSignedCookieHeaderKeys.forEach((key) => {
    const value = signedCookies[key];
    respHeaders["set-cookie"].push({
      key: "Set-Cookie",
      value:
        key + `=` + value + `; domain=${DomainName}; path=/; httpOnly=true`,
    });
  });

  const response = {
    status: "302",
    statusDescription: "Found",
    headers: respHeaders,
  };

  response.headers.location = [
    {
      key: "Location",
      value: location,
    },
  ];

  return response;
}

const getValidateAccessTokenResult = async (token) => {
  const lambdaParams = {
    FunctionName: DecodeVerifyJwtFunctionName,
    Payload: JSON.stringify({ token }),
  };

  const lambdaInvokeResp = await lambda.invoke(lambdaParams).promise();
  log({ lambdaInvokeResp });

  // e.g. lambdaInvokeResp
  // {
  //   "StatusCode": 200,
  //   "ExecutedVersion": "$LATEST",
  //   "Payload": "{\"userName\":\"auth0_auth0|5f329b4f73edc1003d5f5d73\",\"clientId\":\"3al3r1fatr213ndvp2uoqcfgi9\",\"isValid\":true}"
  // }  


  // e.g. lambdaInvokeResp.Payload
  // {
  //   "userName": "auth0_auth0|5f329b4f73edc1003d5f5d73",
  //   "clientId": "3al3r1fatr213ndvp2uoqcfgi9",
  //   "isValid": true
  // }  
  if (lambdaInvokeResp && lambdaInvokeResp.Payload) {
    const decodeVerifyJwtResponse = JSON.parse(lambdaInvokeResp.Payload);
    return decodeVerifyJwtResponse;
  }
  return null;
}

exports.handler = async (event, context, callback) => {
  log({ event });

  const request = event.Records[0].cf.request;
  const headers = request.headers;

  if (request.uri === "/login/auth" || request.uri === "/login/auth/") {
    const params = querystring.parse(request.querystring);
    log({ params });

    const token = params["access_token"];
    const decodeVerifyJwtResponse = await getValidateAccessTokenResult(token)
    log({ decodeVerifyJwtResponse })
    let response = forbiddenResponse();
    if (decodeVerifyJwtResponse && decodeVerifyJwtResponse.isValid) {
      response = getSignedCookies302RedirectResponse("/")
    }

    log({ response });
    return response;
  } else { // pass through request to S3
    return request;
  }
};
