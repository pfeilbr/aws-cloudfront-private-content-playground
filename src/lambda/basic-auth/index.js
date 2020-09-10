// basic auth
"use strict";

const SSM = require("aws-sdk/clients/ssm");
const ssm = new SSM();

const SecretsManager = require("aws-sdk/clients/secretsmanager");
const secretsmanager = new SecretsManager();
const fs = require("fs");

const log = (o) => console.log(JSON.stringify(o, null, 2));

// TODO: move to ssm parameter store
const UsersSecretSSMParameterStorePath = "/dev-private-website/UsersSecret";

let userAuthStrings = null;

const getSSMParameter = async (path) => {
  const params = {
    Name: UsersSecretSSMParameterStorePath,
  };
  log({ params });
  const resp = await ssm.getParameter(params).promise();
  log({ resp });
  return resp.Parameter.Value;
};

const loadUserAuthStrings = async () => {
  const secretArn = await getSSMParameter(UsersSecretSSMParameterStorePath);
  const resp = await secretsmanager
    .getSecretValue({
      SecretId: secretArn,
    })
    .promise();
  const users = JSON.parse(resp.SecretString).users;
  log({ users });
  userAuthStrings = users.map(
    (user) =>
      "Basic " +
      Buffer.from(user.username + ":" + user.password, "utf8").toString(
        "base64"
      )
  );
  log({ userAuthStrings });
};

exports.handler = async (event, context, callback) => {
  log({ event });

  if (userAuthStrings === null) {
    await loadUserAuthStrings();
  }

  // Get request and request headers
  const request = event.Records[0].cf.request;
  const headers = request.headers;

  // Require Basic authentication
  if (
    typeof headers.authorization == "undefined" ||
    !userAuthStrings.includes(headers.authorization[0].value)
    //headers.authorization[0].value != authString
  ) {
    const body = "Unauthorized";
    const response = {
      status: "401",
      statusDescription: "Unauthorized",
      body: body,
      headers: {
        "www-authenticate": [{ key: "WWW-Authenticate", value: "Basic" }],
      },
    };
    return response;
  } else {
    // Continue request processing if authentication passed
    return request;
  }
};
