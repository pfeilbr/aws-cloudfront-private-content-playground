# These environment variables must be set for deploymeny to work.
S3_BUCKET := $(S3_SAM_DEPLOY_BUCKET)
REGION := "us-east-1"
STACK_NAME := "dev-private-website"
BUILD_SOURCEBRANCHNAME := "master"
# BUILD_SOURCEBRANCHNAME := "develop"
# BUILD_SOURCEVERSION := $(shell date |md5 | head -c8)
BUILD_SOURCEVERSION := "v0.0.1"

TEMPLATE = template.yaml
PACKAGED_TEMPLATE = packaged.yaml

.PHONY: publish
publish:
	$(shell ./scripts/publish.sh)

.PHONY: package
package:
	sam package --template-file $(TEMPLATE) --s3-bucket $(S3_BUCKET) --output-template-file $(PACKAGED_TEMPLATE)

.PHONY: deploy
deploy: package
	sam deploy --stack-name $(STACK_NAME) --template-file $(PACKAGED_TEMPLATE) --capabilities CAPABILITY_IAM

.PHONY: teardown
teardown:
	aws cloudformation delete-stack --stack-name $(STACK_NAME)