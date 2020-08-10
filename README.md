# aws-cloudfront-private-content-playground

explore options for serving private content via [CloudFront](https://aws.amazon.com/cloudfront/)

## TODO

* cognito federated sso to auth0 saml2. see [Set up Auth0 as a SAML Identity Provider with an Amazon Cognito User Pool](https://aws.amazon.com/premiumsupport/knowledge-center/auth0-saml-cognito-user-pool/)
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

