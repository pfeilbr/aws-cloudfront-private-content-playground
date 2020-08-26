import React, { useState, useEffect } from "react";
import logo from "./logo.svg";
import "./App.css";

const mockGetApiResponse = async () => {
  return {
    resource: "/{proxy+}",
    path: "/api/",
    httpMethod: "GET",
    headers: {
      "Accept-Encoding": "gzip",
      "CloudFront-Forwarded-Proto": "https",
      "CloudFront-Is-Desktop-Viewer": "true",
      "CloudFront-Is-Mobile-Viewer": "false",
      "CloudFront-Is-SmartTV-Viewer": "false",
      "CloudFront-Is-Tablet-Viewer": "false",
      "CloudFront-Viewer-Country": "US",
      Cookie:
        "CloudFront-Key-Pair-Id=APKAJK35MM4IQ2LXQOFA; CloudFront-Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cCo6Ly9hbGx0aGVjbG91ZGJpdHMuY29tLyoiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE1OTgzNjM3NDJ9fX1dfQ__; CloudFront-Signature=tpZlOOmh9TJn4aHnaqfSLn8sRCIfkeCZQrtBxCTTOCAhoeV~yM-ek32y-XgNUkumMZOrNSvRL6IuT6G0Gdwt~B8WvJlVFlccqUahkCQIQRMRzf3NriLDpsNc1EdYCSBBW1FiitnIj0IsGl1UfKm07Wt4pE1RHOp8tGT80nmeNU-ARdA1Yo4zqEQAqJmGoRheWSc83WX-Qf2CVReNfE7N9H-UTTaIiUsJNNYYfalBjgAA2cwOxDRspU7TUjpG6hV51~s-nrCxZGzUd1h0SDNFbIb5cLqh0gXRGsDoUE2mckw5SrX85zkEqzmT4MqI5czoVCLqjy~izxD7Wd~4WrDrTg__",
      Host: "wzuxpzwyq6.execute-api.us-east-1.amazonaws.com",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "User-Agent": "Amazon CloudFront",
      Via:
        "2.0 a5f21c3d06407705927942b02b1d5049.cloudfront.net (CloudFront), 1.1 193d4441ee6d312fd234f2d28e48c110.cloudfront.net (CloudFront)",
      "X-Amz-Cf-Id": "Jh0QCMJfNoNclii1VCxYrATCXG-pA4pG3RkL-dJndvGL3Fz9yOCxVw==",
      "X-Amzn-Trace-Id": "Root=1-5f450d77-415f44ac8177420e5d95406d",
      "X-Forwarded-For": "100.11.117.63, 130.176.17.135, 130.176.17.136",
      "X-Forwarded-Port": "443",
      "X-Forwarded-Proto": "https",
    },
    multiValueHeaders: {
      "Accept-Encoding": ["gzip"],
      "CloudFront-Forwarded-Proto": ["https"],
      "CloudFront-Is-Desktop-Viewer": ["true"],
      "CloudFront-Is-Mobile-Viewer": ["false"],
      "CloudFront-Is-SmartTV-Viewer": ["false"],
      "CloudFront-Is-Tablet-Viewer": ["false"],
      "CloudFront-Viewer-Country": ["US"],
      Cookie: [
        "CloudFront-Key-Pair-Id=APKAJK35MM4IQ2LXQOFA; CloudFront-Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cCo6Ly9hbGx0aGVjbG91ZGJpdHMuY29tLyoiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE1OTgzNjM3NDJ9fX1dfQ__; CloudFront-Signature=tpZlOOmh9TJn4aHnaqfSLn8sRCIfkeCZQrtBxCTTOCAhoeV~yM-ek32y-XgNUkumMZOrNSvRL6IuT6G0Gdwt~B8WvJlVFlccqUahkCQIQRMRzf3NriLDpsNc1EdYCSBBW1FiitnIj0IsGl1UfKm07Wt4pE1RHOp8tGT80nmeNU-ARdA1Yo4zqEQAqJmGoRheWSc83WX-Qf2CVReNfE7N9H-UTTaIiUsJNNYYfalBjgAA2cwOxDRspU7TUjpG6hV51~s-nrCxZGzUd1h0SDNFbIb5cLqh0gXRGsDoUE2mckw5SrX85zkEqzmT4MqI5czoVCLqjy~izxD7Wd~4WrDrTg__",
      ],
      Host: ["wzuxpzwyq6.execute-api.us-east-1.amazonaws.com"],
      "sec-fetch-dest": ["document"],
      "sec-fetch-mode": ["navigate"],
      "sec-fetch-site": ["none"],
      "sec-fetch-user": ["?1"],
      "upgrade-insecure-requests": ["1"],
      "User-Agent": ["Amazon CloudFront"],
      Via: [
        "2.0 a5f21c3d06407705927942b02b1d5049.cloudfront.net (CloudFront), 1.1 193d4441ee6d312fd234f2d28e48c110.cloudfront.net (CloudFront)",
      ],
      "X-Amz-Cf-Id": [
        "Jh0QCMJfNoNclii1VCxYrATCXG-pA4pG3RkL-dJndvGL3Fz9yOCxVw==",
      ],
      "X-Amzn-Trace-Id": ["Root=1-5f450d77-415f44ac8177420e5d95406d"],
      "X-Forwarded-For": ["100.11.117.63, 130.176.17.135, 130.176.17.136"],
      "X-Forwarded-Port": ["443"],
      "X-Forwarded-Proto": ["https"],
    },
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: { proxy: "api" },
    stageVariables: null,
    requestContext: {
      resourceId: "7sk4hd",
      resourcePath: "/{proxy+}",
      httpMethod: "GET",
      extendedRequestId: "R08KtG-XIAMFhhQ=",
      requestTime: "25/Aug/2020:13:09:11 +0000",
      path: "/Prod/api/",
      accountId: "529276214230",
      protocol: "HTTP/1.1",
      stage: "Prod",
      domainPrefix: "wzuxpzwyq6",
      requestTimeEpoch: 1598360951625,
      requestId: "988945d8-5ae8-4fd2-9c1f-4c6ebd411c2b",
      identity: {
        cognitoIdentityPoolId: null,
        accountId: null,
        cognitoIdentityId: null,
        caller: null,
        sourceIp: "130.176.17.135",
        principalOrgId: null,
        accessKey: null,
        cognitoAuthenticationType: null,
        cognitoAuthenticationProvider: null,
        userArn: null,
        userAgent: "Amazon CloudFront",
        user: null,
      },
      domainName: "wzuxpzwyq6.execute-api.us-east-1.amazonaws.com",
      apiId: "wzuxpzwyq6",
    },
    body: null,
    isBase64Encoded: false,
  };
};

const getApiResponse = async () => {
  const auth = JSON.parse(localStorage.getItem("auth"));
  const resp = await fetch("/api/", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.idToken}`,
    },
    credentials: "include",
  });
  const data = await resp.json();
  //const data = await mockGetApiResponse();
  console.log(JSON.stringify(data, null, 2));
  return data;
};

const ApiDemoComponent = () => {
  const [data, setData] = useState(null);

  useEffect(async () => {
    const data = await getApiResponse();
    setData(data);
  }, []);

  return (
    <div>
      <strong>
        authenticated (jwt) <code>/api/</code>
        <br />
        echo response from api gateway + lambda
      </strong>
      <br />
      <br />
      <textarea value={JSON.stringify(data, null, 2)} rows={4} cols={60} />
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img
          src={
            "data:image/png;base64,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"
          }
          className="App-logo"
          alt="logo"
        />
        <p>You are viewing "private" content from CloudFront.</p>
        <ApiDemoComponent />
        <a
          className="App-link"
          href="https://github.com/pfeilbr/aws-cloudfront-private-content-playground"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn More
        </a>

        <p>
          <a href="/login/logout">logout</a>
        </p>
      </header>
    </div>
  );
}

export default App;
