// basic auth
"use strict";

const SecretsManager = require("aws-sdk/clients/secretsmanager");
const secretsmanager = new SecretsManager();
const fs = require("fs");

const log = (o) => console.log(JSON.stringify(o, null, 2));

const UsersSecret = `arn:aws:secretsmanager:us-east-1:529276214230:secret:UsersSecret-CTvtLRJcyv5c-HKzBxa`;
let userAuthStrings = null;

const loadUserAuthStrings = async () => {
  const resp = await secretsmanager
    .getSecretValue({
      SecretId: `${UsersSecret}`,
    })
    .promise();
  const users = JSON.parse(resp.SecretString).users;
  userAuthStrings = users.map(
    (user) =>
      "Basic " +
      new Buffer(user.username + ":" + user.password).toString("base64")
  );
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
