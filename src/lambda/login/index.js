// login handler
"use strict";

const SSM = require("aws-sdk/clients/ssm");
const ssm = new SSM();

const SecretsManager = require("aws-sdk/clients/secretsmanager");
const secretsmanager = new SecretsManager();

const Lambda = require("aws-sdk/clients/lambda");
const lambda = new Lambda();

const CloudFront = require("aws-sdk/clients/cloudfront");
const fs = require("fs");
const querystring = require("querystring");
const jwtDecode = require("jwt-decode");
const log = (o) => console.log(JSON.stringify(o, null, 2));

// cache expensive operation of loading config from SSM paramater store and secrets manager
let Config = null;

const SSMParameterStorePrefixPath = "/dev-private-website/";
const SSMParameterStoreParameters = [
  "DomainName",
  "UserPoolClientId",
  "DecodeVerifyJwtFunctionName",
  "CloudFrontKeyPairId",
  "CloudFrontKeyPairPublicKey",
  "CloudFrontKeyPairPrivateKeySecretsPath",
];

const cloudFrontSignedCookieHeaderKeys = [
  "CloudFront-Key-Pair-Id",
  "CloudFront-Policy",
  "CloudFront-Signature",
];

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

const parameterPathByName = (name) => `${SSMParameterStorePrefixPath}${name}`;

const getConfigurationParameters = async () => {
  const params = {
    Names: SSMParameterStoreParameters.map((name) => parameterPathByName(name)),
  };
  log({ params });
  const resp = await ssm.getParameters(params).promise();
  log({ resp });

  const config = {};
  resp.Parameters.forEach(
    (p, idx) =>
      (config[p.Name.replace(SSMParameterStorePrefixPath, "")] = p.Value)
  );

  log({ config });

  return config;
};

const getCloudFrontKeyPairPrivateKeyFromSecretsManager = async () => {
  const resp = await secretsmanager
    .getSecretValue({ SecretId: Config.CloudFrontKeyPairPrivateKeySecretsPath })
    .promise();
  log({ resp });
  return resp.SecretString;
};

const getSignedCookies = async () => {
  log({ Config });
  const cloudFront = new CloudFront.Signer(
    Config.CloudFrontKeyPairId,
    Config.CloudFrontKeyPairPrivateKey
  );

  const policy = JSON.stringify({
    Statement: [
      {
        Resource: `http*://${Config.DomainName}/*`,
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

const getExpireSignedCookiesHeaders = async () => {
  const headers = {};
  headers["set-cookie"] = [];

  cloudFrontSignedCookieHeaderKeys.forEach((key) => {
    const value = "deleted";
    headers["set-cookie"].push({
      key: "Set-Cookie",
      value:
        key +
        `=` +
        value +
        `; domain=${Config.DomainName}; path=/; httpOnly=true; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    });
  });
  return headers;
};

const getLogoutResponse = async () => {
  const headers = await getExpireSignedCookiesHeaders();

  const body = `
  <!DOCTYPE html>
  <html lang="en">
  
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="refresh"
          content="0; URL=https://allthecloudbits.auth.us-east-1.amazoncognito.com/logout?response_type=token&client_id=${Config.UserPoolClientId}&redirect_uri=https://allthecloudbits.com/login/logout.html" />
      <title>logout redirect</title>
  </head>
  
  <body>
  </body>
  
  </html>  
  `;

  const response = {
    status: "200",
    statusDescription: "OK",
    headers,
    body,
  };
  return response;
};

const getSignedCookies302RedirectResponse = async (location) => {
  // cache because expensive (time) operation
  if (!Config.CloudFrontKeyPairPrivateKey) {
    Config.CloudFrontKeyPairPrivateKey = await getCloudFrontKeyPairPrivateKeyFromSecretsManager();
  }

  const signedCookies = await getSignedCookies();
  log({ signedCookies });

  const respHeaders = {};
  respHeaders["set-cookie"] = [];

  cloudFrontSignedCookieHeaderKeys.forEach((key) => {
    const value = signedCookies[key];
    respHeaders["set-cookie"].push({
      key: "Set-Cookie",
      value:
        key +
        `=` +
        value +
        `; domain=${Config.DomainName}; path=/; httpOnly=true`,
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
};

const getValidateAccessTokenResult = async (token) => {
  const lambdaParams = {
    FunctionName: Config.DecodeVerifyJwtFunctionName,
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
};

exports.handler = async (event, context, callback) => {
  log({ event });

  const request = event.Records[0].cf.request;
  const headers = request.headers;

  if (!Config) {
    Config = await getConfigurationParameters();
    log({ Config });
  }

  if (request.uri === "/login/auth" || request.uri === "/login/auth/") {
    const params = querystring.parse(request.querystring);
    log({ params });

    const accessToken = params["access_token"];
    const decodeVerifyJwtResponse = await getValidateAccessTokenResult(
      accessToken
    );
    log({ decodeVerifyJwtResponse });

    // e.g. VALID decodeVerifyJwtResponse
    // {
    //   "userName": "",
    //   "clientId": "",
    //   "error": {
    //     "name": "TokenExpiredError",
    //     "message": "jwt expired",
    //     "expiredAt": "2020-08-12T18:16:39.000Z"
    //   },
    //   "isValid": false
    // }

    // e.g. INVALID decodeVerifyJwtResponse
    // {
    //   "userName": "",
    //   "clientId": "",
    //   "error": {
    //     "name": "TokenExpiredError",
    //     "message": "jwt expired",
    //     "expiredAt": "2020-08-12T18:16:39.000Z"
    //   },
    //   "isValid": false
    // }

    const idToken = params["id_token"];
    const idTokenDecodeResult = jwtDecode(idToken);
    log({ idTokenDecodeResult });

    // e.g. idTokenDecodeResult
    //   {
    //     "at_hash": "3WU5XivsKWQ18XvCNt3gig",
    //     "sub": "13ed8986-af76-43af-8e92-5d7c33584531",
    //     "cognito:groups": [
    //       "us-east-1_QUSNXWsxL_auth0"
    //     ],
    //     "email_verified": false,
    //     "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_QUSNXWsxL",
    //     "cognito:username": "auth0_auth0|5f329b4f73edc1003d5f5d73",
    //     "nonce": "xtpMPSXzapqnsqapybMROVROHImj6wWWtGFMpZT1nMebAI5aL3SSsnPbAIe3_wFUkimeVNbR-JheYn_bqFSJIDYHb0FP55b5r2c7Cy1m1jnpIFXgkXxW4aFQ2yiU9ODkfvYFmzK03m6uKRjRG2DZ3NAOXnZi_qN-bQ1Hh3w1Lmk",
    //     "aud": "3al3r1fatr213ndvp2uoqcfgi9",
    //     "identities": [
    //       {
    //         "userId": "auth0|5f329b4f73edc1003d5f5d73",
    //         "providerName": "auth0",
    //         "providerType": "SAML",
    //         "issuer": "urn:svc.auth0.com",
    //         "primary": "true",
    //         "dateCreated": "1597158755583"
    //       }
    //     ],
    //     "token_use": "id",
    //     "auth_time": 1597252599,
    //     "exp": 1597256199,
    //     "iat": 1597252599,
    //     "email": "user01@example.com"
    //   }
    // }

    let response = forbiddenResponse();
    if (decodeVerifyJwtResponse && decodeVerifyJwtResponse.isValid) {
      response = getSignedCookies302RedirectResponse("/");
    }

    log({ response });
    return response;
  }

  if (request.uri === "/login/logout" || request.uri === "/login/logout/") {
    const response = await getLogoutResponse();
    log({ response });
    return response;
  } else {
    // pass through request to S3
    return request;
  }
};
