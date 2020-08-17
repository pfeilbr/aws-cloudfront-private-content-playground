const fs = require("fs");
const glob = require("glob");
const pkg = require("./package.json");
const { assert } = require("console");
const index = require("./index");

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

// const invokeLambdaLocal = async (name, payload) => {
//   `sam local invoke -e src/lambda/login/event.json "LambdaEdgeLoginFunction"`;
// };

// const invokeLambdaRemote = async (name, payload) => {
//   const params = {
//     FunctionName: name,
//     Payload: payload,
//   };

//   const resp = await lambda.invoke(params).promise();
//   return resp;
// };

const testEventWithHandler = async (eventName, handler, testsFn) => {
  const eventFile = `${eventName}.json`;
  return test(eventFile, async () => {
    const event = JSON.parse(fs.readFileSync(eventFile));
    const response = await handler(event);
    return await testsFn(response);
  });
};

const validDecodeVerifyJwtMock = {
  StatusCode: 200,
  ExecutedVersion: "$LATEST",
  Payload:
    '{"userName":"auth0_auth0|5f329b4f73edc1003d5f5d73","clientId":"3al3r1fatr213ndvp2uoqcfgi9","isValid":true}',
};

const invalidDecodeVerifyJwtMock = {
  StatusCode: 200,
  ExecutedVersion: "$LATEST",
  Payload:
    '{userName: "", clientId: "", error: { name: "TokenExpiredError", message: "jwt expired", expiredAt: "2020-08-12T18:16:39.000Z", }, isValid: false, }',
};

const validAccessTokenMock = () => ({
  userName: "auth0_auth0|5f329b4f73edc1003d5f5d73",
  clientId: "3al3r1fatr213ndvp2uoqcfgi9",
  isValid: true,
});

const invalidAccessTokenMock = () => ({
  userName: "",
  clientId: "",
  error: {
    name: "TokenExpiredError",
    message: "jwt expired",
    expiredAt: "2020-08-12T18:16:39.000Z",
  },
  isValid: false,
});

const handlerValidAccessToken = index.wrap({
  validateAccessTokenFn: validAccessTokenMock,
});

const handlerInvalidAccessToken = index.wrap({
  validateAccessTokenFn: invalidAccessTokenMock,
});

const cases = [
  {
    name: "event",
    handlerFn: () => handlerValidAccessToken,
    testFn: (result) => {
      expect(result.status || result.body).toBeTruthy();
      expect(result.status).toBe("200");
    },
  },
  {
    name: "event-login-auth",
    handlerFn: () => handlerValidAccessToken,
    testFn: (result) => {
      expect(result.status || result.body).toBeTruthy();
      expect(result.status).toBe("200");
    },
  },
  {
    name: "event-redirect",
    testFn: (result) => {
      expect(result.status || result.body).toBeTruthy();
    },
  },
];

beforeAll(async () => {
  // run each test case and get result
  // need to do here due to test.each async limitation
  await asyncForEach(cases, async (c) => {
    const eventFile = `${c.name}.json`;
    const event = JSON.parse(fs.readFileSync(eventFile));
    const result = c.handlerFn
      ? await c.handlerFn()(event)
      : await index.handler(event);
    c.result = result;
  });
});

describe("it handles events", () => {
  test.each(cases)("%j", (c) => {
    c.testFn(c.result);
  });
});
