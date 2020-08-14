const fs = require("fs");
const glob = require("glob");
const pkg = require("./package.json");
const AWS = require("aws-sdk");
const { assert } = require("console");

const handler = require("./index").handler;

const lambda = new AWS.Lambda();

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

const invokeLambdaLocal = async (name, payload) => {
  const params = {
    FunctionName: name,
    Payload: payload,
  };

  `sam local invoke -e src/lambda/login/event.json "LambdaEdgeLoginFunction"`;

  const resp = await lambda.invoke(params).promise();
  return resp;
};

const invokeLambdaRemote = async (name, payload) => {
  const params = {
    FunctionName: name,
    Payload: payload,
  };

  const resp = await lambda.invoke(params).promise();
  return resp;
};

const testEventsWithHandler = async (handler) => {
  return await asyncForEach(glob.sync("event*"), async (eventFile) => {
    const event = JSON.parse(fs.readFileSync(eventFile));
    const result = await handler(event);
    expect(result.status || result.body).toBeTruthy();
  });
};

test("unit", async () => {
  await testEventsWithHandler(handler);
});

// test("remote", async () => {
//   await asyncForEach(glob.sync("event*"), async (eventFile) => {
//     const payload = fs.readFileSync(eventFile);
//     const resp = await invokeLambdaRemote(pkg.config.functionName, payload);
//     //console.log(resp);
//     expect(resp.Payload).toBeDefined();
//     const result = JSON.parse(resp.Payload);
//     expect(result.status || result.body).toBeTruthy();
//   });
// });
