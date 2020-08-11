# aws-cloudfront-private-content-playground

## Description

Explore options for serving private content via [CloudFront](https://aws.amazon.com/cloudfront/)

This infrastructure provisioning and deployment pipeline performs an atomic deploy of private static content from a github repo to a static site (Route 53 + ACM + WAF + Cognito + CloudFront + S3) when a tag (release) is applied to the repo.

**Demo Private Static Site**

* <https://staging.allthecloudbits.com/> - pre-production protected by basic auth.  login with Username: user01, Password: password01
* <https://allthecloudbits.com/> - production

---

## Infrastructure Provisioning Steps

1. manually create a [public route 53 hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html) for your domain name (e.g. `mydomain.com`)
1. update `DOMAIN_NAME` parameter in [`scripts/stack.sh`](scripts/stack.sh) with the hosted zone name 
1. provision aws resources `./scripts/stack.sh create`
1. Check [ACM in AWS Console](https://console.aws.amazon.com/acm/home) to confirm Certificate validation via DNS validation has completed.  May need to add [DNS validation records to route 53 hosted zone](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-validate-dns.html).
1. update pipeline variables
    * REGION - *default is us-east-1*
    * STACK_NAME - defined in [`scripts/stack.sh`](scripts/stack.sh)
    * AWS_ACCESS_KEY_ID - `AccessKey` output in `./tmp/${STACK_NAME}-outputs.json`
    * AWS_SECRET_ACCESS_KEY - `SecretKey` output in `./tmp/${STACK_NAME}-outputs.json`

## Website Content Publishing Steps

1. ensure you have `develop` branch checked out *(this corresponds to staging environment)*
1. update website content in [`public`](public) directory and push to github.
1. *(optional)* update redirect rules in [`routing-rules/routing-rules.txt`](routing-rules/routing-rules.txt)
1. push your commit(s) to remote (github)
1. publish will run.  can take up to 20 minutes to complete due CloudFront distribution update.
1. verify updated content by visiting <https://staging.mydomain.com>
1. to publish staging to production, checkout master branch and merge in develop
1. push your commit(s) to remote (github)
1. verify updated content by visiting <https://mydomain.com> and <https://www.mydomain.com>

## Deprovisioning

1. deprovision aws resources `./scripts/stack.sh delete`
1. *(optional)* manually delete S3 website and CloudFront logs buckets.
    > these are not deleted because they still contain objects
1. *(optional)* run `./scripts/stack.sh delete` **again** to permanently delete stack

---

## TODO

* configure CloudFront Error pages to redirect to cognito login URL
* move `LambdaEdgeLoginFunction` out of template to individual directory and use SAM to deploy
* cognito federated sso to auth0 saml2. see [Set up Auth0 as a SAML Identity Provider with an Amazon Cognito User Pool](https://aws.amazon.com/premiumsupport/knowledge-center/auth0-saml-cognito-user-pool/)
* add "logout" link that removes cloudfront signed cookies.  must do from server-side as client-side javascript can't access the cookies.  see [Correct way to delete cookies server-side](https://stackoverflow.com/questions/5285940/correct-way-to-delete-cookies-server-side#answer-53573622)
* define as [AWS Service Catalog](https://aws.amazon.com/servicecatalog/) product using CloudFormation.  See [AWS CloudFormation support for AWS Service Catalog products | AWS Management & Governance Blog](https://aws.amazon.com/blogs/mt/how-to-launch-secure-and-governed-aws-resources-with-aws-cloudformation-and-aws-service-catalog/)

## Resources

**Articles**

* [Node.js — Serve Private Content using AWS CloudFront](https://gosink.in/node-js-serve-private-content-using-aws-cloudfront/)
* [Serving Private Content Using Amazon CloudFront & AWS Lambda@Edge](https://aws.amazon.com/blogs/networking-and-content-delivery/serving-private-content-using-amazon-cloudfront-aws-lambdaedge/)
* [Authorization@Edge using cookies: Protect your Amazon CloudFront content from being downloaded by unauthenticated users](https://aws.amazon.com/blogs/networking-and-content-delivery/authorizationedge-using-cookies-protect-your-amazon-cloudfront-content-from-being-downloaded-by-unauthenticated-users/)
* [Authorization@Edge – How to Use Lambda@Edge and JSON Web Tokens to Enhance Web Application Security](https://aws.amazon.com/blogs/networking-and-content-delivery/authorizationedge-how-to-use-lambdaedge-and-json-web-tokens-to-enhance-web-application-security/)
* [Private static websites on S3 cheat sheet](https://stuartsandine.com/private-static-websites-on-s3/)
* [Can I host a static website on a private Amazon S3 bucket and then serve the website using CloudFront?](https://aws.amazon.com/premiumsupport/knowledge-center/s3-cloudfront-website-access/)
* [r/AWS | Access S3 static website from Intranet](https://www.reddit.com/r/aws/comments/bt6dlv/access_s3_static_website_from_intranet/)
* [How to use AWS.CloudFront.Signer in Lambda function](https://stackoverflow.com/questions/38305980/how-to-use-aws-cloudfront-signer-in-lambda-function)
* [How to Monitor Amazon CloudFront with CloudWatch](https://www.bluematador.com/blog/how-to-monitor-amazon-cloudfront-with-cloudwatch)


**Documentation**

* [AWS | Documentation | CloudFront | Overview of Serving Private Content](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-overview.html)
* [CloudFront | Using Signed Cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-cookies.html)
* [Specifying the AWS Accounts That Can Create Signed URLs and Signed Cookies (Trusted Signers) - Amazon CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-trusted-signers.html)
* [Class: AWS.CloudFront.Signer | AWS SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFront/Signer.html) - support for generating signed URLs and Cookies in node/js/ts

**Code**

* [aws-samples/cloudfront-authorization-at-edge](https://github.com/aws-samples/cloudfront-authorization-at-edge)
* [CloudFront Signed Cookies Keeping Session State for API Gateway Access](https://stackoverflow.com/questions/45250493/cloudfront-signed-cookies-keeping-session-state-for-api-gateway-access)
* [h-arora/aws-cloudfront-cookie-signer](https://github.com/h-arora/aws-cloudfront-cookie-signer)
* [pfeilbr/azure-pipelines-playground](https://github.com/pfeilbr/azure-pipelines-playground) - specifically CloudFormation template @ [azure-pipelines-playground/cfn-templates/resources.yaml](https://github.com/pfeilbr/azure-pipelines-playground/blob/master/cfn-templates/resources.yaml)
* [pfeilbr/aws-cognito-playground](https://github.com/pfeilbr/aws-cognito-playground)
* [pfeilbr/cognito-federated-to-salesforce-and-s3-presigned-url-playground](https://github.com/pfeilbr/cognito-federated-to-salesforce-and-s3-presigned-url-playground)


---

## Scratch

```sh

export REGION="us-east-1"
export STACK_NAME="dev-private-website"
export BUILD_SOURCEBRANCHNAME="master"
#export BUILD_SOURCEBRANCHNAME="develop"
export BUILD_SOURCEVERSION=$(LC_CTYPE=C tr -dc A-Za-z0-9 < /dev/urandom | fold -w ${1:-32} | head -n 1)
./scripts/publish.sh
```

```js
const responseRedirect = (location) => ({
    status: "302",
    statusDescription: "Found",
    headers: {
        location: [{
            key: "Location",
            value: location,
        }],
    },
})
```
